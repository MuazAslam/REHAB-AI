from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import json
import urllib.request
import asyncio
from datetime import datetime

# Add parent directory to import token_manager
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from token_manager import token_manager


from pose_analysis import PoseAnalyzer

# Import Stats Plotter
sys.path.append(os.path.join(os.path.dirname(__file__), '..')) # Add backend to path
from network_sim.network_stats_plotter import plot_tcp_stats

app = FastAPI()
# REMOVED GLOBAL PoseAnalyzer() to support concurrency
# pose_analyzer = PoseAnalyzer()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.websocket("/ws/pose-analysis/{token}")
async def websocket_pose_analysis(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time pose analysis
    """

    # Validate token via Main Backend API (since we are in a separate process)
    try:
        api_url = f"http://127.0.0.1:8000/api/validate_stream_token/{token}"
        with urllib.request.urlopen(api_url) as response:
            data = json.loads(response.read().decode())
            
            if not data.get("valid"):
                print(f"REJECTING connection: Token invalid or expired: {token}")
        
                await websocket.close(code=4003, reason="Invalid token") 
                return
            
            token_data = data.get("data")
            current_patient_id = token_data.get("patient_id")
            current_exercise_id = token_data.get("exercise_id")


    except Exception as e:
        print(f"Validation Error: {e}")
        await websocket.close(code=4003, reason="Validation Failed")
        return

    await websocket.accept()
    
    # 1. Create UNIQUE Analyzer instance for this session (Concurrency Fix)
    pose_analyzer = PoseAnalyzer()
    pose_analyzer.reset_session()
    
    # 2. Generate Unique Session ID
    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    session_id = f"{current_patient_id}_{current_exercise_id}_{timestamp_str}"
    print(f"DEBUG: Starting Session: {session_id}")
    
    try:
        while True:
            # Receive landmarks data
            data = await websocket.receive_text()
            
            # Check for Session Completion Command
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                continue

            if isinstance(payload, dict) and payload.get("command") == "complete_session":
                print(f"Session Complete for token {token}. Generating Report...")
                pain_data = payload.get("pain_data")
                report = pose_analyzer.get_session_summary(pain_data)
                
                # --- INJECT METADATA ---
                # Use cached data from initial connection to avoid expiry issues at the end
                if current_patient_id and current_exercise_id:
                    report["patient_id"] = current_patient_id
                    report["exercise_id"] = current_exercise_id
                
                
                # --- NATIVE TCP RELIABLE TRANSFER START ---
                try:
                    from tcp_control_flow import ReliableSender, TCPPacket
                    print(f"DEBUG: Connecting to Main Backend TCP Server on Port 65432 (TLS)...")
                    
                    # 1. Setup SSL Context for Client
                    import ssl
                    ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE
                    
                    # 2. Connect to TCP Server with SSL
                    reader, writer = await asyncio.open_connection('127.0.0.1', 65432, ssl=ssl_context)
                    
                    # 2. Add path to allow import if needed (already likely there)
                    # from tcp_control_flow.socket_wrapper import SocketWrapper
                    # Using dynamic import or assuming path is set
                    from tcp_control_flow.socket_wrapper import SocketWrapper
                    
                    sock_wrapper = SocketWrapper(reader, writer)
                    print("[Transport] Connected to TCP Server.")

                    # 3. Serialize Report
                    data_str = json.dumps(report)
                    data_bytes = data_str.encode('utf-8')
                    
                    # 4. Initialize Sender with Session ID
                    # Note: ReliableSender expects a 'socket' object with a .send() method.
                    # Our SocketWrapper has .send() which matches the interface!
                    sender = ReliableSender(sock_wrapper, data_bytes, session_id=session_id)
                    
                    # 5. Background ACK Listener
                    async def listen_acks():
                        try:
                            while True:
                                msg_str = await sock_wrapper.recv()
                                if not msg_str:
                                    print("[Transport] TCP Connection Closed by Server.")
                                    break
                                
                                pkt = TCPPacket.from_json(msg_str)
                                if pkt:
                                    print(f"[Transport] Got ACK: {pkt.ack_num}")
                                    sender.process_ack(pkt.ack_num)
                        except Exception as e:
                            print(f"[Transport] ACK Listener Error: {e}")
                    
                    ack_task = asyncio.create_task(listen_acks())

                    # 6. Handshake & Send
                    await sender.handshake()
                    await asyncio.sleep(0.1) # Simulate RTT
                    await sender.send_data()
                    
                    # Cleanup
                    if not ack_task.done():
                        ack_task.cancel()
                    
                    print("[Transport] Data Sent. Waiting for DB Persistence Confirmation...")
                    
                    # --- WAIT FOR DB CONFIRMATION ---
                    # --- WAIT FOR DB CONFIRMATION ---
                    db_confirmed = False
                    try:
                        import time
                        start_wait = time.time()
                        
                        while time.time() - start_wait < 5.0:
                            try:
                                response_str = await asyncio.wait_for(sock_wrapper.recv(), timeout=1.0)
                                if not response_str:
                                    break
                                
                                resp_json = json.loads(response_str)
                                
                                # 1. Check for valid DB Status
                                if resp_json.get("type") == "DB_STATUS":
                                    if resp_json.get("success"):
                                        db_confirmed = True
                                        print("[Transport] Database Save CONFIRMED.")
                                    else:
                                        print(f"[Transport] Database Save FAILED: {response_str}")
                                    break
                                
                                # 2. Ignore late TCP Protocol packets (ACKs)
                                if "seq" in resp_json or "ack" in resp_json or "flags" in resp_json:
    
                                    continue
                                    
                                print(f"[Transport] Unknown message received: {response_str}")

                            except asyncio.TimeoutError:
                                continue
                                
                    except Exception as e:
                        print(f"[Transport] Error waiting for DB confirmation: {e}")

                    await sock_wrapper.close()
                    print("[Transport] Transfer Successfully Completed via TCP Socket.")
                    
                    # --- GENERATE NETWORK STATS GRAPHS ---
                    try:
                        print("[Transport] Generating Real-Time Network Graphs...")
                        stats = sender.get_transfer_stats()
                    
                        # We run this in a thread or just call it directly since matplotlib might block
                        # For simplicity in this demo, calling directly (it's fast for single plots)
                        plot_tcp_stats(stats, session_id=session_id)
                        
                    except Exception as e:
                        print(f"[Transport] Error Generating Plots: {e}")
                        import traceback
                        traceback.print_exc()

                    if db_confirmed:
                        # --- NOTIFY FRONTEND ---
                        await websocket.send_json({
                            "status": "completed",
                            "redirect": True,
                            "message": "Session saved successfully!"
                        })
                    else:
                         print("[Transport] Skipping Frontend Redirect due to DB Failure.")
                    
                except Exception as e:
                    print(f"[Transport] Connection Error: {e}")
                    import traceback
                    traceback.print_exc()

                # --- TCP TRANSFER END ---
                
                break # Exit loop to close connection
            
            # Normal Frame Processing
            landmarks = payload
            
            # Process landmarks using our decoupled analyzer
            metrics = pose_analyzer.process_frame_landmarks(landmarks)
            

            # Send back metrics
            await websocket.send_json(metrics)
            
            # Small yield to prevent CPU hogging
            await asyncio.sleep(0.01)
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for token {token}")
    

    except Exception as e:
        print(f"Error in websocket handler: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    print("Starting ML Video Streaming Service on port 8001...")
    uvicorn.run(app, host="127.0.0.1", port=8001)

