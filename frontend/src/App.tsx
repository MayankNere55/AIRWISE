
import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

interface Summary {
  total_records: number;
  first_record: string;
  last_record: string;
  average_pollutants: {
    co_gt: number;
    nox_gt: number;
    no2_gt: number;
    c6h6_gt: number;
  };
}

interface Trend {
  timestamp: string;
  co_gt: number | null;
  nox_gt: number | null;
  no2_gt: number | null;
}

interface PollutantItem {
  average?: number;
  valid_observations?: number;
}

interface PollutantStats {
  co_gt: PollutantItem;
  nox_gt: PollutantItem;
  no2_gt: PollutantItem;
  c6h6_gt: PollutantItem;
}

interface WeatherStats {
  temperature: {
    average?: number;
    avg?: number;
    mean?: number;
    min?: number;
    minimum?: number;
    max?: number;
    maximum?: number;
  };
  relative_humidity: {
    average?: number;
    avg?: number;
    mean?: number;
  };
  absolute_humidity: {
    average?: number;
    avg?: number;
    mean?: number;
  };
}

interface ForecastResult {
  predicted_CO: number;
  unit: string;
  forecast_horizon: string;
  model: string;
}

const initialInputs: Record<string, number> = {
  CO_Lag_1: 2,
  CO_Lag_2: 2,
  CO_Lag_3: 2,
  CO_Lag_24: 2,
  "PT08.S1(CO)": 1100,
  "PT08.S2(NMHC)": 900,
  "PT08.S3(NOx)": 900,
  "PT08.S4(NO2)": 1500,
  "PT08.S5(O3)": 1000,
  T: 18,
  RH: 50,
  AH: 1,
  Hour: 12,
  DayOfWeek: 1,
  Month: 6,
  Hour_Sin: 0,
  Hour_Cos: 1,
};

function getNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return null;
}

function displayNumber(value: number | null, decimals = 2): string {
  return value === null ? "N/A" : value.toFixed(decimals);
}

function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [pollutants, setPollutants] = useState<PollutantStats | null>(null);
  const [weather, setWeather] = useState<WeatherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [forecastInputs, setForecastInputs] = useState(initialInputs);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [s, t, p, w] = await Promise.all([
          fetch(`${API}/api/analytics/summary`),
          fetch(`${API}/api/analytics/trends`),
          fetch(`${API}/api/analytics/pollutants`),
          fetch(`${API}/api/analytics/weather`),
        ]);

        if (![s, t, p, w].every((response) => response.ok)) {
          throw new Error("Could not load dashboard data.");
        }

        const [summaryData, trendData, pollutantData, weatherData] =
          await Promise.all([
            s.json(),
            t.json(),
            p.json(),
            w.json(),
          ]);

        setSummary(summaryData);
        setTrends(trendData.trends ?? []);
        setPollutants(
          pollutantData.pollutants ?? pollutantData
        );

        // Normalize different possible API response structures.
        const weatherRoot = weatherData.weather ?? weatherData;

        setWeather({
          temperature: weatherRoot.temperature ?? {
            average:
              weatherRoot.average_temperature ??
              weatherRoot.avg_temperature,
            min: weatherRoot.min_temperature,
            max: weatherRoot.max_temperature,
          },
          relative_humidity: weatherRoot.relative_humidity ?? {
            average:
              weatherRoot.average_relative_humidity ??
              weatherRoot.avg_relative_humidity,
          },
          absolute_humidity: weatherRoot.absolute_humidity ?? {
            average:
              weatherRoot.average_absolute_humidity ??
              weatherRoot.avg_absolute_humidity,
          },
        });
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(
          "Unable to load dashboard data. Please check the backend API."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function updateForecastInput(name: string, value: string) {
    setForecastInputs((previous) => ({
      ...previous,
      [name]: Number(value),
    }));
  }

  async function predictCO(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForecastLoading(true);
    setForecastError("");
    setForecast(null);

    try {
      const response = await fetch(`${API}/api/forecast/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(forecastInputs),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail?.[0]?.msg || "Prediction failed."
        );
      }

      setForecast(result);
    } catch (err) {
      setForecastError(
        err instanceof Error
          ? err.message
          : "Could not generate prediction."
      );
    } finally {
      setForecastLoading(false);
    }
  }

  const chartData = trends
    .filter((item) => item.co_gt !== null)
    .slice(0, 120);

  const maxCO = Math.max(
    1,
    ...chartData.map((item) => item.co_gt ?? 0)
  );

  const fields = [
    { name: "CO_Lag_1", label: "CO one hour ago", unit: "mg/m³" },
    { name: "CO_Lag_2", label: "CO two hours ago", unit: "mg/m³" },
    { name: "CO_Lag_3", label: "CO three hours ago", unit: "mg/m³" },
    { name: "CO_Lag_24", label: "CO 24 hours ago", unit: "mg/m³" },
    { name: "PT08.S1(CO)", label: "Sensor S1 — CO", unit: "sensor units" },
    { name: "PT08.S2(NMHC)", label: "Sensor S2 — NMHC", unit: "sensor units" },
    { name: "PT08.S3(NOx)", label: "Sensor S3 — NOx", unit: "sensor units" },
    { name: "PT08.S4(NO2)", label: "Sensor S4 — NO2", unit: "sensor units" },
    { name: "PT08.S5(O3)", label: "Sensor S5 — O3", unit: "sensor units" },
    { name: "T", label: "Temperature", unit: "°C" },
    { name: "RH", label: "Relative humidity", unit: "%" },
    { name: "AH", label: "Absolute humidity", unit: "g/m³" },
    { name: "Hour", label: "Hour of day (0–23)", unit: "" },
    { name: "DayOfWeek", label: "Day of week (0–6)", unit: "" },
    { name: "Month", label: "Month (1–12)", unit: "" },
    { name: "Hour_Sin", label: "Hour sine feature", unit: "" },
    { name: "Hour_Cos", label: "Hour cosine feature", unit: "" },
  ];

  const temperatureAverage = getNumber(
    weather?.temperature?.average,
    weather?.temperature?.avg,
    weather?.temperature?.mean
  );

  const temperatureMin = getNumber(
    weather?.temperature?.min,
    weather?.temperature?.minimum
  );

  const temperatureMax = getNumber(
    weather?.temperature?.max,
    weather?.temperature?.maximum
  );

  const humidityAverage = getNumber(
    weather?.relative_humidity?.average,
    weather?.relative_humidity?.avg,
    weather?.relative_humidity?.mean
  );

  const absoluteHumidityAverage = getNumber(
    weather?.absolute_humidity?.average,
    weather?.absolute_humidity?.avg,
    weather?.absolute_humidity?.mean
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <h2>AirWise</h2>
            <span>INTELLIGENCE PLATFORM</span>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav>
          <a href="#overview">▦ Overview</a>
          <a href="#pollution">◈ Pollution Analytics</a>
          <a href="#weather">☁ Weather Analytics</a>
          <a href="#forecast">⌁ Forecast Center</a>
        </nav>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          <span>System status</span>
          <strong>AirWise API</strong>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>WORKSPACE / OVERVIEW</span>
          <span className="dataset-tag">UCI HISTORICAL DATASET</span>
        </header>

        <section id="overview" className="page-heading">
          <div>
            <p className="eyebrow">AIR QUALITY INTELLIGENCE</p>
            <h1>Air Quality Dashboard</h1>
            <p>
              Monitor, analyze and understand historical air quality data.
            </p>
          </div>
          <div className="year-tag">2004 — 2005</div>
        </section>

        {loading && (
          <p className="info-message">Loading AirWise data...</p>
        )}

        {error && <p className="error-message">{error}</p>}

        {summary && (
          <section className="stats-grid">
            <article className="stat-card">
              <span>TOTAL OBSERVATIONS</span>
              <h2>{summary.total_records.toLocaleString()}</h2>
              <p>Historical records</p>
            </article>

            <article className="stat-card">
              <span>AVERAGE CO</span>
              <h2>
                {displayNumber(
                  getNumber(summary.average_pollutants?.co_gt)
                )}
              </h2>
              <p>mg/m³</p>
            </article>

            <article className="stat-card">
              <span>AVERAGE NOx</span>
              <h2>
                {displayNumber(
                  getNumber(summary.average_pollutants?.nox_gt)
                )}
              </h2>
              <p>µg/m³</p>
            </article>

            <article className="stat-card">
              <span>AVERAGE NO2</span>
              <h2>
                {displayNumber(
                  getNumber(summary.average_pollutants?.no2_gt)
                )}
              </h2>
              <p>µg/m³</p>
            </article>
          </section>
        )}

        <section id="pollution" className="dashboard-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DATA EXPLORATION</p>
              <h2>Pollution analytics</h2>
              <p>
                Explore pollutant behaviour across recorded observations.
              </p>
            </div>
          </div>

          <div className="analytics-grid">
            <article className="panel chart-panel">
              <h3>Carbon monoxide trend</h3>
              <p className="panel-subtitle">
                First 120 available historical observations
              </p>

              <div className="chart">
                {chartData.map((item, index) => (
                  <div
                    className="chart-bar"
                    key={`${item.timestamp}-${index}`}
                    title={`${item.timestamp}: ${item.co_gt} mg/m³`}
                    style={{
                      height: `${Math.max(
                        3,
                        ((item.co_gt ?? 0) / maxCO) * 100
                      )}%`,
                    }}
                  />
                ))}
              </div>

              <p className="chart-caption">
                Historical sequence · {chartData.length} observations plotted
              </p>
            </article>

            <article className="panel">
              <h3>Pollutant comparison</h3>
              <p className="panel-subtitle">
                Average measured concentrations
              </p>

              {pollutants &&
                Object.entries(pollutants).map(([name, item]) => (
                  <div className="pollutant-row" key={name}>
                    <div>
                      <strong>{name.toUpperCase()}</strong>
                      <span>
                        {displayNumber(getNumber(item.average))}
                      </span>
                    </div>
                    <p>
                      {(
                        item.valid_observations ?? 0
                      ).toLocaleString()}{" "}
                      valid observations
                    </p>
                  </div>
                ))}
            </article>
          </div>
        </section>

        <section id="weather" className="dashboard-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ENVIRONMENTAL CONDITIONS</p>
              <h2>Weather analytics</h2>
              <p>
                Environmental conditions recorded by the dataset.
              </p>
            </div>
          </div>

          {weather && (
            <div className="weather-grid">
              <article className="panel weather-card">
                <span>AVERAGE TEMPERATURE</span>
                <h2>{displayNumber(temperatureAverage)} °C</h2>
                <p>
                  Range: {displayNumber(temperatureMin)}°C to{" "}
                  {displayNumber(temperatureMax)}°C
                </p>
              </article>

              <article className="panel weather-card">
                <span>RELATIVE HUMIDITY</span>
                <h2>{displayNumber(humidityAverage)}%</h2>
                <p>Average recorded humidity</p>
              </article>

              <article className="panel weather-card">
                <span>ABSOLUTE HUMIDITY</span>
                <h2>{displayNumber(absoluteHumidityAverage)}</h2>
                <p>Average recorded absolute humidity</p>
              </article>
            </div>
          )}
        </section>

        <section id="forecast" className="dashboard-section forecast-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MACHINE LEARNING</p>
              <h2>AirWise Forecast Center</h2>
              <p>
                Explore one-hour-ahead carbon monoxide predictions powered by
                the trained Random Forest model.
              </p>
            </div>
          </div>

          <article className="panel forecast-panel">
            <div className="forecast-intro">
              <div>
                <span className="forecast-label">
                  RANDOM FOREST REGRESSION
                </span>
                <h3>Predict next-hour carbon monoxide</h3>
                <p>
                  Enter recent sensor and environmental readings. The
                  prefilled values are illustrative, not live sensor
                  measurements.
                </p>
              </div>

              <div className="forecast-symbol">⌁</div>
            </div>

            <form onSubmit={predictCO}>
              <div className="forecast-fields">
                {fields.map((field) => (
                  <label className="forecast-field" key={field.name}>
                    <span>{field.label}</span>

                    <input
                      type="number"
                      step="any"
                      required
                      value={forecastInputs[field.name]}
                      onChange={(event) =>
                        updateForecastInput(
                          field.name,
                          event.target.value
                        )
                      }
                    />

                    {field.unit && <small>{field.unit}</small>}
                  </label>
                ))}
              </div>

              <button
                className="predict-button"
                type="submit"
                disabled={forecastLoading}
              >
                {forecastLoading
                  ? "Generating prediction..."
                  : "Predict CO →"}
              </button>
            </form>

            {forecastError && (
              <p className="error-message">{forecastError}</p>
            )}

            {forecast && (
              <div className="prediction-result">
                <span>ONE-HOUR-AHEAD CO PREDICTION</span>
                <h2>{displayNumber(getNumber(forecast.predicted_CO), 4)}</h2>
                <strong>{forecast.unit}</strong>
                <p>
                  {forecast.forecast_horizon} · {forecast.model}
                </p>
              </div>
            )}
          </article>
        </section>

        <footer>
          AirWise · Air Quality Intelligence Platform
          <span>
            Academic project · Historical research dataset
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
