
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.services.prediction_service import (
    get_model_status,
    predict_co,
    get_validated_model_status,
    get_validated_model_metrics,
    get_validated_feature_columns,
    predict_co_validated,
)

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


# --------------------------------------------------
# EXISTING 17-FEATURE MODEL INPUT
# --------------------------------------------------

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


# --------------------------------------------------
# VALIDATED 21-FEATURE MODEL INPUT
# --------------------------------------------------

class ValidatedForecastInput(BaseModel):
    PT08_S1_CO: float | None = Field(default=None, alias="PT08.S1(CO)")
    C6H6_GT: float | None = Field(default=None, alias="C6H6(GT)")
    PT08_S2_NMHC: float | None = Field(default=None, alias="PT08.S2(NMHC)")
    nox_gt: float | None = Field(default=None, alias="NOx(GT)")
    PT08_S3_NOx: float | None = Field(default=None, alias="PT08.S3(NOx)")
    no2_gt: float | None = Field(default=None, alias="NO2(GT)")
    PT08_S4_NO2: float | None = Field(default=None, alias="PT08.S4(NO2)")
    PT08_S5_O3: float | None = Field(default=None, alias="PT08.S5(O3)")

    T: float | None = None
    RH: float | None = None
    AH: float | None = None

    CO_lag_1: float | None = None
    CO_lag_2: float | None = None
    CO_lag_3: float | None = None
    CO_lag_24: float | None = None

    Hour_sin: float | None = None
    Hour_cos: float | None = None
    Day_sin: float | None = None
    Day_cos: float | None = None
    Month_sin: float | None = None
    Month_cos: float | None = None


# --------------------------------------------------
# EXISTING MODEL ENDPOINTS — PRESERVED
# --------------------------------------------------

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
        prediction = predict_co(
            input_data.model_dump(by_alias=True)
        )

        return {
            "predicted_CO": round(prediction, 4),
            "unit": "mg/m^3",
            "forecast_horizon": "1 hour ahead",
            "model": "Random Forest",
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# --------------------------------------------------
# NEW VALIDATED MODEL ENDPOINTS
# --------------------------------------------------

@router.get("/validated/status")
def validated_forecast_status():
    if not get_validated_model_status():
        return {
            "model_loaded": False,
            "message": "Validated forecasting model is not available."
        }

    return {
        "model_loaded": True,
        "forecast_horizon": "1 hour ahead",
        "target": "CO(GT)",
        "feature_count": len(get_validated_feature_columns()),
        "model": "Validated Random Forest Regressor",
        "evaluation_metrics": get_validated_model_metrics(),
    }


@router.post("/validated/predict")
def validated_forecast(input_data: ValidatedForecastInput):
    if not get_validated_model_status():
        raise HTTPException(
            status_code=503,
            detail="Validated forecasting model is not available.",
        )

    try:
        prediction = predict_co_validated(
            input_data.model_dump(by_alias=True)
        )

        return {
            "predicted_CO": round(prediction, 4),
            "unit": "mg/m^3",
            "forecast_horizon": "1 hour ahead",
            "model": "Validated Random Forest Regressor",
            "evaluation_metrics": get_validated_model_metrics(),
        }

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
