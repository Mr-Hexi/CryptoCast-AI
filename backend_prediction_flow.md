# BTC-USD Backend Prediction Flow

This document explains exactly what happens under the hood when you send a `POST` request to the `/api/predict/` endpoint in the Django backend.

## 1. Lazy Model Loading
When the Django server starts, it does *not* immediately load the machine learning model. Instead, it waits for the **first API request**. 

Upon receiving the first `POST /api/predict/` request:
- The server connects to the MLflow Tracking Server (`http://127.0.0.1:5000`).
- It fetches the model registered as `BTC_LSTM` that is tagged with the `production` alias.
- The model is loaded into memory and kept there. All subsequent requests will reuse this loaded model, making them much faster.

## 2. Live Data Ingestion
To predict tomorrow's price, the model needs the most recent historical data.
- The API calculates a date range starting from **150 days ago** up to the **current exact time** (`datetime.now()`).
- It uses the `yfinance` library to download the live `BTC-USD` OHLCV (Open, High, Low, Close, Volume) daily data for this timeframe.

*Note: 150 days is fetched because calculating a 50-day moving average (SMA50) consumes the first 49 days of data, and we still need at least 60 valid days afterward to feed into the model.*

## 3. Feature Engineering
The raw data is passed to our `add_features()` pipeline which computes:
- **RSI** (Relative Strength Index - 14 days)
- **SMA20** (Simple Moving Average - 20 days)
- **SMA50** (Simple Moving Average - 50 days)
- **Returns** (Daily percentage change)

Any rows with missing values (like the first 49 days used to warm up the SMA50) are dropped to ensure clean data.

## 4. Scaling
Neural networks require data to be normalized (typically between 0 and 1).
- The API loads the `scaler.pkl` object that was saved during the training phase.
- It applies this exact same scaling transformation to the new live data so that the model sees the data in the exact same format it was trained on.

## 5. Sequence Generation
The LSTM architecture is designed to look at a "window" of time.
- The API takes the **last 60 days** of the newly scaled data.
- It reshapes this into a 3D array: `(1 batch, 60 timesteps, 9 features)`.
- This sequence represents the last 60 days of market movement up to today.

## 6. Prediction
- The sequence is fed into the loaded PyFunc MLflow model.
- The model outputs a single scaled numerical value between 0 and 1.
- The API uses the `scaler.pkl` to **inverse transform** this value back into a real-world USD price.
- Finally, the server responds with a JSON object containing the predicted BTC price for the **next upcoming day**:

```json
{
    "status": "success",
    "predicted_price": 68421.53
}
```
