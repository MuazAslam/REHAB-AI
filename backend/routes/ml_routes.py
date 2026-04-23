
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import sys
import os

# Add parent directory to path to import token_manager
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from token_manager import token_manager


ml_routes = APIRouter()


class VideoTokenRequest(BaseModel):
    patient_id: str
    exercise_name: str
    exercise_id: str


@ml_routes.post("/api/video/generate-token")
async def generate_video_token(payload: VideoTokenRequest):
    """
    Generate a secure token for video feed access
    Only allows plank exercises
    """
    # Validate that exercise is plank
    if "plank" not in payload.exercise_name.lower():
        return JSONResponse({
            "status": "error",
            "message": "Video feed is only available for plank exercises"
        }, status_code=400)
    
    # Generate token
    token = token_manager.generate_token(
        patient_id=payload.patient_id,
        exercise_name=payload.exercise_name,
        exercise_id=payload.exercise_id,
        ttl_seconds=3600
    )
    
    return JSONResponse({
        "status": "success",
        "token": token
    })
