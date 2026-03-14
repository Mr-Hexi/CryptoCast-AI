import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

def scale_data(df, feature_columns=None, scaler_path="data/scaler.pkl", fit=True):
    """
    Scales the selected feature columns using MinMaxScaler.
    """
    if feature_columns is None:
        feature_columns = ['Price', 'Volume', 'MA12', 'MA24', 'Volatility', 'Momentum']
        
    scaler = MinMaxScaler()
    
    if fit: # Training mode
        scaled_data = scaler.fit_transform(df[feature_columns])
        os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
        joblib.dump(scaler, scaler_path)
    else: # Prediction mode
        scaler = joblib.load(scaler_path)
        scaled_data = scaler.transform(df[feature_columns])
        
    return scaled_data, scaler

def create_sequences(data, seq_length=72):
    """
    Create sequences for LSTM from scaled data.
    Final input shape: (batch_size, seq_length, num_features)
    Target is 'Price' which is at index 0 of the predefined feature columns.
    """
    X = []
    y = []
    target_index = 0 # index of 'Price' feature
    
    for i in range(seq_length, len(data)):
        X.append(data[i-seq_length:i])
        y.append(data[i, target_index])
        
    return np.array(X), np.array(y)
