# BTC-USD Forecasting System

An end-to-end MLOps pipeline for forecasting BTC-USD prices using LSTM, MLflow, and a Django REST API.

## Setup Instructions

1. Activate your environment:
   `conda activate ml`
2. Install dependencies:
   `pip install -r requirements.txt`

## Running MLflow
Start the MLflow tracking server locally:
```bash
mlflow server --host 127.0.0.1 --port 5000
```

## Running the ML Pipeline
Train and track the model:
```bash
python ml_pipeline/models/train_lstm.py
```

## Running the Django Backend
Navigate to the `backend` directory, apply migrations, and run the server:
```bash
cd backend
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

## Frontend API Configuration
The frontend API URL is environment-driven:

```bash
cd frontend
cp .env.example .env
```

- Local default fallback: `http://127.0.0.1:8000/api`
- Production should set:
  - `VITE_API_BASE_URL=https://your-api-domain/api`

## Automated Execution (Celery)
This project supports scheduled, sequential asset updates through Celery + Beat.

### Broker Configuration
- Redis example:
  - `CELERY_BROKER_URL=redis://127.0.0.1:6379/0`
- RabbitMQ example:
  - `CELERY_BROKER_URL=amqp://guest:guest@127.0.0.1:5672//`

Optional:
- `CELERY_RESULT_BACKEND` (defaults to `CELERY_BROKER_URL`)
- `PIPELINE_ASSETS` (comma-separated tickers, default `BTC-USD`)

### Start Worker and Beat
From the `backend` directory:
```bash
celery -A backend worker --loglevel=info --concurrency=1 --queues=asset_updates
celery -A backend beat --loglevel=info
```

### Schedules (UTC)
- Hourly: `1h` updates for all configured assets (minute `00` each hour)
- Daily: `1d` updates at `00:00 UTC`
- Weekly (Sunday): full cycle `1h`, `1d`, `1w`, `1m` at `00:00 UTC`

### Manual Trigger Endpoints
All endpoints are under `/api/` and expect `POST`:
- `/api/tasks/run/hourly/`
- `/api/tasks/run/daily/`
- `/api/tasks/run/weekly-full/`

Example:
```bash
curl -X POST http://127.0.0.1:8000/api/tasks/run/hourly/
```
