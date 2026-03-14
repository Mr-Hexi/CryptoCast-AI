import os
import sys
import numpy as np
import pandas as pd
import mlflow
import mlflow.pyfunc
from sklearn.metrics import mean_absolute_error, mean_squared_error

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from ml_pipeline.data.ingest import download_data
from ml_pipeline.features.technical_indicators import add_features
from ml_pipeline.data.preprocessing import scale_data, create_sequences

TRACKING_URI = "http://127.0.0.1:5000"
LSTM_MODEL_URI = "models:/BTC_LSTM@production"
GRU_MODEL_URI = "models:/BTC_GRU@production"

def compare_models():
    mlflow.set_tracking_uri(TRACKING_URI)

    # 1. Prepare Validation Data
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
    data_path = os.path.join(project_root, "data", "btc_raw.csv")
    df = download_data(output_path=data_path)
    df = add_features(df)
    
    feature_cols = ['Price', 'Volume', 'MA12', 'MA24', 'Volatility', 'Momentum']
    scaler_path = os.path.join(project_root, "data", "scaler.pkl")
    scaled_data, scaler = scale_data(df, feature_columns=feature_cols, scaler_path=scaler_path, fit=False)
    
    seq_length = 72
    X, y = create_sequences(scaled_data, seq_length=seq_length)
    
    # Extract only validation / test segment (last 20%)
    split = int(len(X) * 0.8)
    X_test = X[split:]
    y_test = y[split:]
    
    # True values inverse scaled
    y_dummy = np.zeros((len(y_test), len(feature_cols)))
    y_dummy[:,0] = y_test
    y_test_real = scaler.inverse_transform(y_dummy)[:,0]

    # 2. Evaluate LSTM
    print(f"\nLoading LSTM Model from MLflow: {LSTM_MODEL_URI}")
    try:
        lstm_model = mlflow.pyfunc.load_model(LSTM_MODEL_URI)
        lstm_preds = lstm_model.predict(X_test)
        
        if isinstance(lstm_preds, pd.DataFrame):
            lstm_preds = lstm_preds.values
            
        lstm_dummy = np.zeros((len(lstm_preds), len(feature_cols)))
        lstm_dummy[:,0] = lstm_preds.flatten()
        lstm_preds_real = scaler.inverse_transform(lstm_dummy)[:,0]
        
        lstm_mae = mean_absolute_error(y_test_real, lstm_preds_real)
        lstm_rmse = np.sqrt(mean_squared_error(y_test_real, lstm_preds_real))
        print(f"--- BTC_LSTM Results ---")
        print(f"MAE : {lstm_mae:.2f}")
        print(f"RMSE: {lstm_rmse:.2f}")
    except Exception as e:
        print(f"Failed to load or evaluate LSTM: {e}")
        lstm_mae = float('inf')

    # 3. Evaluate GRU
    print(f"\nLoading GRU Model from MLflow: {GRU_MODEL_URI}")
    try:
        gru_model = mlflow.pyfunc.load_model(GRU_MODEL_URI)
        gru_preds = gru_model.predict(X_test)
        
        if isinstance(gru_preds, pd.DataFrame):
            gru_preds = gru_preds.values
            
        gru_dummy = np.zeros((len(gru_preds), len(feature_cols)))
        gru_dummy[:,0] = gru_preds.flatten()
        gru_preds_real = scaler.inverse_transform(gru_dummy)[:,0]
        
        gru_mae = mean_absolute_error(y_test_real, gru_preds_real)
        gru_rmse = np.sqrt(mean_squared_error(y_test_real, gru_preds_real))
        print(f"--- BTC_GRU Results ---")
        print(f"MAE : {gru_mae:.2f}")
        print(f"RMSE: {gru_rmse:.2f}")
    except Exception as e:
        print(f"Failed to load or evaluate GRU: {e}")
        gru_mae = float('inf')

    # 4. Summary
    print("\n========= COMPARISON SUMMARY =========")
    if lstm_mae < gru_mae:
        print("Winner: LSTM model performed better based on MAE.")
    elif gru_mae < lstm_mae:
        print("Winner: GRU model performed better based on MAE.")
    else:
        print("Tie or errors occurred.")
        
if __name__ == "__main__":
    compare_models()
