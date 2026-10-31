import pandas as pd

from pathlib import Path

from backend.app.database import Base, engine, SessionLocal
from backend.app.models import PollutionRecord


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = PROJECT_ROOT / "data" / "processed" / "airwise_cleaned.csv"


COLUMN_MAPPING = {
    "CO(GT)": "co_gt",
    "C6H6(GT)": "c6h6_gt",
    "NOx(GT)": "nox_gt",
    "NO2(GT)": "no2_gt",
    "PT08.S1(CO)": "pt08_s1_co",
    "PT08.S2(NMHC)": "pt08_s2_nmhc",
    "PT08.S3(NOx)": "pt08_s3_nox",
    "PT08.S4(NO2)": "pt08_s4_no2",
    "PT08.S5(O3)": "pt08_s5_o3",
    "T": "temperature",
    "RH": "relative_humidity",
    "AH": "absolute_humidity",
}


def import_data():

    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)

    df["Datetime"] = pd.to_datetime(
        df["Datetime"],
        errors="coerce"
    )

    df = df.dropna(subset=["Datetime"])

    db = SessionLocal()

    try:

        existing_count = db.query(PollutionRecord).count()

        if existing_count > 0:
            print(f"Import cancelled. Database already contains {existing_count} records.")
            return

        records = []

        for _, row in df.iterrows():

            record_data = {
                "recorded_at": row["Datetime"].to_pydatetime()
            }

            for csv_column, db_column in COLUMN_MAPPING.items():

                value = row[csv_column]

                record_data[db_column] = (
                    None if pd.isna(value) else float(value)
                )

            records.append(PollutionRecord(**record_data))

        db.add_all(records)
        db.commit()

        print("Dataset imported successfully!")
        print("Total records imported:", len(records))

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":

    Base.metadata.create_all(bind=engine)

    import_data()