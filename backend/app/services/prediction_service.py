
import joblib
import pandas as pd
from pathlib import Path

# Locate the AirWise project folder
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Existing model used by the current dashboard
MODEL_PATH = PROJECT_ROOT / "models" / "airwise_co_forecast.joblib"

# Newly validated model with 21 features
VALIDATED_MODEL_PATH = (
    PROJECT_ROOT / "models" / "airwise_co_forecast_validated.joblib"
)

# Load existing model
artifact = None

if MODEL_PATH.exists():
    artifact = joblib.load(MODEL_PATH)

# Load validated model separately
validated_artifact = None

if VALIDATED_MODEL_PATH.exists():
    validated_artifact = joblib.load(VALIDATED_MODEL_PATH)


# Check existing dashboard model
def get_model_status():
    return artifact is not None


# Existing prediction function — preserved for dashboard compatibility
def predict_co(input_data: dict):
    if artifact is None:
        raise RuntimeError(
            "Existing forecasting model not found."
        )

    model = artifact["model"]
    imputer = artifact["imputer"]
    feature_columns = artifact["feature_columns"]

    input_values = [
        [input_data[column] for column in feature_columns]
    ]

    transformed_values = imputer.transform(input_values)
    prediction = model.predict(transformed_values)

    return float(prediction[0])


# Check newly validated model
def get_validated_model_status():
    return validated_artifact is not None


# Get features required by the validated model
def get_validated_feature_columns():
    if validated_artifact is None:
        return []

    return validated_artifact["feature_columns"]


# Get saved evaluation metrics
def get_validated_model_metrics():
    if validated_artifact is None:
        return None

    return validated_artifact.get("test_metrics", {})


# Predict using the newly validated 21-feature model
def predict_co_validated(input_data: dict):
    if validated_artifact is None:
        raise RuntimeError(
            "Validated forecasting model not found."
        )

    feature_columns = validated_artifact["feature_columns"]

    # Check that every required feature has been supplied
    missing_columns = [
        column for column in feature_columns
        if column not in input_data
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required features: {missing_columns}"
        )

    # Preserve the exact feature order used during training
    input_frame = pd.DataFrame(
        [
            {
                column: input_data[column]
                for column in feature_columns
            }
        ],
        columns=feature_columns
    )
    
    # The saved pipeline performs median imputation automatically
    prediction = validated_artifact["model"].predict(input_frame)

    return float(prediction[0])