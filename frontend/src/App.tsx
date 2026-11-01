
import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

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
  min?: number;
  max?: number;
}

interface WeatherStats {
  temperature: {
    average?: number;
    min?: number;
    max?: number;
  };
  relative_humidity: {
    average?: number;
  };
  absolute_humidity: {
    average?: number;
  };
}

interface ForecastResult {
  predicted_CO: number;
  unit: string;
  forecast_horizon: string;
  model: string;
}

interface ValidatedModelStatus {
  model_loaded: boolean;
  forecast_horizon?: string;
  target?: string;
  feature_count?: number;
  model?: string;
  evaluation_metrics?: {
    mae?: number;
    rmse?: number;
    r2?: number;
    mean_residual?: number;
  };
}

// --------------------------------------------------
// EXISTING FORECAST INPUTS
// --------------------------------------------------

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

const fields = [
  {
    name: "CO_Lag_1",
    label: "CO one hour ago",
    unit: "mg/m³",
    group: "CO history",
  },
  {
    name: "CO_Lag_2",
    label: "CO two hours ago",
    unit: "mg/m³",
    group: "CO history",
  },
  {
    name: "CO_Lag_3",
    label: "CO three hours ago",
    unit: "mg/m³",
    group: "CO history",
  },
  {
    name: "CO_Lag_24",
    label: "CO 24 hours ago",
    unit: "mg/m³",
    group: "CO history",
  },
  {
    name: "PT08.S1(CO)",
    label: "Sensor S1 — CO",
    unit: "sensor units",
    group: "Sensor readings",
  },
  {
    name: "PT08.S2(NMHC)",
    label: "Sensor S2 — NMHC",
    unit: "sensor units",
    group: "Sensor readings",
  },
  {
    name: "PT08.S3(NOx)",
    label: "Sensor S3 — NOx",
    unit: "sensor units",
    group: "Sensor readings",
  },
  {
    name: "PT08.S4(NO2)",
    label: "Sensor S4 — NO2",
    unit: "sensor units",
    group: "Sensor readings",
  },
  {
    name: "PT08.S5(O3)",
    label: "Sensor S5 — O3",
    unit: "sensor units",
    group: "Sensor readings",
  },
  {
    name: "T",
    label: "Temperature",
    unit: "°C",
    group: "Weather & time",
  },
  {
    name: "RH",
    label: "Relative humidity",
    unit: "%",
    group: "Weather & time",
  },
  {
    name: "AH",
    label: "Absolute humidity",
    unit: "g/m³",
    group: "Weather & time",
  },
  {
    name: "Hour",
    label: "Hour of day (0–23)",
    unit: "",
    group: "Weather & time",
  },
  {
    name: "DayOfWeek",
    label: "Day of week (0–6)",
    unit: "",
    group: "Weather & time",
  },
  {
    name: "Month",
    label: "Month (1–12)",
    unit: "",
    group: "Weather & time",
  },
  {
    name: "Hour_Sin",
    label: "Hour sine feature",
    unit: "",
    group: "Weather & time",
  },
  {
    name: "Hour_Cos",
    label: "Hour cosine feature",
    unit: "",
    group: "Weather & time",
  },
];

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
}

function formatNumber(value: unknown, decimals = 2): string {
  const number = numberOrNull(value);

  return number === null
    ? "N/A"
    : number.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
}



// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

function App() {
  // Analytics data
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [pollutants, setPollutants] =
    useState<Record<string, PollutantItem> | null>(null);
  const [weather, setWeather] = useState<WeatherStats | null>(null);

  // Dashboard states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState("overview");

  // Validated model performance
  const [validatedStatus, setValidatedStatus] =
    useState<ValidatedModelStatus | null>(null);

  // Existing forecast form states
  const [forecastInputs, setForecastInputs] = useState(initialInputs);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  // --------------------------------------------------
  // LOAD DASHBOARD ANALYTICS AND MODEL STATUS
  // --------------------------------------------------

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoints = [
        `${API}/api/analytics/summary`,
        `${API}/api/analytics/trends`,
        `${API}/api/analytics/pollutants`,
        `${API}/api/analytics/weather`,
      ];

      const responses = await Promise.all(
        endpoints.map((url) => fetch(url))
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error(
          "One or more analytics endpoints returned an error."
        );
      }

      const [
        summaryData,
        trendData,
        pollutantData,
        weatherData,
      ] = await Promise.all(
        responses.map((response) => response.json())
      );

      setSummary(summaryData);
      setTrends(trendData.trends ?? []);
      setPollutants(
        pollutantData.pollutants ?? pollutantData
      );

      // Normalize weather response
      const root = weatherData.weather ?? weatherData;

      setWeather({
        temperature: root.temperature ?? {
          average:
            root.average_temperature ??
            root.avg_temperature,
          min: root.min_temperature,
          max: root.max_temperature,
        },

        relative_humidity:
          root.relative_humidity ?? {
            average:
              root.average_relative_humidity ??
              root.avg_relative_humidity,
          },

        absolute_humidity:
          root.absolute_humidity ?? {
            average:
              root.average_absolute_humidity ??
              root.avg_absolute_humidity,
          },
      });

      // Fetch validated model status independently.
      // A failure here should not stop analytics from loading.
      try {
        const validatedResponse = await fetch(
          `${API}/api/forecast/validated/status`
        );

        if (!validatedResponse.ok) {
          throw new Error(
            "Validated model status endpoint is unavailable."
          );
        }

        const validatedData =
          await validatedResponse.json();

        setValidatedStatus(validatedData);
      } catch (modelError) {
        console.warn(
          "Validated model status could not be loaded:",
          modelError
        );

        setValidatedStatus(null);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        "Unable to load dashboard data. Check that the AirWise backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // --------------------------------------------------
  // SIDEBAR SECTION TRACKING
  // --------------------------------------------------

  useEffect(() => {
    const sections = [
      "overview",
      "pollution",
      "weather",
      "model-performance",
      "forecast",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          )[0];

        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: [0, 0.2, 0.5],
      }
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);

      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  // --------------------------------------------------
  // FORECAST INPUT HANDLING
  // --------------------------------------------------

  function updateForecastInput(
    name: string,
    value: string
  ) {
    setForecastInputs((previous) => ({
      ...previous,
      [name]: value === "" ? 0 : Number(value),
    }));
  }

  // --------------------------------------------------
  // EXISTING FORECAST API
  // --------------------------------------------------

  async function predictCO(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setForecastLoading(true);
    setForecastError("");
    setForecast(null);

    try {
      const response = await fetch(
        `${API}/api/forecast/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(forecastInputs),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(result.detail)
          ? result.detail
              .map(
                (item: { msg?: string }) =>
                  item.msg
              )
              .join(", ")
          : result.detail;

        throw new Error(
          detail || "The prediction request failed."
        );
      }

      setForecast(result);
    } catch (err) {
      setForecastError(
        err instanceof Error
          ? err.message
          : "Could not generate a prediction."
      );
    } finally {
      setForecastLoading(false);
    }
  }

  // --------------------------------------------------
  // CHART DATA PREPARATION
  // --------------------------------------------------

  const chartData = trends
    .filter(
      (item) => numberOrNull(item.co_gt) !== null
    )
    .slice(0, 120);

  const chartValues = chartData.map(
    (item) => item.co_gt as number
  );

  const chartMax = Math.max(1, ...chartValues);
  const chartMin = Math.min(0, ...chartValues);

  const chartPoints = chartValues
    .map((value, index) => {
      const x =
        chartValues.length <= 1
          ? 0
          : (index / (chartValues.length - 1)) * 100;

      const y =
        100 -
        ((value - chartMin) /
          (chartMax - chartMin || 1)) *
          90;

      return `${x},${y}`;
    })
    .join(" ");

  // --------------------------------------------------
  // POLLUTANT DATA
  // --------------------------------------------------

  const pollutantEntries = pollutants
    ? Object.entries(pollutants).filter(
        ([, item]) =>
          item && typeof item === "object"
      )
    : [];

  const maxPollutant = Math.max(
    1,
    ...pollutantEntries.map(
      ([, item]) =>
        numberOrNull(item.average) ?? 0
    )
  );

  // Summary values
  const averageCO =
    summary?.average_pollutants?.co_gt;

  const averageNOx =
    summary?.average_pollutants?.nox_gt;

  const averageNO2 =
    summary?.average_pollutants?.no2_gt;

  // Validated model values
  const metrics = validatedStatus?.evaluation_metrics;

  const modelLoaded =
    validatedStatus?.model_loaded === true;

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const navigation = [
    {
      id: "overview",
      icon: "◫",
      label: "Overview",
    },
    {
      id: "pollution",
      icon: "◈",
      label: "Pollution analytics",
    },
    {
      id: "weather",
      icon: "☼",
      label: "Weather analytics",
    },
    {
      id: "model-performance",
      icon: "↗",
      label: "Model performance",
    },
    {
      id: "forecast",
      icon: "⌁",
      label: "Forecast center",
    },
  ];

  // --------------------------------------------------
  // USER INTERFACE
  // --------------------------------------------------

  return (
    <div className="app-shell">

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside className="sidebar">

        <a
          className="brand"
          href="#overview"
          aria-label="AirWise home"
        >
          <div className="brand-icon">A</div>

          <div className="brand-copy">
            <strong>AirWise</strong>
            <span>INTELLIGENCE PLATFORM</span>
          </div>
        </a>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav
          className="navigation"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-link ${
                activeSection === item.id
                  ? "active"
                  : ""
              }`}
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>

              {activeSection === item.id && (
                <span className="nav-active-mark" />
              )}
            </a>
          ))}
        </nav>

        <div className="sidebar-note">
          <div className="sidebar-note-icon">
            ◉
          </div>

          <div>
            <strong>Research workspace</strong>
            <span>Historical air quality data</span>
          </div>
        </div>

        <div className="sidebar-status">
          <span className="status-dot" />

          <div>
            <strong>API connection</strong>

            <span>
              {error
                ? "Needs attention"
                : loading
                  ? "Connecting…"
                  : "Dashboard connected"}
            </span>
          </div>
        </div>

        <div className="sidebar-footer">
          AIRWISE · ACADEMIC PROJECT
        </div>

      </aside>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="main-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="breadcrumb">
            <span>WORKSPACE</span>

            <span className="breadcrumb-slash">
              /
            </span>

            <strong>
              {navigation
                .find(
                  (item) =>
                    item.id === activeSection
                )
                ?.label.toUpperCase() ??
                "OVERVIEW"}
            </strong>
          </div>

          <div className="topbar-actions">

            <span className="dataset-tag">
              <span className="tag-dot" />
              UCI HISTORICAL DATASET
            </span>

            <button
              className="refresh-button"
              onClick={() =>
                void loadDashboard()
              }
              disabled={loading}
            >
              <span
                className={
                  loading
                    ? "refresh-icon spinning"
                    : "refresh-icon"
                }
              >
                ↻
              </span>

              {loading
                ? "Refreshing"
                : "Refresh data"}
            </button>

          </div>
        </header>

        {/* =========================================
            HERO SECTION
        ========================================= */}

        <section
          id="overview"
          className="hero-section"
        >

          <div className="hero-copy">

            <div className="eyebrow">
              <span className="eyebrow-line" />
              AIR QUALITY INTELLIGENCE
            </div>

            <h1>
              Understand the air.
              <br />
              <span>
                Predict what comes next.
              </span>
            </h1>

            <p>
              Explore historical pollution patterns,
              environmental conditions and
              machine-learning forecasts in one place.
            </p>

            <div className="hero-meta">

              <span className="hero-date">
                ◷ &nbsp; Dataset period: 2004–2005
              </span>

              <span className="hero-separator" />

              <span>
                {summary
                  ? `${summary.total_records.toLocaleString("en-IN")} records`
                  : "Loading records…"}
              </span>

            </div>

          </div>

          <div
            className="hero-art"
            aria-hidden="true"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />

            <div className="hero-globe">
              A
            </div>

            <span className="hero-art-label">
              AIR QUALITY
              <br />
              INTELLIGENCE
            </span>
          </div>

        </section>

        {/* DASHBOARD ERROR */}

        {error && (
          <div
            className="error-banner"
            role="alert"
          >
            <span>!</span>

            <div>
              <strong>
                Dashboard connection issue
              </strong>

              <p>{error}</p>
            </div>

            <button
              onClick={() =>
                void loadDashboard()
              }
            >
              Try again
            </button>
          </div>
        )}

        {/* =========================================
            OVERVIEW METRICS
        ========================================= */}

        <section className="section-block overview-metrics">

          <div className="section-kicker">
            AT A GLANCE
          </div>

          <div className="kpi-grid">

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  TOTAL OBSERVATIONS
                </span>

                <span className="kpi-icon blue">
                  ▤
                </span>
              </div>

              <div className="kpi-value">
                {summary
                  ? summary.total_records.toLocaleString("en-IN")
                  : "—"}
              </div>

              <div className="kpi-foot">
                <span className="metric-indicator blue-indicator" />
                Historical sensor records
              </div>

            </article>

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  AVERAGE CO
                </span>

                <span className="kpi-icon teal">
                  ◉
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(averageCO)}
                <small>mg/m³</small>
              </div>

              <div className="kpi-foot">
                <span className="metric-indicator teal-indicator" />
                Carbon monoxide
              </div>

            </article>

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  AVERAGE NOx
                </span>

                <span className="kpi-icon violet">
                  ⌁
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(averageNOx)}
                <small>µg/m³</small>
              </div>

              <div className="kpi-foot">
                <span className="metric-indicator violet-indicator" />
                Nitrogen oxides
              </div>

            </article>

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  AVERAGE NO₂
                </span>

                <span className="kpi-icon amber">
                  ◈
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(averageNO2)}
                <small>µg/m³</small>
              </div>

              <div className="kpi-foot">
                <span className="metric-indicator amber-indicator" />
                Nitrogen dioxide
              </div>

            </article>

          </div>
        </section>

        {/* =========================================
            POLLUTION ANALYTICS
        ========================================= */}

        <section
          id="pollution"
          className="section-block content-section"
        >

          <div className="section-heading">

            <div>
              <div className="section-kicker">
                DATA EXPLORATION
              </div>

              <h2>
                Pollution analytics
              </h2>

              <p>
                Explore pollutant behaviour across
                the recorded observations.
              </p>
            </div>

            <span className="section-index">
              01 / ANALYTICS
            </span>

          </div>

          <div className="analytics-grid">

            {/* CO TREND CHART */}

            <article className="panel chart-panel">

              <div className="panel-heading">

                <div>
                  <h3>
                    Carbon monoxide trend
                  </h3>

                  <p>
                    Historical sequence · first 120
                    available observations
                  </p>
                </div>

                <span className="chart-legend">
                  <i />
                  CO (mg/m³)
                </span>

              </div>

              {chartData.length > 1 ? (

                <div className="line-chart-wrap">

                  <div className="chart-y-axis">
                    <span>
                      {formatNumber(chartMax, 1)}
                    </span>

                    <span>
                      {formatNumber(chartMax / 2, 1)}
                    </span>

                    <span>0</span>
                  </div>

                  <svg
                    className="line-chart"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Carbon monoxide historical trend chart"
                  >

                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#36d8c2"
                          stopOpacity=".28"
                        />

                        <stop
                          offset="100%"
                          stopColor="#36d8c2"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    <line
                      x1="0"
                      y1="10"
                      x2="100"
                      y2="10"
                      className="chart-gridline"
                    />

                    <line
                      x1="0"
                      y1="55"
                      x2="100"
                      y2="55"
                      className="chart-gridline"
                    />

                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="100"
                      className="chart-gridline"
                    />

                    <polygon
                      points={`0,100 ${chartPoints} 100,100`}
                      className="chart-area-fill"
                    />

                    <polyline
                      points={chartPoints}
                      className="chart-line"
                    />

                  </svg>

                </div>

              ) : (

                <div className="chart-empty">
                  {loading
                    ? "Loading chart data…"
                    : "No chart observations are available."}
                </div>

              )}

              <div className="chart-footer">
                <span>
                  {chartData.length} observations plotted
                </span>

                <span>
                  Historical dataset · hourly records
                </span>
              </div>

            </article>

            {/* POLLUTANT COMPARISON */}

            <article className="panel pollutant-panel">

              <div className="panel-heading">

                <div>
                  <h3>
                    Pollutant comparison
                  </h3>

                  <p>
                    Average measured concentrations
                  </p>
                </div>

                <span className="panel-symbol">
                  ◈
                </span>

              </div>

              <div className="pollutant-list">

                {pollutantEntries.length ? (

                  pollutantEntries.map(
                    ([name, item], index) => {

                      const average =
                        numberOrNull(item.average);

                      const percentage =
                        average === null
                          ? 0
                          : Math.max(
                              2,
                              (average / maxPollutant) * 100
                            );

                      return (
                        <div
                          className="pollutant-item"
                          key={name}
                        >

                          <div className="pollutant-item-top">

                            <strong>
                              {name
                                .replaceAll("_gt", "")
                                .toUpperCase()}
                            </strong>

                            <span>
                              {formatNumber(average)}
                            </span>

                          </div>

                          <div className="progress-track">

                            <div
                              className={`progress-fill progress-${index % 4}`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                          <small>
                            {(item.valid_observations ?? 0).toLocaleString("en-IN")}
                            {" "}valid observations
                          </small>

                        </div>
                      );
                    }
                  )

                ) : (

                  <div className="chart-empty">
                    {loading
                      ? "Loading pollutant data…"
                      : "Pollutant data unavailable."}
                  </div>

                )}

              </div>

              <div className="pollutant-note">
                Concentrations use the units supplied by
                the original dataset.
              </div>

            </article>

          </div>

        </section>

        {/* =========================================
            WEATHER ANALYTICS
        ========================================= */}

        <section
          id="weather"
          className="section-block content-section"
        >

          <div className="section-heading">

            <div>
              <div className="section-kicker">
                ENVIRONMENTAL CONDITIONS
              </div>

              <h2>
                Weather analytics
              </h2>

              <p>
                Understand the temperature and humidity
                conditions recorded by the sensors.
              </p>
            </div>

            <span className="section-index">
              02 / ENVIRONMENT
            </span>

          </div>

          <div className="weather-grid">

            <article className="panel weather-card">

              <div className="weather-card-top">
                <span className="weather-icon warm">
                  ☼
                </span>

                <span className="weather-unit">
                  CELSIUS
                </span>
              </div>

              <span className="weather-label">
                AVERAGE TEMPERATURE
              </span>

              <strong>
                {formatNumber(weather?.temperature?.average)}
                <small>°C</small>
              </strong>

              <p>
                Recorded range:{" "}
                {formatNumber(weather?.temperature?.min, 1)}
                ° to{" "}
                {formatNumber(weather?.temperature?.max, 1)}
                °C
              </p>

            </article>

            <article className="panel weather-card">

              <div className="weather-card-top">
                <span className="weather-icon cool">
                  ≈
                </span>

                <span className="weather-unit">
                  PERCENT
                </span>
              </div>

              <span className="weather-label">
                RELATIVE HUMIDITY
              </span>

              <strong>
                {formatNumber(
                  weather?.relative_humidity?.average
                )}
                <small>%</small>
              </strong>

              <p>
                Average recorded relative humidity
              </p>

            </article>

            <article className="panel weather-card">

              <div className="weather-card-top">
                <span className="weather-icon aqua">
                  ◌
                </span>

                <span className="weather-unit">
                  G / M³
                </span>
              </div>

              <span className="weather-label">
                ABSOLUTE HUMIDITY
              </span>

              <strong>
                {formatNumber(
                  weather?.absolute_humidity?.average
                )}
                <small>g/m³</small>
              </strong>

              <p>
                Average recorded absolute humidity
              </p>

            </article>

          </div>

        </section>

        {/* =========================================
            NEW: VALIDATED MODEL PERFORMANCE
        ========================================= */}

        <section
          id="model-performance"
          className="section-block content-section"
        >

          <div className="section-heading">

            <div>
              <div className="section-kicker">
                MACHINE LEARNING EVALUATION
              </div>

              <h2>
                Model performance
              </h2>

              <p>
                Evaluation results from the validated
                Random Forest model on the chronological
                test dataset.
              </p>
            </div>

            <span className="section-index">
              03 / EVALUATION
            </span>

          </div>

          {/* VALIDATED MODEL STATUS */}

          <article className="panel">

            <div className="panel-heading">

              <div>
                <h3>
                  Validated Random Forest Regressor
                </h3>

                <p>
                  Next-hour carbon monoxide forecasting
                  · 21 predictive features
                </p>
              </div>

              <span className="panel-symbol">
                ↗
              </span>

            </div>

            <div className="pollutant-note">
              <strong>
                Model status:{" "}
              </strong>

              {validatedStatus === null
                ? "Status unavailable"
                : modelLoaded
                  ? "Loaded successfully"
                  : "Model not loaded"}

              {" "} · {" "}

              <strong>
                Forecast horizon:{" "}
              </strong>

              {validatedStatus?.forecast_horizon ??
                "One hour ahead"}

              {" "} · {" "}

              <strong>
                Features:{" "}
              </strong>

              {validatedStatus?.feature_count ?? 21}
            </div>

          </article>

          {/* PERFORMANCE METRIC CARDS */}

          <div
            className="kpi-grid"
            style={{ marginTop: "18px" }}
          >

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  MEAN ABSOLUTE ERROR
                </span>

                <span className="kpi-icon teal">
                  MAE
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(metrics?.mae, 4)}
              </div>

              <div className="kpi-foot">
                Average absolute error · mg/m³
              </div>

            </article>

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  ROOT MEAN SQUARED ERROR
                </span>

                <span className="kpi-icon violet">
                  RM
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(metrics?.rmse, 4)}
              </div>

              <div className="kpi-foot">
                Penalizes larger errors · mg/m³
              </div>

            </article>

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  R² SCORE
                </span>

                <span className="kpi-icon blue">
                  R²
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(metrics?.r2, 4)}
              </div>

              <div className="kpi-foot">
                Coefficient of determination
              </div>

            </article>

            <article className="kpi-card">

              <div className="kpi-top">
                <span className="kpi-label">
                  MEAN RESIDUAL
                </span>

                <span className="kpi-icon amber">
                  Δ
                </span>
              </div>

              <div className="kpi-value">
                {formatNumber(
                  metrics?.mean_residual,
                  4
                )}
              </div>

              <div className="kpi-foot">
                Actual minus predicted · mg/m³
              </div>

            </article>

          </div>

          {/* MODEL INTERPRETATION */}

          <article
            className="panel"
            style={{ marginTop: "18px" }}
          >

            <div className="panel-heading">
              <div>
                <h3>
                  Understanding the evaluation
                </h3>

                <p>
                  What these model metrics tell us
                </p>
              </div>
            </div>

            <div className="pollutant-list">

              <div className="pollutant-item">
                <div className="pollutant-item-top">
                  <strong>
                    MAE
                  </strong>

                  <span>
                    Lower is better
                  </span>
                </div>

                <p>
                  Mean Absolute Error measures the
                  average absolute difference between
                  actual and predicted CO values.
                </p>
              </div>

              <div className="pollutant-item">
                <div className="pollutant-item-top">
                  <strong>
                    RMSE
                  </strong>

                  <span>
                    Lower is better
                  </span>
                </div>

                <p>
                  Root Mean Squared Error penalizes
                  larger prediction errors more heavily.
                </p>
              </div>

              <div className="pollutant-item">
                <div className="pollutant-item-top">
                  <strong>
                    R²
                  </strong>

                  <span>
                    Higher is generally better
                  </span>
                </div>

                <p>
                  R² measures how much variation in
                  the target CO measurements is
                  explained by the model.
                </p>
              </div>

            </div>

            <div className="pollutant-note">
              Evaluation uses a chronological 80/20
              training/testing split. These results
              describe the historical test period and
              are not a guarantee of performance on
              other cities or future conditions.
            </div>

          </article>

        </section>

        {/* =========================================
            FORECAST CENTER
        ========================================= */}

        <section
          id="forecast"
          className="section-block content-section forecast-section"
        >

          <div className="section-heading">

            <div>
              <div className="section-kicker">
                MACHINE LEARNING
              </div>

              <h2>
                AirWise Forecast Center
              </h2>

              <p>
                Generate a one-hour-ahead carbon
                monoxide estimate using the existing
                dashboard forecasting endpoint.
              </p>
            </div>

            <span className="section-index">
              04 / PREDICTION
            </span>

          </div>

          <article className="panel forecast-panel">

            <div className="forecast-header">

              <div className="forecast-model-icon">
                ⌁
              </div>

              <div className="forecast-intro">

                <span className="forecast-label">
                  RANDOM FOREST REGRESSION
                </span>

                <h3>
                  Predict next-hour carbon monoxide
                </h3>

                <p>
                  Enter recent sensor and environmental
                  readings. Prefilled values are
                  illustrative, not live sensor
                  measurements.
                </p>

              </div>

              <div className="forecast-horizon">
                <span>
                  FORECAST HORIZON
                </span>

                <strong>
                  +1 hour
                </strong>
              </div>

            </div>

            <form onSubmit={predictCO}>

              {[
                "CO history",
                "Sensor readings",
                "Weather & time",
              ].map((group) => (

                <div
                  className="field-group"
                  key={group}
                >

                  <div className="field-group-heading">
                    <span>{group}</span>
                    <i />
                  </div>

                  <div className="forecast-fields">

                    {fields
                      .filter(
                        (field) => field.group === group
                      )
                      .map((field) => (

                        <label
                          className="forecast-field"
                          key={field.name}
                        >

                          <span>
                            {field.label}
                          </span>

                          <div className="input-wrap">

                            <input
                              type="number"
                              step="any"
                              required
                              value={
                                forecastInputs[field.name]
                              }
                              onChange={(event) =>
                                updateForecastInput(
                                  field.name,
                                  event.target.value
                                )
                              }
                            />

                            {field.unit && (
                              <small>
                                {field.unit}
                              </small>
                            )}

                          </div>

                        </label>

                      ))}

                  </div>

                </div>

              ))}

              <div className="forecast-actions">

                <button
                  type="button"
                  className="reset-button"
                  onClick={() => {
                    setForecastInputs(initialInputs);
                    setForecast(null);
                    setForecastError("");
                  }}
                >
                  Reset inputs
                </button>

                <button
                  className="predict-button"
                  type="submit"
                  disabled={forecastLoading}
                >

                  {forecastLoading ? (

                    <>
                      <span className="button-spinner" />
                      Generating prediction…
                    </>

                  ) : (

                    <>
                      Generate forecast
                      <span>→</span>
                    </>

                  )}

                </button>

              </div>

            </form>

            {forecastError && (
              <div
                className="forecast-error"
                role="alert"
              >
                ⚠ &nbsp; {forecastError}
              </div>
            )}

            {forecast && (

              <div
                className="prediction-result"
                aria-live="polite"
              >

                <div className="result-icon">
                  ✓
                </div>

                <div className="result-copy">

                  <span>
                    ONE-HOUR-AHEAD CO PREDICTION
                  </span>

                  <strong>
                    {formatNumber(
                      forecast.predicted_CO,
                      4
                    )}

                    <small>
                      {" "}{forecast.unit}
                    </small>
                  </strong>

                  <p>
                    {forecast.forecast_horizon}
                    {" "} · {" "}
                    {forecast.model}
                  </p>

                </div>

                <span className="result-status">
                  Prediction generated
                </span>

              </div>

            )}

            <div className="pollutant-note">
              This interactive form currently uses the
              original 17-feature dashboard model.
              Its performance should not be confused
              with the separately evaluated 21-feature
              model shown above.
            </div>

          </article>

        </section>

        {/* =========================================
            FOOTER
        ========================================= */}

        <footer className="app-footer">

          <div>
            <strong>AirWise</strong>
            <span>
              Air Quality Intelligence Platform
            </span>
          </div>

          <div className="footer-right">

            <span>
              Academic project · Historical research dataset
            </span>

            <span>
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}`
                : "Awaiting data"}
            </span>

          </div>

        </footer>

        <p className="dataset-disclaimer">
          Research note: This application uses
          historical air-quality observations collected
          in Italy from 2004–2005. It does not provide
          live air-quality measurements or current Pune
          pollution levels.
        </p>

      </main>
    </div>
  );
}

export default App;
