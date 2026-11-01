
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import Base, engine
from backend.app import models
from backend.app.routes.forecast import router as forecast_router
from backend.app.routes.analytics import router as analytics_router


app = FastAPI(
    title="AirWise API",
    description="Air Quality Intelligence and Pollution Forecasting Platform",
    version="1.0.0"
)


# Frontend URLs allowed to communicate with the API.
# Configure CORS_ORIGINS in Render after deploying the frontend.
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173"
)

allowed_origins = [
    origin.strip()
    for origin in origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables
Base.metadata.create_all(bind=engine)


# Register API routes
app.include_router(forecast_router)
app.include_router(analytics_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to AirWise API",
        "status": "running",
        "project": "Air Quality Intelligence and Pollution Forecasting Platform"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "AirWise"
    }
