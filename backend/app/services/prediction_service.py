import joblib
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "models" / "airwise_co_forecast.joblib"

artifact = None

if MODEL_PATH.exists():
    artifact = joblib.load(MODEL_PATH)


def get_model_status():
    return artifact is not None


def predict_co(input_data: dict):
    if artifact is None:
        raise RuntimeError(
            "Forecasting model not found. Train and save the model first."
        )

    model = artifact["model"]
    imputer = artifact["imputer"]
    feature_columns = artifact["feature_columns"]

    input_values = [[input_data[column] for column in feature_columns]]
    transformed_values = imputer.transform(input_values)
    prediction = model.predict(transformed_values)

    return float(prediction[0])