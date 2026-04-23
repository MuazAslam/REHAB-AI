"""
STEP 1: Vital Signs Recording
Environment: NumPy 1.26.4 + OpenCV + MediaPipe
This script records heart rate and temperature, saves to JSON file
"""

import cv2
import numpy as np
import mediapipe as mp
from scipy.signal import butter, filtfilt
from scipy.fftpack import fft
from collections import deque
import time
import json
from datetime import datetime
import sys
import argparse
import os

# ============================================================================
# VITAL SIGNS MONITORING
# ============================================================================

def bandpass_filter(signal, fs, low=0.7, high=4.0):
    """Filter signal to heart rate frequency range"""
    nyq = 0.5 * fs
    b, a = butter(3, [low / nyq, high / nyq], btype='band')
    return filtfilt(b, a, signal)

class VitalSignsRecorder:
    """Records heart rate and temperature from webcam"""
    
    def __init__(self, duration_seconds=60):
        print("\n" + "=" * 80)
        print("VITAL SIGNS RECORDER")
        print("=" * 80)
        
        self.duration = duration_seconds
        self.fps = 30
        
        # MediaPipe Face Mesh
        print("Loading MediaPipe Face Mesh...")
        self.mp_face = mp.solutions.face_mesh
        self.face_mesh = self.mp_face.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.3,
            min_tracking_confidence=0.3
        )
        
        # Buffers
        self.hr_buffer_size = 150 # Reduced from 300 to allow faster detection
        self.green_signal = []
        self.heart_rates = []
        
        self.temp_buffer_size = 60 # Reduced from 90
        self.red_buffer = deque(maxlen=self.temp_buffer_size)
        self.blue_buffer = deque(maxlen=self.temp_buffer_size)
        self.green_buffer = deque(maxlen=self.temp_buffer_size)
        self.temperatures = []
        
        self.frame_count = 0
        
        print("[OK] Recorder ready!")
    
    def calculate_heart_rate(self):
        """Calculate heart rate from PPG signal"""
        if len(self.green_signal) < self.hr_buffer_size:
            return None
        
        try:
            signal = np.array(self.green_signal[-self.hr_buffer_size:])
            signal = signal - np.mean(signal)
            filtered = bandpass_filter(signal, self.fps)
            
            fft_vals = np.abs(fft(filtered))
            freqs = np.fft.fftfreq(len(fft_vals), d=1 / self.fps)
            
            idx = np.where((freqs > 0.7) & (freqs < 4.0))
            if len(freqs[idx]) > 0:
                peak_freq = freqs[idx][np.argmax(fft_vals[idx])]
                heart_rate = peak_freq * 60
                
                if 40 <= heart_rate <= 200:
                    return heart_rate
        except:
            pass
        
        return None
    
    def estimate_temperature(self):
        """Estimate temperature from facial thermal patterns"""
        if len(self.red_buffer) < 30:
            return None
        
        try:
            red_signal = np.array(self.red_buffer)
            green_signal = np.array(self.green_buffer)
            blue_signal = np.array(self.blue_buffer)
            
            rb_ratio = np.mean(red_signal) / (np.mean(blue_signal) + 1e-6)
            rb_normalized = (rb_ratio - 1.0) * 2.0
            
            red_variance = np.var(red_signal)
            variance_normalized = (red_variance / 100.0) - 1.0
            
            color_temp = (np.mean(red_signal) - np.mean(blue_signal)) / 255.0
            
            signal_amplitude = np.ptp(red_signal)
            amplitude_normalized = (signal_amplitude / 10.0) - 1.0
            
            temp_offset = (
                rb_normalized * 0.3 +
                variance_normalized * 0.2 +
                color_temp * 0.4 +
                amplitude_normalized * 0.1
            )
            
            baseline_temp = 36.5
            temp_range = 2.0
            estimated_temp = baseline_temp + (temp_offset * temp_range)
            estimated_temp = np.clip(estimated_temp, 35.0, 40.0)
            
            return estimated_temp
        except:
            pass
        
        return None
    
    def record(self, source='camera'):
        """Record vital signs from camera or stream"""
        print("\n" + "=" * 80)
        print(f"RECORDING FOR {self.duration} SECONDS")
        print("=" * 80)

        if source == 'camera':
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                print("[ERROR] Could not open camera!")
                return None
        
        start_time = time.time()
        
        while True:
            if source == 'camera':
                ret, frame = cap.read()
                if not ret:
                    break
            else:
                # Streaming mode uses process_frame manually
                break

            elapsed = time.time() - start_time
            
            if elapsed >= self.duration:
                print("\n[OK] Recording complete!")
                break
            
            self.process_frame(frame, elapsed)
            
            # Display (only if local camera)
            if source == 'camera':
                cv2.imshow("Vital Signs Recording", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\n[INFO] Recording stopped early")
                    break
        
        if source == 'camera':
            cap.release()
            cv2.destroyAllWindows()
            
        return self.finalize_recording()

    def process_frame(self, frame, elapsed):
        """Process a single frame (for streaming)"""
        self.frame_count += 1
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(frame_rgb)
        
        face_detected = False
        
        if results.multi_face_landmarks:
            face_detected = True
            h, w, _ = frame.shape
            landmarks = results.multi_face_landmarks[0].landmark
            
            forehead_points = [10, 67, 297, 338]
            x_coords = [int(landmarks[i].x * w) for i in forehead_points]
            y_coords = [int(landmarks[i].y * h) for i in forehead_points]
            
            x1, x2 = max(0, min(x_coords)), min(w, max(x_coords))
            y1, y2 = max(0, min(y_coords)), min(h, max(y_coords))
            
            roi = frame[y1:y2, x1:x2]
            
            if roi.size > 0:
                green_mean = np.mean(roi[:, :, 1])
                red_mean = np.mean(roi[:, :, 2])
                blue_mean = np.mean(roi[:, :, 0])
                
                self.green_signal.append(green_mean)
                self.red_buffer.append(red_mean)
                self.green_buffer.append(green_mean)
                self.blue_buffer.append(blue_mean)
                
                if self.frame_count % 10 == 0:
                    hr = self.calculate_heart_rate()
                    if hr:
                        self.heart_rates.append(hr)
                    
                    temp = self.estimate_temperature()
                    if temp:
                        self.temperatures.append(temp)
                
                # For stream feedback
                return {
                    'heart_rate': self.heart_rates[-1] if self.heart_rates else 0,
                    'temperature': self.temperatures[-1] if self.temperatures else 0,
                    'face_detected': True
                }
        if results.multi_face_landmarks:
            face_detected = True
            # ... (existing code) ...
            
        else:
             # print("[DEBUG] No face landmarks detected", file=sys.stderr)
             pass
        
        return {
            'heart_rate': self.heart_rates[-1] if self.heart_rates else 0,
            'temperature': self.temperatures[-1] if self.temperatures else 0,
            'face_detected': face_detected
        }

    def finalize_recording(self):
        """Calculate final averages"""
        print("\n" + "=" * 80)
        print("CALCULATING AVERAGES")
        print("=" * 80)
        
        avg_hr = None
        avg_temp = None
        success = False
        
        if len(self.heart_rates) >= 3:
            avg_hr = float(np.mean(self.heart_rates))
            print(f"[OK] Heart Rate: {avg_hr:.1f} BPM (from {len(self.heart_rates)} samples)")
            success = True
        else:
            print(f"[WARNING] Insufficient heart rate data")
        
        if len(self.temperatures) >= 3:
            avg_temp = float(np.mean(self.temperatures))
            print(f"[OK] Temperature: {avg_temp:.1f} C (from {len(self.temperatures)} samples)")
        else:
            avg_temp = 37.0
            print(f"[WARNING] Using default temperature: {avg_temp} C")
        
        return {
            'heart_rate': avg_hr,
            'body_temp': avg_temp,
            'success': success,
            'hr_samples': len(self.heart_rates),
            'temp_samples': len(self.temperatures),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

# ============================================================================
# MAIN
# ============================================================================

def calculate_bmi(weight, height):
    """Calculate BMI"""
    height_m = height / 100.0
    bmi = weight / (height_m ** 2)
    return round(bmi, 2)

def main():
    # Argument Parsing
    parser = argparse.ArgumentParser(description="Vital Signs Recorder")
    parser.add_argument("--gender", type=str, default="male", help="Gender (male/female)")
    parser.add_argument("--age", type=float, default=25, help="Age in years")
    parser.add_argument("--height", type=float, default=170, help="Height in cm")
    parser.add_argument("--weight", type=float, default=70, help="Weight in kg")
    parser.add_argument("--duration", type=float, default=1, help="Exercise Duration in minutes")
    parser.add_argument("--stream", action="store_true", help="Enable streaming mode from stdin")
    
    args = parser.parse_args()
    
    gender = args.gender
    age = args.age
    height = args.height
    weight = args.weight
    duration = args.duration
    bmi = calculate_bmi(weight, height)
    
    print("\n" + "=" * 80)
    print("USER PROFILE")
    print("=" * 80)
    print(f"Gender: {gender.capitalize()}")
    print(f"Age: {age} years")
    print(f"Height: {height} cm")
    print(f"Weight: {weight} kg")
    print(f"BMI: {bmi}")
    print(f"Exercise Duration: {duration} minutes")
    
    # Record vital signs
    print("\n" + "=" * 80)
    print("VITAL SIGNS RECORDING")
    print("=" * 80)
    
    recorder = VitalSignsRecorder(duration_seconds=args.duration * 60)
    
    vital_signs = None
    
    if args.stream:
        # Streaming Mode via Stdin
        print("[OK] Starting Stream Mode (Stdin)")
        import sys
        
        start_time = time.time()
        frame_count = 0 
        
        # Protocol: 4 bytes length (Big Endian), then Image Data
        while True:
            try:
                # Read length
                length_bytes = sys.stdin.buffer.read(4)
                if not length_bytes:
                    break
                    
                length = int.from_bytes(length_bytes, byteorder='big')
                # print(f"[DEBUG] Expecting frame of size: {length}", file=sys.stderr)
                
                # Read exact length
                img_data = b''
                while len(img_data) < length:
                    chunk = sys.stdin.buffer.read(length - len(img_data))
                    if not chunk:
                        print("[DEBUG] stdin closed while reading image data (partial)", file=sys.stderr)
                        break
                    img_data += chunk
                    
                if len(img_data) < length:
                    break
                    
                # Decode image
                nparr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is not None:
                     frame_count += 1
                     # Log only every 30th frame to avoid spam
                     if frame_count % 30 == 0:
                         print(f"[DEBUG] Decoded frame {frame_count} ({len(img_data)} bytes)", file=sys.stderr)
                
                if frame is None:
                    continue
                    
                elapsed = time.time() - start_time
                
                if elapsed >= (duration * 60):
                   # Send completion signal
                    print(json.dumps({
                        "type": "status",
                        "status": "complete",
                        "message": "Recording time finished"
                    }))
                    sys.stdout.flush()
                    break

                # Process
                stats = recorder.process_frame(frame, elapsed)
                
                # Output generic JSON stats for frontend
                print(json.dumps({
                    "type": "stats",
                    "heart_rate": int(stats['heart_rate']) if stats['heart_rate'] else 0,
                    "temperature": round(stats['temperature'], 1) if stats['temperature'] else 0,
                    "progress": elapsed / (duration * 60),
                    "face_detected": stats['face_detected']
                }))
                sys.stdout.flush()
                
            except Exception as e:
                # Log error to stderr
                print(f"Error processing frame: {e}", file=sys.stderr)
                break
                
        # Finalize
        vital_signs = recorder.finalize_recording()
        
    else:
        # Local Camera Mode
        print(f"\nWe will now record for {int(duration * 60)} seconds.")
        input("Press ENTER when ready...")
        vital_signs = recorder.record(source='camera')
    
    if not vital_signs or not vital_signs['success']:
        print("\n[ERROR] Failed to record vital signs!")
        return
    
    # Prepare complete data
    complete_data = {
        'user_info': {
            'gender': gender,
            'age': age,
            'height': height,
            'weight': weight,
            'duration': duration,
            'bmi': bmi
        },
        'vital_signs': vital_signs
    }
    
    # Save to JSON file
    output_file = 'vital_signs_data.json'
    with open(output_file, 'w') as f:
        json.dump(complete_data, f, indent=4)
    
    print("\n" + "=" * 80)
    print("DATA SAVED SUCCESSFULLY")
    print("=" * 80)
    print(f"\n[OK] Data saved to: {output_file}")
    
    # In streaming mode, output the final result as JSON too
    if args.stream:
        print(json.dumps({
            "type": "result",
            "vital_signs": vital_signs,
            "file": output_file
        }))
        sys.stdout.flush()

if __name__ == "__main__":
    main()