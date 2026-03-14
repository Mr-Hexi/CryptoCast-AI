from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense

def build_lstm_model(input_shape):
    """
    Build and compile LSTM model based on Jupyter Notebook.
    """
    model = Sequential()
    
    model.add(LSTM(64, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    
    model.add(LSTM(64))
    model.add(Dropout(0.2))
    
    model.add(Dense(32))
    model.add(Dense(1))
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    return model
