from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import subprocess
import os
import sys
import json
import asyncio
import base64
import threading

router = APIRouter()

# ============================================================================
# MODELS
# ============================================================================

class CaloriePredictionRequest(BaseModel):
    gender: str
    age: float
    height: float
    weight: float
    duration: float
    heart_rate: float
    body_temp: float

# ============================================================================
# CONFIGURATION
# ============================================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CALORIES_DIR = os.path.join(BASE_DIR, "calories_prediction")

# Venv Paths
VENV_P1_PYTHON = os.path.join(CALORIES_DIR, "venv_p1", "Scripts", "python.exe")
VENV_P2_PYTHON = os.path.join(CALORIES_DIR, "venv_p2", "Scripts", "python.exe")

PREDICT1_SCRIPT = os.path.join(CALORIES_DIR, "predict1.py")
PREDICT2_SCRIPT = os.path.join(CALORIES_DIR, "predict2.py")

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.websocket("/ws/calories/vital-signs")
async def ws_vital_signs(websocket: WebSocket):
    """
    WebSocket for Real-time Vital Signs Recording via predict1.py
    Flow:
    1. Client connects
    2. Client sends Init Config (Gender, Age, etc.)
    3. Server launches predict1.py --stream
    4. Client sends Frames (Binary)
    5. Server passes to stdin -> predict1.py
    6. predict1.py -> stdout -> Server -> Client (Stats)
    """
    await websocket.accept()
    
    process = None
    
    try:
        # 1. Wait for Init Configuration
        init_data = await websocket.receive_json()
        print(f"[WS] Received Init: {init_data}")
        
        gender = init_data.get("gender", "male")
        age = str(init_data.get("age", 25))
        height = str(init_data.get("height", 170))
        weight = str(init_data.get("weight", 70))
        duration = str(init_data.get("duration", 1))
        
        # 2. Launch Subprocess
        cmd = [
            VENV_P1_PYTHON,
            PREDICT1_SCRIPT,
            "--stream",
            "--gender", gender,
            "--age", age,
            "--height", height,
            "--weight", weight,
            "--duration", duration
        ]
        
        # We use current env variables but ensure PYTHONPATH is clear of conflicting stored paths if any
        env = os.environ.copy()
        
        print(f"[WS] Launching: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=CALORIES_DIR,
            env=env
        )
        
        loop = asyncio.get_event_loop()

        async def read_stdout():
            try:
                while True:
                    if process.poll() is not None:
                        break
                        
                    # Run blocking readline in executor
                    line = await loop.run_in_executor(None, process.stdout.readline)
                    
                    if line:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('{') and line_str.endswith('}'):
                            await websocket.send_text(line_str)
                        else:
                            print(f"[predict1] {line_str}")
                    else:
                        if process.poll() is not None:
                            break
                        await asyncio.sleep(0.01)

            except Exception as e:
                print(f"[WS] Error reading stdout: {e}")
        
        async def read_stderr():
            try:
                while True:
                     if process.poll() is not None:
                        # Dump remaining
                        err = await loop.run_in_executor(None, process.stderr.read)
                        if err:
                            print(f"[predict1 ERROR] {err.decode('utf-8')}")
                        break
                     
                     # Read line by line for debug prints
                     line = await loop.run_in_executor(None, process.stderr.readline)
                     if line:
                         print(f"[predict1 DEBUG] {line.decode('utf-8').strip()}")
                     else:
                         await asyncio.sleep(0.1)

            except Exception as e:
                print(f"[WS] Error reading stderr: {e}")

        asyncio.create_task(read_stdout())
        asyncio.create_task(read_stderr())
        
        # 4. Input Loop
        import json
        
        while True:
            # Receive Message (can be bytes or text)
            message = await websocket.receive()
            
            if message["type"] == "websocket.receive":
                if "text" in message:
                    # Handle Text Command (e.g. STOP)
                    try:
                        data = json.loads(message["text"])
                        if data.get("type") == "STOP":
                            print("[WS] Received STOP command from client")
                            break
                    except:
                        pass
                elif "bytes" in message:
                    # Handle Video Frame
                    data = message["bytes"]
                    
                    if process.poll() is not None:
                        print("[WS] Process finished (natural exit)")
                        break
                        
                    # Protocol: Send Length (4 bytes) + Data
                    length = len(data)
                    
                    if length > 0:
                        # print(f"[WS] Forwarding frame of size {length}", flush=True) # Reduced log spam
                        pass

                    try:
                        process.stdin.write(length.to_bytes(4, byteorder='big'))
                        process.stdin.write(data)
                        process.stdin.flush()
                    except BrokenPipeError:
                        print("[WS] Process pipe broken (process died)")
                        break
                    except Exception as e:
                        print(f"[WS] Error writing to process: {e}")
                        break
            elif message["type"] == "websocket.disconnect":
                 print("[WS] Client disconnected")
                 return
            
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        if process:
            process.terminate()
            print("[WS] Process terminated")

    # ========================================================================
    # AUTO-CHAIN STEP 2: CALORIE PREDICTION
    # ========================================================================
    # Only proceed if recording was successful (we assume success if we reached here naturally without exception)
    # Check if vital_signs_data.json exists and is recent?
    
    data_file = os.path.join(CALORIES_DIR, "vital_signs_data.json")
    if os.path.exists(data_file):
        print("[WS] Starting Prediction Step (predict2.py)...")
        try:
           await websocket.send_json({
               "type": "status",
               "status": "predicting",
               "message": "Calculating calories..."
           })
           
           cmd2 = [VENV_P2_PYTHON, PREDICT2_SCRIPT]
           
           # Run synchronous subprocess for prediction
           result = subprocess.run(
               cmd2,
               cwd=CALORIES_DIR,
               capture_output=True,
               text=True
           )
           
           output = result.stdout
           print(f"[predict2] {output}")
           
           # Parse JSON Result
           try:
               # Find JSON part - look for start/end braces in case there are other logs
               json_start = output.find('{')
               json_end = output.rfind('}') + 1
               
               if json_start != -1 and json_end != -1:
                   json_str = output[json_start:json_end]
                   result_data = json.loads(json_str)
                   
                   await websocket.send_json({
                       "type": "result",
                       "status": "success",
                       "calories": result_data.get('calories'),
                       "stats": result_data.get('stats'),
                       "message": "Prediction complete!"
                   })
               else:
                   print(f"[WS] Failed to find JSON in output: {output}")
                   await websocket.send_json({
                       "type": "error",
                       "message": "Prediction failed (Invalid Output)"
                   })
           except json.JSONDecodeError:
               print(f"[WS] Failed to parse JSON: {output}")
               await websocket.send_json({
                   "type": "error",
                   "message": "Prediction failed (Parse Error)"
               })
               
        except Exception as e:
            print(f"[WS] Prediction Error: {e}")
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except:
                pass


@router.post("/api/predict-calories")
async def predict_calories(request: CaloriePredictionRequest):
    """
    Run predict2.py to calculate calories
    Note: predict2.py usually reads from vital_signs_data.json. 
    If we want to pass data directly, we assume vital_signs_data.json was just created by predict1.py
    OR we modify predict2.py to accept args.
    
    Current flow logic: 
    1. predict1.py (Stream) saves vital_signs_data.json on completion.
    2. Frontend calls this endpoint.
    3. This endpoint calls predict2.py.
    """
    
    print(f"[API] Prediction Request for {request.gender}")
    
    # Ensure vital_signs_data.json exists? 
    # Actually, predict2.py checks existence.
    
    cmd = [
        VENV_P2_PYTHON,
        PREDICT2_SCRIPT
    ]
    
    try:
        # Run synchronous subprocess
        result = subprocess.run(
            cmd,
            cwd=CALORIES_DIR,
            capture_output=True,
            text=True
        )
        
        output = result.stdout
        error = result.stderr
        
        print(f"[predict2] STDOUT: {output}")
        if error:
            print(f"[predict2] STDERR: {error}")
            
        # Parse output for "You will burn approximately X calories" or Read file
        # predict2.py logic:
        #   Calculates -> Prints result -> Saves prediction_result_...txt -> Deletes json
        
        # We need to extract the number from Output
        import re
        match = re.search(r"You will burn approximately ([\d\.]+) calories", output)
        if match:
            calories = float(match.group(1))
            return {
                "status": "success",
                "calories": calories,
                "message": "Prediction successful"
            }
        else:
            return {
                "status": "error", 
                "message": "Could not parse prediction result",
                "debug_output": output
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
