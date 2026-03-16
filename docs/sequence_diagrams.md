# BTC Forecasting System - Sequence Diagrams

This document provides sequence diagrams showing the flow of interactions between different components of the BTC forecasting system.

## Table of Contents

1. [Prediction API Flow](#prediction-api-flow)
2. [Model Training Flow](#model-training-flow)
3. [Scheduled Data Update Flow](#scheduled-data-update-flow)
4. [Model Metrics Retrieval Flow](#model-metrics-retrieval-flow)

---

## Prediction API Flow

This diagram shows the complete flow when a client requests a BTC price prediction via the `/api/predict/` endpoint.

```mermaid
sequenceDiagram
    participant C as Client/Frontend
    participant D as Django API
    participant M as MLflow Model Registry
    participant S as Scaler (disk)
    participant Y as Yahoo Finance API
    participant P as Prediction Pipeline

    C->>D: POST /api/predict/ (model_type=lstm/gru)
    Note over D: Check if model loaded in cache

    alt Model not in cache
        D->>M: Connect to tracking server
        D->>M: Get model (BTC_LSTM/BTC_GRU) with production alias
        D->>M: Resolve model version
        D->>M: Load model from URI
        D->>D: Cache model in memory
    end

    D->>Y: Download BTC-USD data (period="30d", interval="1h")
    Y-->>D: Return OHLCV dataframe

    D->>P: apply_features(df)
    P-->>D: Enhanced dataframe with features

    D->>S: Load scaler.pkl from disk
    S-->>D: Scaler object

    loop For each of 24 future hours
        D->>D: Take last 72 hours of scaled features
        D->>D: Reshape to (1, 72, n_features)
        D->>D: model.predict(sequence)
        D->>D: inverse_transform(scaled prediction)
        D->>D: Append prediction to dataframe
        D->>D: Recalculate indicators
    end

    D-->>C: Return forecast with 24 hourly predictions
```

**Key Steps:**
1. **Lazy Model Loading**: Model loaded on first request and cached
2. **Data Ingestion**: Fetch last 30 days of hourly data from yfinance
3. **Feature Engineering**: Add RSI, SMA, volatility, momentum
4. **Iterative Prediction**: 24-hour iterative forecasting with feature recalculation
5. **Response**: Return forecast with timestamps and prices

---

## Model Training Flow

This diagram illustrates the process of training and registering a new model in MLflow.

```mermaid
sequenceDiagram
    participant D as Data Ingestion
    participant F as Feature Engineering
    participant T as Training Script
    participant M as MLflow Tracking Server
    participant R as Model Registry
    participant S as Scalers/Artifacts

    Note over D,F: Data Pipeline
    D->>D: download_data(ticker, period, interval)
    D-->>F: Raw OHLCV DataFrame

    F->>F: add_technical_indicators()
    F->>F: add_temporal_features()
    F-->>T: Enhanced Features DataFrame

    Note over T: Training Pipeline
    T->>T: Split data (train/val/test)
    T->>T: Scale features using StandardScaler
    T->>S: Save scaler.pkl to disk

    T->>T: Build LSTM/GRU model architecture
    T->>T: Compile (optimizer, loss)
    T->>T: Train with validation split
    T->>T: Evaluate on test set

    T->>M: mlflow.create_experiment()
    T->>M: mlflow.start_run()
    T->>M: Log parameters (hyperparams)
    T->>M: Log metrics (MSE, MAE, RMSE)
    T->>M: Log model (as pyfunc)
    T->>M: End run

    T->>R: Register model as "BTC_LSTM" or "BTC_GRU"
    R-->>T: Model version assigned (e.g., v1)

    T->>R: Transition version to "production"
    R-->>T: Model ready for inference
```

**Key Steps:**
1. **Data Collection**: Ingest historical BTC data using yfinance
2. **Feature Engineering**: Add technical indicators and temporal features
3. **Training**: Train LSTM/GRU model with early stopping
4. **MLflow Logging**: Track experiments, parameters, metrics, and model artifacts
5. **Model Registration**: Register model in MLflow Model Registry
6. **Production Deployment**: Transition to production stage

---

## Scheduled Data Update Flow

This diagram shows how Celery automatically updates BTC data at scheduled intervals.

```mermaid
sequenceDiagram
    participant B as Celery Beat
    participant W as Celery Worker
    participant Q as Redis/RabbitMQ
    participant T as Task (process_asset_interval)
    participant Y as Yahoo Finance API
    participant FS as File System

    Note over B: Scheduler triggers
    B->>Q: Enqueue run_hourly_cycle (minute 0 every hour)
    B->>Q: Enqueue run_daily_cycle (00:00 UTC daily)
    B->>Q: Enqueue run_weekly_full_cycle (Sunday 00:00 UTC)

    loop For each interval in cycle
        Q->>W: Dequeue task
        W->>T: process_asset_interval(asset, interval)

        T->>Y: download_data(ticker, period, interval)
        Y-->>T: OHLCV DataFrame

        T->>T: add_features(df)
        T->>T: Validate data quality

        T->>FS: Write to data/scheduled_updates/
        FS-->>T: CSV saved (e.g., BTC-USD_1h.csv)

        T-->>Q: Task complete (result: {rows, output_path})
    end

    Q-->>B: All tasks completed
    Note over B: Next schedule triggered later
```

**Alternative: Manual Trigger via API**

```mermaid
sequenceDiagram
    participant U as User/Admin
    participant D as Django API
    participant Q as Celery Queue
    participant W as Celery Worker
    participant T as Task
    participant FS as File System

    U->>D: POST /api/tasks/run/hourly/ (with auth)
    D->>Q: enqueue_sequential_workflow(["1h"])
    Q-->>W: Sequential tasks enqueued

    loop Process each asset
        W->>T: process_asset_interval(BTC-USD, "1h")
        T->>FS: Write updated data
        T-->>W: Success
    end

    D-->>U: Return 202 Accepted with task ID
```

**Key Steps:**
1. **Scheduler**: Celery Beat triggers tasks at configured intervals
2. **Queue**: Tasks pushed to Redis/RabbitMQ
3. **Worker**: Processes tasks sequentially
4. **Data Download**: Fetch latest BTC data from yfinance
5. **Storage**: Save processed data to CSV files
6. **Manual Trigger**: Admin endpoints allow on-demand updates

---

## Model Metrics Retrieval Flow

This diagram shows how the frontend retrieves model metrics and forecasts for display.

```mermaid
sequenceDiagram
    participant F as Frontend Dashboard
    participant D as Django API
    participant M as MLflow Tracking Server
    participant R as MLflow Model Registry

    F->>D: GET /api/model/metrics/
    D->>M: mlflow.search_runs()
    M-->>D: Run data (metrics, params)
    D->>D: Parse and format metrics
    D-->>F: Return LSTM & GRU metrics (MSE, MAE, RMSE, R²)

    F->>D: GET /api/model/info/
    D->>R: client.search_registered_models()
    R-->>D: Model versions and stages
    D->>D: Extract latest versions
    D-->>F: Return model registry info (version, stage)

    F->>D: GET /api/model/forecasts/
    D->>D: Trigger lazy-load for both models
    D->>D: Generate 24h forecasts (reuse prediction logic)
    D-->>F: Return forecast arrays for both models
```

**Key Steps:**
1. **Metrics**: Query MLflow for latest run metrics
2. **Model Info**: Check MLflow Model Registry for version and stage info
3. **Forecasts**: Generate fresh predictions using cached models
4. **Dashboard**: Frontend displays all information together

---

## Component Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Vue.js)                     │
│  Dashboard | Charts | Prediction Display | Admin Controls  │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (HTTPS/JSON)
┌──────────────────────────────▼──────────────────────────────┐
│                  Django REST Backend                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ Prediction │  │ Model      │  │ Task Triggers      │   │
│  │ Views      │  │ Metrics    │  │ (Celery)           │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└──────────────┬─────────────────┬────────────────────────────┘
               │                 │
    ┌──────────▼─────┐ ┌────────▼──────────┐
    │   MLflow       │ │  Celery Beat      │
    │   Model        │ │  + Worker         │
    │   Registry     │ │  (Redis/RabbitMQ) │
    └────────────────┘ └───────────────────┘
               │                 │
               └─────────────────┘
                       │
          ┌────────────▼────────────┐
          │    ML Pipeline          │
          │  • Training Scripts     │
          │  • Preprocessing        │
          │  • Feature Engineering  │
          └─────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Vue.js + Vite | Interactive dashboard and visualization |
| **Backend** | Django REST Framework | API server and business logic |
| **ML Framework** | TensorFlow/Keras | LSTM & GRU model architectures |
| **Model Management** | MLflow | Experiment tracking, model registry, serving |
| **Task Queue** | Celery + Redis/RabbitMQ | Scheduled data processing |
| **Data Source** | Yahoo Finance API | Live BTC-USD OHLCV data |
| **Storage** | CSV files + MLflow artifacts | Data persistence and model storage |
| **Deployment** | GitHub Actions | CI/CD pipeline |

---

## Data Flow Summary

### Real-time Prediction Path

```
Client Request
    ↓
Django API (Lazy model load)
    ↓
Download latest BTC data (yfinance)
    ↓
Feature engineering (RSI, SMA, etc.)
    ↓
Scale with saved scaler
    ↓
Generate 72-hour sequence window
    ↓
Predict next hour (iterate 24x)
    ↓
Inverse transform predictions
    ↓
Return JSON response
```

### Training Path

```
Historical data download
    ↓
Feature engineering + scaling
    ↓
Train LSTM/GRU model
    ↓
Evaluate metrics (MSE, MAE, RMSE, R²)
    ↓
Log to MLflow tracking
    ↓
Register model in MLflow
    ↓
Transition to production stage
```

### Scheduled Update Path

```
Celery Beat (cron-like)
    ↓
Enqueue download tasks
    ↓
Celery Worker executes
    ↓
Download fresh BTC data
    ↓
Process and save to CSV
    ↓
Updated data ready for predictions
```

---

## Extension Points

To add support for new cryptocurrencies:
1. Update `PIPELINE_ASSETS` environment variable (e.g., `BTC-USD,ETH-USD`)
2. Models trained per asset (different registered models)
3. Celery tasks iterate over all configured assets

To add new technical indicators:
1. Modify `ml_pipeline/features/technical_indicators.py`
2. Retrain models with new feature set
3. Update feature list in `views.py` to match new indicator columns

To change prediction horizon:
1. Modify `future_hours = 24` in `PredictAPIView.post()`
2. Consider retraining with different target sequences
