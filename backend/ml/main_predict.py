# ============================================
# CONTINUOUS AUTO-PREDICTION CLASSIFIER
# Automatically predicts with latest 32 frames when buffer is full
# ============================================

import cv2
import numpy as np
import tensorflow as tf
from tensorflow import keras
import pickle
import mediapipe as mp
from collections import deque
import time

class ContinuousClassifier:
    def __init__(self, model_path, scaler_path, sequence_length=32, img_size=(64, 64)):
        """
        Continuous classifier with automatic prediction on latest 32 frames
        """
        print("="*70)
        print("INITIALIZING CONTINUOUS AUTO-PREDICTION CLASSIFIER")
        print("="*70)
        
        # Load model
        print("\n1. Loading model...")
        self.model = keras.models.load_model(model_path)
        print("   ✓ Model loaded")
        
        # Load scaler
        print("\n2. Loading scaler...")
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        print("   ✓ Scaler loaded")
        
        self.sequence_length = sequence_length
        self.img_size = img_size
        
        # Initialize MediaPipe
        print("\n3. Initializing MediaPipe Pose...")
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        print("   ✓ MediaPipe initialized")
        
        # Buffers
        self.frame_buffer = deque(maxlen=sequence_length)
        self.angle_buffer = deque(maxlen=sequence_length)
        self.position_buffer = deque(maxlen=10)
        
        # Prediction tracking
        self.prediction_history = deque(maxlen=30)  # Track last 30 predictions
        self.last_prediction_time = 0
        self.prediction_interval = 0.5  # Predict every 0.5 seconds when buffer is full
        
        print("\n" + "="*70)
        print("✅ INITIALIZATION COMPLETE")
        print("="*70)
    
    def is_in_exercise_position(self, landmarks):
        """
        PRE-CHECK: Is person in plank or pushup position?
        Front-facing camera view (not sideways)
        
        Returns: (is_in_position, confidence, reason)
        """
        if landmarks is None:
            return False, 0.0, "✗ No pose detected"
        
        try:
            # Get key landmarks
            left_shoulder = landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            right_shoulder = landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            left_wrist = landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value]
            right_wrist = landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value]
            left_elbow = landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW.value]
            right_elbow = landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW.value]
            nose = landmarks[self.mp_pose.PoseLandmark.NOSE.value]
            
            # Calculate positions
            shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
            wrist_y = (left_wrist.y + right_wrist.y) / 2
            elbow_y = (left_elbow.y + right_elbow.y) / 2
            
            checks = []
            reasons = []
            
            # CHECK 1: Wrists MUST be significantly lower than shoulders (hands on ground)
            wrist_shoulder_diff = wrist_y - shoulder_y
            wrists_grounded = wrist_shoulder_diff > 0.25  # More strict
            checks.append(wrists_grounded)
            
            if wrists_grounded:
                reasons.append(f"✓ Wrists grounded (diff: {wrist_shoulder_diff:.2f})")
            else:
                reasons.append(f"✗ Wrists not grounded (diff: {wrist_shoulder_diff:.2f}, need > 0.25)")
            
            # CHECK 2: Elbows should be between shoulders and wrists (arms supporting body)
            # This helps eliminate false positives when standing
            elbow_between = (elbow_y > shoulder_y) and (elbow_y < wrist_y)
            checks.append(elbow_between)
            
            if elbow_between:
                reasons.append(f"✓ Elbows in position")
            else:
                reasons.append(f"✗ Elbows not in position")
            
            # CHECK 3: Head should be forward/down (not looking up like standing)
            # In plank/pushup: nose is lower than shoulders
            head_forward = nose.y > shoulder_y - 0.1
            checks.append(head_forward)
            
            if head_forward:
                reasons.append(f"✓ Head position correct")
            else:
                reasons.append(f"✗ Head too high")
            
            # Calculate confidence
            passed = sum(checks)
            confidence = passed / len(checks)
            
            # Need at least 2/3 checks to pass
            is_in_position = passed >= 2
            
            reason = " | ".join(reasons)
            
            return is_in_position, confidence, reason
            
        except Exception as e:
            return False, 0.0, f"✗ Error: {str(e)}"
    
    def calculate_angle(self, point1, point2, point3):
        """Calculate angle between three points"""
        a = np.array([point1.x, point1.y])
        b = np.array([point2.x, point2.y])
        c = np.array([point3.x, point3.y])
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)
    
    def extract_angles(self, landmarks):
        """Extract 8 joint angles from pose landmarks"""
        if landmarks is None:
            return None
        
        try:
            # Left side
            elbow_l = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value]
            )
            
            shoulder_l = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
            )
            
            hip_l = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE.value]
            )
            
            knee_l = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE.value],
                landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE.value]
            )
            
            # Right side
            elbow_r = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value]
            )
            
            shoulder_r = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
            )
            
            hip_r = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE.value]
            )
            
            knee_r = self.calculate_angle(
                landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE.value],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            )
            
            return np.array([elbow_l, shoulder_l, hip_l, knee_l, 
                           elbow_r, shoulder_r, hip_r, knee_r], dtype=np.float32)
        
        except:
            return None
    
    def predict_form(self):
        """Make prediction on collected frames"""
        if len(self.frame_buffer) < self.sequence_length:
            return None, None
        
        # Prepare angles
        angles = np.array(list(self.angle_buffer), dtype=np.float32)
        angles = angles.reshape(-1, 8)
        angles = self.scaler.transform(angles)
        angles = angles.reshape(1, self.sequence_length, 8)
        
        # Predict - model uses only angles (not frames)
        prediction = self.model.predict(angles, verbose=0)
        pred_proba = float(np.max(prediction[0]))   # Get the confidence of that prediction
        
        # If confidence >= 65%, classify as AVERAGE (class 1), otherwise NOT AVERAGE (class 0)
        pred_class = 1 if pred_proba >= 0.65 else 0
        
        return pred_class, pred_proba
    
    def get_prediction_summary(self):
        """Get summary statistics from recent predictions"""
        if len(self.prediction_history) == 0:
            return None
        
        predictions = [p[0] for p in self.prediction_history]
        confidences = [p[1] for p in self.prediction_history]
        
        avg_predictions = sum(predictions) / len(predictions)
        avg_confidence = sum(confidences) / len(confidences)
        
        return {
            'average_count': sum(predictions),
            'not_average_count': len(predictions) - sum(predictions),
            'average_percentage': avg_predictions * 100,
            'avg_confidence': avg_confidence
        }
    
    def run(self, camera_index=0, display_size=(1280, 720)):
        """
        Run continuous classification with automatic predictions
        """
        print("\n" + "="*70)
        print("STARTING CONTINUOUS AUTO-PREDICTION")
        print("="*70)
        print("\nControls:")
        print("  • Press 'q' to quit")
        print("  • Press 'r' to reset buffers")
        print("\n🤖 AUTO-PREDICTION MODE: System will predict automatically")
        print("    when buffer is full and you're in position!")
        print("\n" + "="*70)
        
        cap = cv2.VideoCapture(camera_index)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        if not cap.isOpened():
            print("❌ Error: Could not open webcam")
            return
        
        fps_buffer = deque(maxlen=60)
        frame_count = 0
        prediction_count = 0
        current_prediction = None
        current_confidence = None
        current_position_status = "Unknown"
        position_confidence = 0.0
        position_reason = ""
        
        print("✓ Webcam opened successfully")
        print("🎥 Recording started...\n")
        
        while True:
            start_time = time.time()
            
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process pose
            results = self.pose.process(rgb_frame)
            
            # Draw pose landmarks
            if results.pose_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    self.mp_pose.POSE_CONNECTIONS,
                    self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                    self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=1)
                )
                
                # PRE-CHECK: Is person in exercise position?
                is_in_pos, pos_conf, pos_reason = self.is_in_exercise_position(results.pose_landmarks.landmark)
                self.position_buffer.append(is_in_pos)
                
                # Use majority vote from buffer
                position_status = sum(self.position_buffer) > len(self.position_buffer) / 2
                current_position_status = "IN POSITION ✓" if position_status else "NOT IN POSITION ✗"
                position_confidence = pos_conf
                position_reason = pos_reason
                
                # Only collect frames if in position
                if position_status:
                    angles = self.extract_angles(results.pose_landmarks.landmark)
                    
                    if angles is not None:
                        small_frame = cv2.resize(frame, self.img_size)
                        self.frame_buffer.append(small_frame)
                        self.angle_buffer.append(angles)
                        
                        # AUTO-PREDICT: When buffer is full and enough time has passed
                        current_time = time.time()
                        if (len(self.frame_buffer) >= self.sequence_length and 
                            current_time - self.last_prediction_time >= self.prediction_interval):
                            
                            pred_class, pred_proba = self.predict_form()
                            
                            if pred_class is not None:
                                current_prediction = pred_class
                                current_confidence = pred_proba
                                self.prediction_history.append((pred_class, pred_proba))
                                self.last_prediction_time = current_time
                                prediction_count += 1
                                
                                result = "AVERAGE ✓" if pred_class == 1 else "NOT AVERAGE ✗"
                                print(f"🔮 Auto-prediction #{prediction_count}: {result} ({pred_proba:.1%})")
            
            # Calculate FPS
            fps = 1.0 / (time.time() - start_time)
            fps_buffer.append(fps)
            avg_fps = np.mean(fps_buffer)
            
            # Display info
            buffer_fill = len(self.frame_buffer)
            buffer_percent = (buffer_fill / self.sequence_length) * 100
            
            # Main status box
            cv2.rectangle(frame, (10, 10), (650, 280), (0, 0, 0), -1)
            cv2.rectangle(frame, (10, 10), (650, 280), (255, 255, 255), 2)
            
            # FPS
            cv2.putText(frame, f"FPS: {avg_fps:.1f}", (20, 40), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Position status
            pos_color = (0, 255, 0) if "IN POSITION" in current_position_status else (0, 0, 255)
            cv2.putText(frame, f"Position: {current_position_status}", (20, 70), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, pos_color, 2)
            cv2.putText(frame, f"Confidence: {position_confidence:.0%}", (20, 95), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, pos_color, 2)
            
            # Buffer status
            color = (0, 255, 0) if buffer_fill >= self.sequence_length else (0, 165, 255)
            cv2.putText(frame, f"Buffer: {buffer_fill}/{self.sequence_length} ({buffer_percent:.0f}%)", 
                       (20, 125), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Progress bar
            bar_width = 610
            filled_width = int((buffer_fill / self.sequence_length) * bar_width)
            cv2.rectangle(frame, (20, 135), (20 + bar_width, 155), (50, 50, 50), -1)
            cv2.rectangle(frame, (20, 135), (20 + filled_width, 155), color, -1)
            cv2.rectangle(frame, (20, 135), (20 + bar_width, 155), (255, 255, 255), 2)
            
            # Auto-prediction status
            cv2.putText(frame, f"Auto-predictions made: {prediction_count}", (20, 180), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            
            # Current prediction
            if current_prediction is not None:
                pred_text = "AVERAGE" if current_prediction == 1 else "NOT AVERAGE"
                pred_color = (0, 255, 0) if current_prediction == 1 else (0, 0, 255)
                cv2.putText(frame, f"Current: {pred_text} ({current_confidence:.1%})", 
                           (20, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, pred_color, 2)
            
            # Prediction summary
            summary = self.get_prediction_summary()
            if summary:
                cv2.putText(frame, f"Summary: {summary['average_count']}✓ / {summary['not_average_count']}✗ ({summary['average_percentage']:.0f}% avg)", 
                           (20, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
            
            # Position checks box
            cv2.rectangle(frame, (10, 290), (650, 390), (0, 0, 0), -1)
            cv2.rectangle(frame, (10, 290), (650, 390), (255, 255, 255), 2)
            cv2.putText(frame, "Position Checks:", (20, 315), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Display position check reasons
            y_offset = 340
            for line in position_reason.split(" | "):
                cv2.putText(frame, line, (30, y_offset), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                y_offset += 20
            
            # Instructions
            cv2.rectangle(frame, (10, 400), (650, 460), (0, 0, 0), -1)
            cv2.rectangle(frame, (10, 400), (650, 460), (255, 255, 255), 2)
            cv2.putText(frame, "Q=Quit | R=Reset", 
                       (20, 430), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Display frame
            display_frame = cv2.resize(frame, display_size)
            cv2.imshow('Continuous Auto-Prediction Form Classification', display_frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("\n🛑 Quitting...")
                break
            
            elif key == ord('r'):
                self.frame_buffer.clear()
                self.angle_buffer.clear()
                self.position_buffer.clear()
                self.prediction_history.clear()
                current_prediction = None
                current_confidence = None
                prediction_count = 0
                print("🔄 Buffers and history reset")
        
        # Cleanup
        cap.release()
        cv2.destroyAllWindows()
        self.pose.close()
        
        print("\n" + "="*70)
        print("✅ CLASSIFICATION SESSION ENDED")
        print("="*70)
        print(f"Total frames processed: {frame_count:,}")
        print(f"Total predictions made: {prediction_count}")
        
        # Final summary
        summary = self.get_prediction_summary()
        if summary:
            print(f"\nFinal Summary:")
            print(f"  • Average form: {summary['average_count']} predictions ({summary['average_percentage']:.1f}%)")
            print(f"  • Not average form: {summary['not_average_count']} predictions")
            print(f"  • Average confidence: {summary['avg_confidence']:.1%}")


# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    
    # Paths to your saved model files
    MODEL_PATH = r"D:\Projects\Semester 3\AI Physio\backend\ml\exercise_lstm_model.keras"  # Update with your new model path
    SCALER_PATH = r'D:\Projects\Semester 3\AI Physio\backend\ml\scaler.pkl'  # Update with your new scaler path  # Update with your new scaler path
    
    # Initialize classifier (no threshold needed)
    classifier = ContinuousClassifier(
        model_path=MODEL_PATH,
        scaler_path=SCALER_PATH,
        sequence_length=32,
        img_size=(64, 64)
    )
    
    # Run
    classifier.run(camera_index=0, display_size=(1280, 720))