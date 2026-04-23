import numpy as np
import tensorflow as tf
from tensorflow import keras
import pickle
import mediapipe as mp
from collections import deque
import sys
import os
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from pose_graph import PoseGraph
from huffman_compression import HuffmanCoder

class PoseAnalyzer:
    def __init__(self):
        """Initialize the pose analyzer with ML model"""
        # Get the directory where this file is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Paths to model files
        model_path = os.path.join(current_dir, "exercise_lstm_model.keras")
        scaler_path = os.path.join(current_dir, "scaler.pkl")
        
        print("Initializing Pose Analyzer...")
        
        # Load model
        try:
            self.model = keras.models.load_model(model_path)
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
            self.model = None

        # Load scaler
        try:
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
        except Exception as e:
            print(f"Error loading scaler: {e}")
            self.scaler = None
        
        self.sequence_length = 32
        
        # Buffers for a single session/connection
        # Note: In a real WebSocket server, these would need to be per-connection
        # For this implementation, we'll assume a new instance is created per connection or managed externally
        self.angle_buffer = deque(maxlen=self.sequence_length)
        self.prediction_history = deque(maxlen=30)
        self.last_prediction_time = 0
        self.prediction_interval = 0.5
        
        # FULL SESSION HISTORY (New)
        self.session_history = []
        self.start_time = time.time()
        
        # Cumulative Stats (for frontend display)
        self.total_prediction_count = 0
        self.total_correct_form_count = 0
        self.total_confidence_sum = 0.0
        
        # State Tracking (Fill-Forward)
        self.latest_prediction = None
        self.latest_confidence = 0.0
        
        # MediaPipe enumerations for easier access
        self.mp_pose = mp.solutions.pose
        
    def reset_session(self):
        """Reset all buffers and timers for a new session"""
        self.angle_buffer.clear()
        self.prediction_history.clear()
        self.session_history = []
        self.total_prediction_count = 0
        self.total_correct_form_count = 0
        self.total_confidence_sum = 0.0
        self.latest_prediction = None
        self.latest_confidence = 0.0
        self.start_time = time.time()
        self.last_prediction_time = 0
        print("Session reset. Timer started.")

    def calculate_angle(self, point1, point2, point3):
        """Calculate angle between three points (dictionaries or objects with x, y)"""
        # Handle both dictionary and object input
        if isinstance(point1, dict):
            a = np.array([point1['x'], point1['y']])
            b = np.array([point2['x'], point2['y']])
            c = np.array([point3['x'], point3['y']])
        else:
            a = np.array([point1.x, point1.y])
            b = np.array([point2.x, point2.y])
            c = np.array([point3.x, point3.y])
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)

    def extract_angles(self, landmarks):
        """
        Extract 8 joint angles using DSA Graph Structure
        landmarks: List of landmark objects (from MediaPipe JS)
        """
        if not landmarks:
            return None
        
        try:
            # Initialize Graph
            graph = PoseGraph()
            
            # Helper to access landmark properties safely
            def get_data(lm):
                if isinstance(lm, dict):
                    return lm['x'], lm['y'], lm.get('visibility', 1.0)
                else:
                    return lm.x, lm.y, getattr(lm, 'visibility', 1.0)

            # 1. Populate Graph Nodes (Add only relevant skeletal points)
            relevant_ids = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
            for idx in relevant_ids:
                if idx < len(landmarks):
                    x, y, vis = get_data(landmarks[idx])
                    graph.add_node(idx, x, y, vis)
            
            # 2. Build Graph Edges (Skeletal Connections)
            connections = [
                (11, 13), (13, 15), # Left Arm
                (12, 14), (14, 16), # Right Arm
                (11, 23), (12, 24), # Torso sides
                (23, 11), (24, 12), # Hip to Shoulder (Undirected logic handled in graph)
                (23, 25), (25, 27), # Left Leg
                (24, 26), (26, 28), # Right Leg
                (11, 12), (23, 24)  # Cross body (Shoulders, Hips)
            ]
            
            for src, tgt in connections:
                graph.add_edge(src, tgt)

            # 3. Compute Angles using Graph Logic
            graph.compute_all_angles()
            
            # 4. Return Feature Vector from Graph
            return graph.get_feature_vector()
        
        except Exception as e:
            print(f"Error extracting angles with Graph: {e}")
            return None

    def check_position(self, landmarks):
        """Check if person is in plank/pushup position"""
        if not landmarks:
            return False, 0.0, "✗ No pose detected"
            
        try:
            def get_y(idx): return landmarks[idx]['y'] if isinstance(landmarks[idx], dict) else landmarks[idx].y
            
            left_shoulder_y = get_y(11)
            right_shoulder_y = get_y(12)
            left_wrist_y = get_y(15)
            right_wrist_y = get_y(16)
            left_elbow_y = get_y(13)
            right_elbow_y = get_y(14)
            nose_y = get_y(0)
            
            shoulder_y = (left_shoulder_y + right_shoulder_y) / 2
            wrist_y = (left_wrist_y + right_wrist_y) / 2
            elbow_y = (left_elbow_y + right_elbow_y) / 2
            
            checks = []
            reasons = []
            
            # Check 1: Wrists on ground
            wrist_shoulder_diff = wrist_y - shoulder_y
            wrists_grounded = wrist_shoulder_diff > 0.25
            checks.append(wrists_grounded)
            
            if wrists_grounded:
                reasons.append("✓ Wrists grounded")
            else:
                reasons.append("✗ Wrists not grounded")
            
            # Check 2: Elbows in position
            elbow_between = (elbow_y > shoulder_y) and (elbow_y < wrist_y)
            checks.append(elbow_between)
            
            if elbow_between:
                reasons.append("✓ Elbows positioned")
            else:
                reasons.append("✗ Elbows not positioned")
            
            # Check 3: Head position
            head_forward = nose_y > shoulder_y - 0.1
            checks.append(head_forward)
            
            if head_forward:
                reasons.append("✓ Head correct")
            else:
                reasons.append("✗ Head too high")
            
            passed = sum(checks)
            confidence = passed / len(checks)
            is_in_position = passed >= 2
            
            reason = " | ".join(reasons)
            return is_in_position, confidence, reason
            
        except Exception as e:
            return False, 0.0, f"✗ Error: {str(e)}"

    def process_frame_landmarks(self, landmarks):
        """
        Process a single frame of landmarks.
        Returns a dict of metrics.
        """
        # 1. Check Position
        is_in_pos, pos_conf, pos_reason = self.check_position(landmarks)
        
        current_prediction = None
        current_confidence = 0.0
        angles = None
        
        # 2. Extract Angles & Buffer if in position
        if is_in_pos:
            angles = self.extract_angles(landmarks)
            if angles is not None:
                self.angle_buffer.append(angles)
                
                # 3. Predict if buffer full
                current_time = time.time()
                if (len(self.angle_buffer) >= self.sequence_length and 
                    current_time - self.last_prediction_time >= self.prediction_interval):
                    
                    if self.model and self.scaler:
                        # Prepare data
                        input_data = np.array(list(self.angle_buffer), dtype=np.float32)
                        input_data = input_data.reshape(-1, 8)
                        input_data = self.scaler.transform(input_data)
                        input_data = input_data.reshape(1, self.sequence_length, 8)
                        
                        # Predict
                        prediction = self.model.predict(input_data, verbose=0)
                        pred_proba = float(np.max(prediction[0]))
                        pred_class = 1 if pred_proba >= 0.60 else 0
                        
                        current_prediction = pred_class
                        current_confidence = pred_proba
                        
                        self.prediction_history.append((pred_class, pred_proba))
                        self.last_prediction_time = current_time
                        
                        # Update Cumulative Stats
                        self.total_prediction_count += 1
                        if pred_class == 1:
                            self.total_correct_form_count += 1
                        self.total_confidence_sum += pred_proba
                        
                        # Update Latest State (Fill Forward)
                        self.latest_prediction = pred_class
                        self.latest_confidence = pred_proba
                        
        
        # 4. Calculate Summary Stats (Cumulative now, not just sliding window)
        summary = None
        if self.total_prediction_count > 0:
            avg_pred = self.total_correct_form_count / self.total_prediction_count
            avg_conf = self.total_confidence_sum / self.total_prediction_count
            
            summary = {
                'average_count': self.total_correct_form_count,
                'not_average_count': self.total_prediction_count - self.total_correct_form_count,
                'average_percentage': avg_pred * 100,
                'avg_confidence': avg_conf
            }
            
        result = {
            "in_position": is_in_pos,
            "position": "IN POSITION" if is_in_pos else "NOT IN POSITION",
            "position_confidence": round(pos_conf * 100, 1),
            "feedback": pos_reason,
            "buffer_percent": round((len(self.angle_buffer) / self.sequence_length) * 100, 0),
            "current_prediction": current_prediction,
            "current_confidence": round(current_confidence * 100, 1) if current_confidence else 0,
            "prediction_count": self.total_prediction_count, # Return TOTAL count
            "summary": summary
        }
        
        # Buffer this frame for final report
        self.session_history.append({
            "timestamp": time.time(),
            "in_position": is_in_pos,
            "confidence": self.latest_confidence if self.latest_prediction is not None else 0.0,
            "prediction": self.latest_prediction,
            "angles": angles.tolist() if angles is not None else [],
            "feedback": pos_reason
        })
        
        return result

    def get_session_summary(self, pain_data=None):
        """
        Generate a comprehensive report of the session.
        """
        total_frames = len(self.session_history)
        if total_frames == 0:
            return {"error": "No data recorded"}
            
        in_pos_frames = [f for f in self.session_history if f['in_position']]
        valid_predictions = [f for f in self.session_history if f['prediction'] is not None]
        
        # Calculate aggregates from cumulative stats to match frontend EXACTLY
        avg_confidence = 0
        avg_percentage = 0
        
        if self.total_prediction_count > 0:
            avg_confidence = self.total_confidence_sum / self.total_prediction_count
            avg_percentage = (self.total_correct_form_count / self.total_prediction_count) * 100
            
        # HUFFMAN COMPRESSION (Simulated Transmission Savings)
        compression_stats = {}
        try:
            # 1. Gather all angle data (32 angles per frame usually, but here we store list of 8)
            all_angles = []
            for f in self.session_history:
                if f['angles']:
                    all_angles.extend(f['angles'])
            
            if all_angles:
                # 2. Compress the session data
                encoded_bits, code_map = HuffmanCoder.compress_angles(all_angles)
                
                # 3. Calculate bits metrics
                original_bits = len(all_angles) * 32 # 32-bit floats
                compressed_bits = len(encoded_bits) + (len(code_map) * 32) # Bits + Table overhead
                
                savings = (1 - (compressed_bits / original_bits)) * 100
                
                compression_stats = {
                    "original_size_bits": original_bits,
                    "compressed_size_bits": compressed_bits,
                    "compression_ratio": f"{savings:.1f}%",
                    "huffman_tree_size": len(code_map)
                }
                print(compression_stats)
        except Exception as e:
            print(f"Compression error: {e}")

        # 4. Prepare Lightweight History (Strip raw angles, keep metadata)
        lightweight_history = []
        for frame in self.session_history:
            frame_copy = frame.copy()
            if 'angles' in frame_copy:
                del frame_copy['angles'] # Remove raw data, relied on encoded_data
            lightweight_history.append(frame_copy)

        return {"session_stats" : {
                "duration_seconds": time.time() - self.start_time,
                "total_frames_processed": total_frames,
                "frames_in_position": len(in_pos_frames),
                "total_predictions": self.total_prediction_count,
                "average_percentage": round(avg_percentage, 1),
                "average_count": self.total_correct_form_count,
                "not_average_count": self.total_prediction_count - self.total_correct_form_count,
                "average_confidence": round(avg_confidence * 100, 2),
                "compression_stats": compression_stats,
                "time_series_data": lightweight_history, # Timestamps/Feedback only (No angles)
                "encoded_data": encoded_bits if 'encoded_bits' in locals() else None,
                "huffman_map": {str(k): v for k, v in code_map.items()} if 'code_map' in locals() else None 
                },
                "pain_feedback": pain_data}
