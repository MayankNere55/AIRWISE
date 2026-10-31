from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.services.prediction_service import (
    get_model_status,
    predict_co,
)

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


class ForecastInput(BaseModel):
    CO_Lag_1: float
    CO_Lag_2: float
    CO_Lag_3: float
    CO_Lag_24: float

    PT08_S1_CO: float = Field(alias="PT08.S1(CO)")
    PT08_S2_NMHC: float = Field(alias="PT08.S2(NMHC)")
    PT08_S3_NOx: float = Field(alias="PT08.S3(NOx)")
    PT08_S4_NO2: float = Field(alias="PT08.S4(NO2)")
    PT08_S5_O3: float = Field(alias="PT08.S5(O3)")

    T: float
    RH: float
    AH: float

    Hour: int = Field(ge=0, le=23)
    DayOfWeek: int = Field(ge=0, le=6)
    Month: int = Field(ge=1, le=12)

    Hour_Sin: float
    Hour_Cos: float


@router.get("/status")
def forecast_status():
    return {
        "model_loaded": get_model_status(),
        "forecast_horizon": "1 hour ahead",
        "target": "CO(GT)",
        "feature_count": 17,
    }


@router.post("/predict")
def forecast(input_data: ForecastInput):
    if not get_model_status():
        raise HTTPException(
            status_code=503,
            detail="Forecasting model is not available.",
        )

    try:
        prediction = predict_co(input_data.model_dump(by_alias=True))

        return {
            "predicted_CO": round(prediction, 4),
            "unit": "mg/m^3",
            "forecast_horizon": "1 hour ahead",
            "model": "Random Forest",
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))