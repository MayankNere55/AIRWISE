
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import PollutionRecord


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)


# 1. ANALYTICS SUMMARY

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):

    total_records = db.query(PollutionRecord).count()

    date_range = db.query(
        func.min(PollutionRecord.recorded_at),
        func.max(PollutionRecord.recorded_at)
    ).first()

    averages = db.query(
        func.avg(PollutionRecord.co_gt),
        func.avg(PollutionRecord.nox_gt),
        func.avg(PollutionRecord.no2_gt),
        func.avg(PollutionRecord.c6h6_gt)
    ).first()

    return {
        "total_records": total_records,
        "first_record": date_range[0],
        "last_record": date_range[1],
        "average_pollutants": {
            "co_gt": averages[0],
            "nox_gt": averages[1],
            "no2_gt": averages[2],
            "c6h6_gt": averages[3]
        }
    }


# 2. POLLUTION TRENDS

@router.get("/trends")
def get_pollution_trends(db: Session = Depends(get_db)):

    records = (
        db.query(PollutionRecord)
        .order_by(PollutionRecord.recorded_at)
        .all()
    )

    trends = []

    for record in records:
        trends.append({
            "recorded_at": record.recorded_at,
            "co_gt": record.co_gt,
            "nox_gt": record.nox_gt,
            "no2_gt": record.no2_gt
        })

    return {
        "total_records": len(trends),
        "trends": trends
    }


# 3. POLLUTANT STATISTICS

@router.get("/pollutants")
def get_pollutant_statistics(db: Session = Depends(get_db)):

    pollutants = {
        "co_gt": PollutionRecord.co_gt,
        "nox_gt": PollutionRecord.nox_gt,
        "no2_gt": PollutionRecord.no2_gt,
        "c6h6_gt": PollutionRecord.c6h6_gt
    }

    results = {}

    for name, column in pollutants.items():

        statistics = db.query(
            func.avg(column),
            func.min(column),
            func.max(column),
            func.count(column)
        ).first()

        results[name] = {
            "average": statistics[0],
            "minimum": statistics[1],
            "maximum": statistics[2],
            "valid_observations": statistics[3]
        }

    return {
        "pollutants": results
    }


# 4. WEATHER ANALYTICS

@router.get("/weather")
def get_weather_analytics(db: Session = Depends(get_db)):

    weather_statistics = db.query(
        func.avg(PollutionRecord.temperature),
        func.min(PollutionRecord.temperature),
        func.max(PollutionRecord.temperature),
        func.avg(PollutionRecord.relative_humidity),
        func.avg(PollutionRecord.absolute_humidity),
        func.count(PollutionRecord.temperature)
    ).first()

    return {
        "weather": {
            "temperature": {
                "average": weather_statistics[0],
                "minimum": weather_statistics[1],
                "maximum": weather_statistics[2]
            },
            "relative_humidity": {
                "average": weather_statistics[3]
            },
            "absolute_humidity": {
                "average": weather_statistics[4]
            },
            "valid_temperature_observations": weather_statistics[5]
        }
    }
