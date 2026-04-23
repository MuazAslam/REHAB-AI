from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import db_connection
from pydantic import BaseModel


data_routes = APIRouter()


class DailyActivityInput(BaseModel):
    user_id: str
    mood: int
    sleep_hours: float
    fatigue_level: int

@data_routes.post("/api/activity/save")
async def save_daily_activity_route(payload: DailyActivityInput):
    success = db_connection.save_daily_activity(
        payload.user_id,
        payload.mood,
        payload.sleep_hours,
        payload.fatigue_level
    )

    if success:
        return JSONResponse({"status": "success"})
    else:
        return JSONResponse({"status": "error"}, status_code=500)


@data_routes.get("/api/activity/today/{user_id}")
async def get_today_activity_route(user_id: str):
    data = db_connection.get_today_activity(user_id)
    
    if data:
        return JSONResponse({"status": "success", "data": data})
    else:
        # Return default/empty values so frontend knows no data exists yet
        return JSONResponse({"status": "success", "data": None})


@data_routes.get("/api/patients/{doctor_id}")
async def get_patients_route(doctor_id: str):
    """Get all patients assigned to a specific doctor"""
    patients = db_connection.get_doctor_patients(doctor_id)

    return JSONResponse({
        "status": "success",
        "patients": patients,
        "count": len(patients)
    })


# Exercise Management Routes
class ExerciseAssignmentInput(BaseModel):
    patient_id: str
    doctor_id: str
    exercises: list  # List of {exercise_id, duration_minutes}


@data_routes.get("/api/exercises")
async def get_exercises_route():
    """Get all available exercises"""
    exercises = db_connection.get_all_exercises()
    
    return JSONResponse({
        "status": "success",
        "exercises": exercises,
        "count": len(exercises)
    })


@data_routes.post("/api/assign-exercise")
async def assign_exercise_route(payload: ExerciseAssignmentInput):
    """Assign exercises to a patient"""
    success = db_connection.assign_exercise_to_patient(
        payload.patient_id,
        payload.doctor_id,
        payload.exercises
    )
    
    if success:
        return JSONResponse({"status": "success", "message": "Exercises assigned successfully"})
    else:
        return JSONResponse({"status": "error", "message": "Failed to assign exercises"}, status_code=500)


@data_routes.get("/api/patient-exercises/{patient_id}")
async def get_patient_exercises_route(patient_id: str):
    exercises = db_connection.get_patient_exercises(patient_id)

    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            "exercises": exercises,
            "count": len(exercises)
        })
    )


@data_routes.get("/api/patient-exercises-advanced/{patient_id}")
async def get_patient_exercises_advanced_route(patient_id: str):
    """
    Advanced endpoint with DSA optimizations:
    - Returns exercises grouped by date (Today, Yesterday, older dates)
    - Automatically detects and marks overdue exercises
    - Priority sorted (pending first, then completed, then missed)
    """
    grouped_exercises = db_connection.get_patient_exercises_advanced(patient_id)
    
    total_count = sum(len(exercises) for exercises in grouped_exercises.values())

    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            "grouped_exercises": grouped_exercises,
            "total_count": total_count,
            "groups": list(grouped_exercises.keys())
        })
    )


class CompleteExerciseInput(BaseModel):
    patient_id: str
    exercise_id: str
    pain_feedback: dict = None  # Optional pain feedback


@data_routes.post("/api/complete-exercise")
async def complete_exercise_route(payload: CompleteExerciseInput):
    """Mark an exercise as completed with optional pain feedback"""
    success = db_connection.complete_exercise(
        payload.patient_id,
        payload.exercise_id,
        payload.pain_feedback
    )
    
    if success:
        return JSONResponse({"status": "success", "message": "Exercise completed successfully"})
    else:
        return JSONResponse({"status": "error", "message": "Failed to complete exercise or exercise not found"}, status_code=400)


@data_routes.get("/api/patient-pain-history/{patient_id}")
async def get_patient_pain_history_route(patient_id: str):
    """Get pain history with recovery status for all body parts"""
    pain_history = db_connection.get_patient_pain_history(patient_id)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            "pain_history": pain_history,
            "count": len(pain_history)
        })
    )


@data_routes.get("/api/recovery-metrics/{user_id}")
async def get_recovery_metrics_route(user_id: str, days: int = 30):
    """Get comprehensive recovery metrics with trend analysis"""
    metrics = db_connection.get_recovery_metrics(user_id, days)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            **metrics
        })
    )


@data_routes.get("/api/patient/performance/{user_id}")
async def get_performance_route(user_id: str, exercise: str = None):
    try:
        data = db_connection.get_patient_exercise_performance(user_id, exercise)
        return JSONResponse({
            "status": "success",
            "data": data
        })
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@data_routes.get("/api/patient/reports/{user_id}")
async def get_patient_reports_route(user_id: str):
    try:
        data = db_connection.get_patient_overall_reports(user_id)
        if data:
             return JSONResponse({"status": "success", "data": data})
        else:
             return JSONResponse({"status": "error", "message": "No data found or error"}, status_code=404)
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@data_routes.get("/api/users/{user_id}")
async def get_user_by_id_route(user_id: str):
    """Get user information by user_id"""
    try:
        user = db_connection.get_user_by_id(user_id)
        if user:
            return JSONResponse({"status": "success", "user": user})
        else:
            return JSONResponse({"status": "error", "message": "User not found"}, status_code=404)
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
