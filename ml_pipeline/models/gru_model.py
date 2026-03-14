from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import GRU, Dropout, Dense

def build_gru_model(input_shape):
    """
    Build and compile GRU model.
    Architecture:
    - GRU(64, return_sequences=True)
    - Dropout(0.2)
    - GRU(32)
    - Dense(16)
    - Dense(1)
    """
    model = Sequential()
    
    model.add(GRU(64, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    
    model.add(GRU(32))
    
    model.add(Dense(16))
    model.add(Dense(1))
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    return model
