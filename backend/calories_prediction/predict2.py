"""
STEP 2: Calorie Prediction
Environment: NumPy 2.2.6 + XGBoost + Model Loading
This script loads the vital signs data and makes predictions
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime
import warnings
import sys
warnings.filterwarnings('ignore')

# ============================================================================
# CALORIE PREDICTION
# ============================================================================

class CaloriePredictor:
    """Loads trained model and makes predictions"""
    
    def __init__(self, model_path, scaler_path):
        print("\nLoading model and scaler...")
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        print("[OK] Model and scaler loaded successfully!")
    
    def preprocess_input(self, data):
        """Preprocess input data to match training format"""
        if isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            df = data.copy()
        
        # Encode Gender
        if 'Gender' in df.columns:
            df['Gender'] = df['Gender'].map({
                'male': 1, 'female': 0,
                'Male': 1, 'Female': 0,
                'M': 1, 'F': 0
            }).fillna(0)
        
        # Ensure numeric
        numeric_cols = ['Age', 'Height', 'Weight', 'Duration', 'Heart_Rate', 'Body_Temp', 'BMI']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0).astype(float)
        
        # Feature engineering
        df['BMI_Age'] = df['BMI'] * df['Age']
        df['Heart_Rate_Duration'] = df['Heart_Rate'] * df['Duration']
        df['Body_Temp_Heart_Rate'] = df['Body_Temp'] * df['Heart_Rate']
        df['Weight_Height_Ratio'] = df['Weight'] / (df['Height'] + 1e-6)
        df['Calories_Per_Minute'] = 0.0
        df['Age_Squared'] = df['Age'] ** 2
        df['Duration_Squared'] = df['Duration'] ** 2
        df['Heart_Rate_Squared'] = df['Heart_Rate'] ** 2
        
        df['Age_Group'] = pd.cut(df['Age'], bins=[0, 25, 40, 60, 100], labels=[0, 1, 2, 3])
        df['Age_Group'] = df['Age_Group'].astype(int)
        
        # Drop columns
        columns_to_drop = ['Body_Temp', 'Heart_Rate', 'Calories']
        df = df.drop(columns=columns_to_drop, errors='ignore')
        
        # Handle NaN and inf
        df = df.fillna(0.0)
        df = df.replace([np.inf, -np.inf], 0.0)
        
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        
        return df
    
    def predict(self, data):
        """Make calorie prediction"""
        df_processed = self.preprocess_input(data)
        X_scaled = self.scaler.transform(df_processed)
        X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)
        
        prediction = self.model.predict(X_scaled)
        return prediction[0] if len(prediction) == 1 else prediction

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("""
    ==============================================================================
                          STEP 2: CALORIE PREDICTION                              
                       Environment: NumPy 2.2.6 Compatible                        
    ==============================================================================
    """)
    
    # Load vital signs data
    data_file = 'vital_signs_data.json'
    
    if not os.path.exists(data_file):
        print(f"\n[ERROR] '{data_file}' not found!")
        print("\nPlease run Step 1 (vital signs recording) first!")
        print("That script will create the data file with heart rate and temperature.")
        return
    
    print("\n" + "=" * 80)
    print("LOADING VITAL SIGNS DATA")
    print("=" * 80)
    
    with open(data_file, 'r') as f:
        data = json.load(f)
    
    user_info = data['user_info']
    vital_signs = data['vital_signs']
    
    print("\n[OK] Data loaded successfully!")
    print("\nUser Information:")
    print(f"  Gender: {user_info['gender'].capitalize()}")
    print(f"  Age: {user_info['age']} years")
    print(f"  Height: {user_info['height']} cm")
    print(f"  Weight: {user_info['weight']} kg")
    print(f"  BMI: {user_info['bmi']}")
    print(f"  Exercise Duration: {user_info['duration']} minutes")
    
    print("\nVital Signs:")
    print(f"  Heart Rate: {vital_signs['heart_rate']:.1f} BPM")
    print(f"  Body Temperature: {vital_signs['body_temp']:.1f}°C")
    print(f"  Recorded: {vital_signs['timestamp']}")
    
    # Load model
    print("\n" + "=" * 80)
    print("LOADING PREDICTION MODEL")
    print("=" * 80)
    
    model_dir = 'saved_models'
    
    if not os.path.exists(model_dir):
        print(f"[ERROR] '{model_dir}' directory not found!")
        return
    
    # Look for compat files first, then regular files
    model_files = [f for f in os.listdir(model_dir) 
                   if f.startswith('stacking_ensemble_') and f.endswith('.pkl')]
    scaler_files = [f for f in os.listdir(model_dir) 
                    if f.startswith('scaler_') and f.endswith('.pkl')]
    
    if not model_files or not scaler_files:
        print("[ERROR] Model files not found!")
        return
    
    # Prefer _compat files if available
    compat_model = [f for f in model_files if '_compat' in f]
    compat_scaler = [f for f in scaler_files if '_compat' in f]
    
    if compat_model and compat_scaler:
        model_path = os.path.join(model_dir, sorted(compat_model)[-1])
        scaler_path = os.path.join(model_dir, sorted(compat_scaler)[-1])
        print("[OK] Using compatible model files")
    else:
        model_path = os.path.join(model_dir, sorted(model_files)[-1])
        scaler_path = os.path.join(model_dir, sorted(scaler_files)[-1])
        print("[OK] Using standard model files")
    
    print(f"Model: {os.path.basename(model_path)}")
    print(f"Scaler: {os.path.basename(scaler_path)}")
    
    try:
        predictor = CaloriePredictor(model_path, scaler_path)
    except Exception as e:
        print(f"\n[ERROR] Error loading model: {str(e)}")
        return
    
    # Prepare prediction data
    prediction_data = {
        'Gender': user_info['gender'],
        'Age': user_info['age'],
        'Height': user_info['height'],
        'Weight': user_info['weight'],
        'Duration': user_info['duration'],
        'Heart_Rate': vital_signs['heart_rate'],
        'Body_Temp': vital_signs['body_temp'],
        'BMI': user_info['bmi']
    }
    
    print("\n" + "=" * 80)
    print("PREDICTION INPUT DATA")
    print("=" * 80)
    for key, value in prediction_data.items():
        if isinstance(value, float):
            print(f"{key:20s}: {value:.2f}")
        else:
            print(f"{key:20s}: {value}")
    
    # Make prediction
    print("\n" + "=" * 80)
    print("MAKING PREDICTION...")
    print("=" * 80)
    
    calories = predictor.predict(prediction_data)
    
    # Sanity Check: Clamp negative predictions
    if calories <= 0:
        print(f"[WARNING] Model predicted negative calories ({calories}). Clamping to minimum.")
        # Fallback heuristic: METs calculation approx for sitting/light activity
        # MET * weight_kg * hours
        # Resting ~ 1.5 METs
        fallback = 1.5 * user_info['weight'] * (user_info['duration'] / 60.0)
        calories = max(0.5, fallback) # Ensure at least some burn
    elif calories < 0.5:
         calories = 0.5 # Minimum sanitary floor
    # Prepare result JSON
    result_json = {
        "status": "success",
        "calories": float(calories),
        "stats": {
            "heart_rate": vital_signs.get('heart_rate'),
            "temperature": vital_signs.get('body_temp'),
            "duration": user_info.get('duration'),
            "hr_samples": vital_signs.get('hr_samples'),
            "temp_samples": vital_signs.get('temp_samples')
        }
    }
    
    # Print JSON as the FINAL output line, prefixed with a marker if needed, but clean JSON is best
    # We print it to stdout so backend can capture it
    print(json.dumps(result_json))
    
    # Delete the vital signs data file for privacy
    try:
        os.remove(data_file)
        # We print logs to stderr so they don't corrupt the JSON output
        print(f"[OK] Deleted '{data_file}' for privacy protection", file=sys.stderr)
    except Exception as e:
        print(f"[WARNING] Could not delete data file: {str(e)}", file=sys.stderr)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INFO] Program interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()