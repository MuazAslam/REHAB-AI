from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routes.auth_routes import auth_routes
from routes.data_routes import data_routes
from routes.doctor_routes import doctor_routes
from routes.ml_routes import ml_routes
from routes.calories_routes import router as calories_router
from contextlib import asynccontextmanager
import subprocess
import os
import sys
from token_manager import token_manager


#  .\venv\Scripts\Activate.ps1  uvicorn main:app --reload
#   .\ml_venv\Scripts\Activate.ps1 


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch ML Service
    print("🚀 Starting ML Video Service...")
    
    # Path setup
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ml_dir = os.path.join(current_dir, "ml")
    ml_venv_python = os.path.join(ml_dir, "ml_venv", "Scripts", "python.exe")
    ml_server_script = os.path.join(ml_dir, "ml_server.py")
    
    # Check if files exist
    if not os.path.exists(ml_venv_python):
        print(f"⚠️ ML venv python not found at {ml_venv_python}")
        print("   Video features may not work. Please ensure ml_venv is set up in backend/ml/")
        ml_process = None
    elif not os.path.exists(ml_server_script):
        print(f"⚠️ ml_server.py not found at {ml_server_script}")
        ml_process = None
    else:
        try:
            # Start the ML server as a subprocess
            # We run it from the ml directory so imports work correctly
            ml_process = subprocess.Popen(
                [ml_venv_python, "ml_server.py"],
                cwd=ml_dir,
                shell=True  # Helpful for Windows venv execution
            )
            print(f"✅ ML Service started (PID: {ml_process.pid})")
        except Exception as e:
            print(f"❌ Failed to start ML Service: {e}")
            ml_process = None
            
    try:
        # Start TCP Server in background
        tcp_task = asyncio.create_task(start_tcp_server())
        
        yield
        
        # Shutdown
        tcp_task.cancel()
        try:
            await tcp_task
        except asyncio.CancelledError:
            pass
            
    finally:
        # Shutdown: Clean up ML Service
        if ml_process:
            print("🛑 Stopping ML Video Service...")
            ml_process.terminate()
            try:
                ml_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                ml_process.kill()
            print("✅ ML Service stopped")

#  .\venv\Scripts\Activate.ps1  uvicorn main:app --reload
app = FastAPI(lifespan=lifespan)

# CORS configuration (similar to Flask CORS)
origins = [
    "http://localhost:5173",   
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/api/validate_stream_token/{token}")
async def validate_stream_token(token: str):
    """Internal endpoint for ML server to validate tokens"""
    token_data = token_manager.validate_token(token)
    if token_data:
        return {"valid": True, "data": token_data}
    return {"valid": False}

# --- NATIVE TCP RECEIVER (Socket Programming) ---
from tcp_control_flow.socket_wrapper import SocketWrapper
from tcp_control_flow import ReliableReceiver
import asyncio
import json # Added this import as it's used in the new code

TCP_PORT = 65432

async def handle_tcp_client(reader, writer):
    addr = writer.get_extra_info('peername')
    print(f"[TCP Server] Connection from {addr}")
    
    sock_wrapper = SocketWrapper(reader, writer)
    
    async def send_ack(ack_num, flags=[]):
        # Construct ACK packet
        from tcp_control_flow.protocol import TCPPacket, FLAG_ACK
        ack_pkt = TCPPacket(seq_num=0, ack_num=ack_num, flags=[FLAG_ACK] + flags)
        await sock_wrapper.send(ack_pkt.to_json())
        # print(f"[TCP Server] Sent ACK={ack_num}")

    receiver = ReliableReceiver(send_ack_callback=send_ack)
    
    try:
        while not receiver.is_finished:
            data_str = await sock_wrapper.recv()
            if not data_str:
                break # Connection closed
            
            await receiver.process_packet(data_str)
            
            # Reassembly Check
            if receiver.is_finished:
                full_data_bytes = receiver.get_reassembled_data()
                print(f"[TCP Server] Transfer Complete. Reassembled {len(full_data_bytes)} bytes.")
                
                # Logic to Store to DB
                db_success = False
                try:
                    report_json = json.loads(full_data_bytes.decode('utf-8'))
                    
                    # 1. Save Full Session Data
                    import db_connection
                    
                    # 2. Update Dashboard Status (Complete Exercise)
                    patient_id = report_json.get("patient_id")
                    exercise_id = report_json.get("exercise_id")
                    pain_data = report_json.get("pain_feedback")
                    session_stats = report_json.get("session_stats")
        
                
                    if patient_id and exercise_id:
                        # 1. Mark as Completed (Original Logic)
                        success = db_connection.complete_exercise(patient_id, exercise_id, pain_data, session_stats)
                        
                        if success:
                            db_success = True
                        else:
                            print(f"⚠️ Failed to mark exercise as completed (might be already completed or invalid ID)")

                    
                    print("✅ Data successfully passed to Data Layer for Storage.")
                    
                except Exception as e:
                    print(f"[TCP Server] Error decoding or saving reassembled data: {e}")
                
                # --- SEND CONFIRMATION BACK TO CLIENT ---
                try:
                    status_msg = json.dumps({"type": "DB_STATUS", "success": db_success})
                    await sock_wrapper.send(status_msg)
                    print(f"[TCP Server] Sent DB Status: {db_success}")
                except Exception as e:
                    print(f"[TCP Server] Error sending prompt confirmation: {e}")

                break
                
    except Exception as e:
        print(f"[TCP Server] Error handling client: {e}")
    finally:
        print(f"[TCP Server] Closing connection from {addr}")
        await sock_wrapper.close()


async def start_tcp_server():
    import ssl
    
    # SSL Context Setup
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    cert_path = os.path.join(current_dir, "certs", "server.crt")
    key_path = os.path.join(current_dir, "certs", "server.key")
    
    try:
        ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
        print(f"🔐 Loaded SSL Certs from {cert_path}")
    except Exception as e:
        print(f"❌ Failed to load SSL Certs: {e}")
        return

    server = await asyncio.start_server(
        handle_tcp_client, '127.0.0.1', TCP_PORT, ssl=ssl_context)
    
    addr = server.sockets[0].getsockname()
    print(f"🚀 TCP Socket Server (TLS) listening on {addr}")
    
    async with server:
        await server.serve_forever()


# --- TCP RELIABLE RECEIVER ENDPOINT ---
from fastapi import WebSocket
from tcp_control_flow import ReliableReceiver
# import json # This import is now redundant as it's moved up for the TCP server logic

@app.websocket("/api/data_transport_socket")
async def data_transport_socket(websocket: WebSocket):
    await websocket.accept()
    print("[Main] Transport Socket Connected")
    
    async def send_ack(ack_num, flags=[]):
        # Construct simple ACK packet
        from tcp_control_flow.protocol import TCPPacket, FLAG_ACK
        pkt = TCPPacket(seq_num=0, ack_num=ack_num, flags=[FLAG_ACK] + flags)
        await websocket.send_text(pkt.to_json())

    receiver = ReliableReceiver(send_ack)
    
    try:
        while True:
            data = await websocket.receive_text()
            print(f"[Main] DEBUG: Received bytes: {len(data)}")
            await receiver.process_packet(data)
            
            if receiver.is_finished:
                print("[Main] Transport Complete. Reassembling Data...")
                full_data_bytes = receiver.get_reassembled_data()
                
                # Logic to Store to DB
                try:
                    report_json = json.loads(full_data_bytes.decode('utf-8'))
                    
                    # 1. Save Full Session Data
                    import db_connection
                    
                    # 2. Update Dashboard Status (Complete Exercise)
                    patient_id = report_json.get("patient_id")
                    exercise_id = report_json.get("exercise_id")
                    pain_data = report_json.get("pain_feedback")
                    session_stats = report_json.get("session_stats")
                
                    if patient_id and exercise_id:
                        # 1. Mark as Completed (Original Logic)
                        success = db_connection.complete_exercise(patient_id, exercise_id, pain_data, session_stats)
                    
                except Exception as e:
                    print(f"[Main] Error decoding or saving reassembled data: {e}")
        
                break
                
    except Exception as e:
        print(f"[Main] Transport Error: {e}")

# Register routers (like Flask blueprints)
app.include_router(auth_routes)
app.include_router(data_routes)
app.include_router(doctor_routes)
app.include_router(calories_router)
app.include_router(ml_routes)

