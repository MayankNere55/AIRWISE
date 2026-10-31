# AirWise — Air Quality Intelligence and Pollution Forecasting Platform

AirWise is a data science and visualization project designed to analyze historical air quality data, explore pollutant patterns, and predict next-hour carbon monoxide (CO) concentrations using machine learning.

The project combines data analysis, interactive visualizations, a machine learning forecasting model, and a web-based dashboard into one platform.

## Project Overview

Air pollution is an important environmental concern. Understanding historical pollutant patterns and forecasting pollutant concentrations can help demonstrate how data science and machine learning can support environmental monitoring.

AirWise provides:
- Historical air quality data analysis
- Pollutant statistics and comparisons
- Temperature and humidity analysis
- Interactive web dashboard
- Next-hour CO prediction using Random Forest Regression
- REST API built with FastAPI

## Key Features

### 1. Data Analysis
- Data cleaning and preprocessing
- Missing-value treatment
- Exploratory Data Analysis (EDA)
- Statistical summaries
- Time-based feature engineering

### 2. Interactive Dashboard
- Total historical records
- Average pollutant measurements
- Pollutant trend visualization
- Pollutant comparisons
- Weather and environmental statistics

### 3. Machine Learning Forecasting
- Random Forest Regression
- Historical CO lag features
- Time-based input features
- Next-hour CO prediction
- Model evaluation against a persistence baseline

### 4. Backend API
- FastAPI application
- SQLite database
- Historical analytics endpoints
- Forecast prediction endpoint
- Interactive API documentation

## Technology Stack

| Category | Technologies |
|---|---|
| Programming | Python, TypeScript |
| Data Analysis | Pandas, NumPy |
| Visualization | Matplotlib, Seaborn, Plotly |
| Machine Learning | Scikit-learn |
| Backend | FastAPI, SQLAlchemy |
| Database | SQLite |
| Frontend | React, Vite |
| Development | Jupyter Notebook, VS Code, Git |

## Dataset

This project uses the **UCI Air Quality Dataset**.

- Source: UCI Machine Learning Repository
- Location represented: Italy
- Period: March 2004 – April 2005
- Original observations: approximately 9,358 hourly records
- Measurements include carbon monoxide, nitrogen oxides, nitrogen dioxide, benzene, sensor readings, temperature, and humidity.

**Important:** This is historical data from Italy, not live air-quality data from Pune or another Indian city.

Dataset citation:

Vito, S. (2008). *Air Quality* [Dataset]. UCI Machine Learning Repository.  
https://doi.org/10.24432/C59K5F

## Machine Learning Model

AirWise uses a Random Forest Regressor to estimate the next-hour carbon monoxide concentration.

**Prediction target:** CO(GT)

**Forecast horizon:** One hour ahead

**Input features include:**
- Recent CO measurements and lag values
- Air-quality sensor readings
- Temperature
- Relative humidity
- Absolute humidity
- Hour, day of week, and month
- Cyclical time features

The prediction is a model estimate based on the supplied input values. It is not a live sensor measurement.

## Project Structure

```text
AIRWISE/
│
├── backend/
│   └── app/
│       ├── routes/
│       ├── schemas/
│       ├── services/
│       ├── main.py
│       ├── database.py
│       └── models.py
│
├── data/
│   ├── raw/
│   ├── interim/
│   ├── processed/
│   └── airwise.db
│
├── docs/
├── frontend/
│   └── src/
├── models/
├── notebooks/
├── src/
├── visualizations/
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd AIRWISE
```

### 2. Create a Python virtual environment

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Start the backend

From the project root:

```bash
python -m uvicorn backend.app.main:app --reload
```

Backend:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 5. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

http://localhost:5173

## API Endpoints

| Endpoint | Description |
|---|---|
| `/` | API welcome message |
| `/health` | Health check |
| `/api/analytics/summary` | Historical dataset summary |
| `/api/analytics/trends` | Pollutant trends |
| `/api/analytics/pollutants` | Pollutant statistics |
| `/api/analytics/weather` | Weather statistics |
| `/api/forecast/status` | Model status |
| `/api/forecast/predict` | Next-hour CO prediction |

## Limitations

- The dataset contains historical measurements from Italy.
- The platform does not currently use live air-quality sensors.
- Forecast accuracy depends on the quality and availability of input data.
- The model estimates CO concentration only; it does not forecast every pollutant.
- Historical trends should not be interpreted as current local air-quality conditions.

## Future Enhancements

- Integration with live air-quality APIs and sensors
- Location-based air-quality monitoring
- Forecasting for additional pollutants
- Model comparison and hyperparameter tuning
- AQI calculation and visualization
- Deployment to a cloud platform
- Automated data updates

## Project Purpose

AirWise was developed as a Data Science and Visualization project to demonstrate practical skills in data preprocessing, exploratory analysis, machine learning, API development, database integration, and interactive dashboard development.

---

**Project:** AirWise — Air Quality Intelligence and Pollution Forecasting Platform  
**Domain:** Data Science, Machine Learning, Environmental Analytics  
**Model:** Random Forest Regression