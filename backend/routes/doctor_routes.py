from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import db_connection

doctor_routes = APIRouter()


@doctor_routes.get("/api/doctor-overview/{doctor_id}")
async def get_doctor_overview_route(doctor_id: str):
    """
    Get doctor overview statistics
    Returns: total patients, active patients, at-risk patients, improving patients
    """
    stats = db_connection.get_doctor_overview_stats(doctor_id)
    
    return JSONResponse({
        "status": "success",
        **stats
    })


@doctor_routes.get("/api/doctor-alerts/{doctor_id}")
async def get_doctor_alerts_route(doctor_id: str):
    """
    Get critical alerts for all patients (uses min-heap priority queue)
    Returns: prioritized alerts with severity levels
    """
    alerts_data = db_connection.get_doctor_critical_alerts(doctor_id)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            **alerts_data
        })
    )


@doctor_routes.get("/api/doctor-exercise-compliance/{doctor_id}")
async def get_doctor_exercise_compliance_route(doctor_id: str, days: int = 30):
    """
    Get exercise compliance metrics across all patients
    Returns: completion rate, pending/completed/missed counts, trend data
    """
    compliance_data = db_connection.get_doctor_exercise_compliance(doctor_id, days)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            **compliance_data
        })
    )


@doctor_routes.get("/api/doctor-pain-overview/{doctor_id}")
async def get_doctor_pain_overview_route(doctor_id: str):
    """
    Get pain management overview across all patients
    Returns: active/recovering/recovered counts, common pain locations
    """
    pain_data = db_connection.get_doctor_pain_overview(doctor_id)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            **pain_data
        })
    )


@doctor_routes.get("/api/doctor-patient-risks/{doctor_id}")
async def get_doctor_patient_risks_route(doctor_id: str):
    """
    Get patient risk stratification (sorted by risk score)
    Returns: patients sorted by risk with comprehensive metrics
    """
    risk_data = db_connection.get_doctor_patient_risk_stratification(doctor_id)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            **risk_data
        })
    )


@doctor_routes.get("/api/doctor-recovery-trends/{doctor_id}")
async def get_doctor_recovery_trends_route(doctor_id: str, days: int = 7, view_mode: str = "cohort"):
    """
    Get recovery score trends over time
    view_mode: "cohort" for average, "patient_wise" for individual patient trends
    """
    trend_data = db_connection.get_doctor_recovery_trends(doctor_id, days, view_mode)
    
    return JSONResponse(
        content=jsonable_encoder({
            "status": "success",
            **trend_data
        })
    )
