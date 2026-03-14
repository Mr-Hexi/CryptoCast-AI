import os
import sys
import numpy as np
import pandas as pd
import mlflow
import mlflow.tensorflow
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import mean_absolute_error, mean_squared_error

# Adjust sys path so we can import from project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from ml_pipeline.data.ingest import download_data
from ml_pipeline.features.technical_indicators import add_features
from ml_pipeline.data.preprocessing import scale_data, create_sequences
from ml_pipeline.models.lstm_model import build_lstm_model

EXPERIMENT_NAME = "BTC_Forecasting"
MODEL_ALIAS = "production"
MODEL_NAME = "BTC_LSTM"
TRACKING_URI = "http://127.0.0.1:5000"

def train():
    # 1. Ingest Data
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
    data_path = os.path.join(project_root, "data", "btc_raw.csv")
    df = download_data(output_path=data_path)
    
    # 2. Add Indicators
    df = add_features(df)
    
    # 3. Preprocessing (Scale & Sequences)
    feature_cols = ['Price', 'Volume', 'MA12', 'MA24', 'Volatility', 'Momentum']
    scaler_path = os.path.join(project_root, "data", "scaler.pkl")
    scaled_data, scaler = scale_data(df, feature_columns=feature_cols, scaler_path=scaler_path, fit=True)
    
    seq_length = 72
    X, y = create_sequences(scaled_data, seq_length=seq_length)
    
    # Train/Test Split (80/20)
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    # Setup MLflow
    mlflow.set_tracking_uri(TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAME)
    
    # Autologging (disable automatic model logging to handle it manually)
    mlflow.tensorflow.autolog(log_models=False)
    
    print("Starting Training Run in MLflow...")
    with mlflow.start_run() as run:
        # 4. Build Model
        model = build_lstm_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        
        early_stop = EarlyStopping(
            monitor="val_loss",
            patience=3,
            restore_best_weights=True
        )

        # 5. Train Model
        history = model.fit(
            X_train, y_train,
            epochs=10,
            batch_size=64,
            validation_data=(X_test, y_test),
            callbacks=[early_stop],
            verbose=1
        )
        
        # --- NEW CODE: Evaluation & Next Hour Predict ---
        
        # Evaluate on Test Set
        print("Evaluating model on test data...")
        predictions = model.predict(X_test)
        
        # Inverse Scaling for actual metrics evaluation
        pred_dummy = np.zeros((len(predictions), len(feature_cols)))
        pred_dummy[:,0] = predictions.flatten()
        predictions_real = scaler.inverse_transform(pred_dummy)[:,0]

        y_dummy = np.zeros((len(y_test), len(feature_cols)))
        y_dummy[:,0] = y_test
        y_test_real = scaler.inverse_transform(y_dummy)[:,0]

        # Calculate Metrics
        mae = mean_absolute_error(y_test_real, predictions_real)
        rmse = np.sqrt(mean_squared_error(y_test_real, predictions_real))
        
        print(f"Test MAE: {mae:.2f}")
        print(f"Test RMSE: {rmse:.2f}")
        
        # Log Custom Metrics manually
        mlflow.log_metric("test_mae", mae)
        mlflow.log_metric("test_rmse", rmse)
        
        # Predict Next Hour directly
        print("Predicting next hour price...")
        # Get the final 72 elements from our entire scaled dataset
        latest_sequence = scaled_data[-seq_length:].reshape(1, seq_length, len(feature_cols))
        next_hour_scaled = model.predict(latest_sequence)
        
        # Extract correctly based on returned type
        if isinstance(next_hour_scaled, np.ndarray):
            next_hour_scaled = next_hour_scaled[0][0]
        else:
            next_hour_scaled = np.array(next_hour_scaled)[0][0]
            
        dummy_next = np.zeros((1, len(feature_cols)))
        dummy_next[0,0] = next_hour_scaled
        pred_next_hour_price = float(scaler.inverse_transform(dummy_next)[0,0])
        
        print(f"Next Hour Predicted Price: ${pred_next_hour_price:.2f}")
        mlflow.log_param("predicted_next_hour_price", round(pred_next_hour_price, 2))
        
        # ---------------------------------------------
        
        # Log and Register Model
        print(f"Logging and registering model as {MODEL_NAME}")
        mlflow.tensorflow.log_model(
            model,
            artifact_path="model",
            registered_model_name=MODEL_NAME
        )
        print(f"Model {MODEL_NAME} successfully logged and registered.")

if __name__ == "__main__":
    train()
