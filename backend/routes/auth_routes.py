# routes/auth_routes.py
from fastapi import APIRouter, UploadFile, Form, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED
from pathlib import Path
import uuid
import db_connection

# from .murf_tts import generate_murf_audio

auth_routes = APIRouter()

# Always resolve project root safely
BASE_DIR = Path(__file__).resolve().parent.parent  # go up to project root
UPLOAD_FOLDER = BASE_DIR / "static" / "profile_pics"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)  # create if not exists

# ---------------- LOGIN -----------------
@auth_routes.post("/api/login")
async def login(username: str = Form(...), password: str = Form(...)):
    user = db_connection.authenticate_user(username, password)

    if not user:
        return JSONResponse(
            status_code=HTTP_401_UNAUTHORIZED,
            content={"status": "error", "message": "Invalid credentials"},
        )

    # Base response (common fields)
    user_response = {
        "user_id": user[0],
        "user_name": user[1],
        "user_email": user[2],
        "user_image": user[3],
        "user_role": user[4],
        "user_gender": user[5],
    }

    # If patient → add extra fields
    if user[4] == "Patient":
        user_response.update({
            "user_weight": user[6],
            "user_height": user[7],
            "user_age": user[8],
            "user_joined_on": user[9],
            "user_therapist": user[10],
        })

    return JSONResponse(
        status_code=HTTP_200_OK,
        content={
            "status": "success",
            "user": user_response,
        },
    )


# ---------------- SIGNUP -----------------
@auth_routes.post("/api/signup")
async def signup(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    weight: float = Form(...),
    height: float = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    profile_picture: UploadFile = File(None),
):
    filename = None


    if profile_picture:
        # Create safe unique filename
        unique_prefix = uuid.uuid4().hex
        secure_name = profile_picture.filename.replace(" ", "_")
        filename = f"{unique_prefix}_{secure_name}"

        # FULL PATH inside static/profile_pics folder
        filepath = UPLOAD_FOLDER / filename

        # Save file
        with open(filepath, "wb") as f:
            f.write(await profile_picture.read())
    else:
        filename = "placeholder-user.png"
    # Save user in DB
    user = db_connection.register_user(
        name=name,
        email=email,
        password=password,
        profile_picture_filename=filename,
        weight=weight,
        height=height,
        age=age,
        gender=gender,
    )

    # Responses
    if user == True:
        return JSONResponse(status_code=HTTP_200_OK, content={"status": "success"})
    elif user == "User_Exist":
        return JSONResponse(status_code=HTTP_200_OK, content={"status": "Duplicate"})
    else:
        return JSONResponse(status_code=HTTP_401_UNAUTHORIZED, content={"status": "error"})
