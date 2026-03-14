import pandas as pd

def add_features(df):
    """
    Add hourly technical indicators: MA12, MA24, Volatility, Momentum.
    Drops NaN values resulting from rolling windows.
    """
    df = df.copy()
    
    # Ensure numerical structure
    price = pd.to_numeric(df['Price'], errors='coerce')
    
    # 12 hours moving average
    df["MA12"] = price.rolling(12).mean()

    # 24 hours moving average
    df["MA24"] = price.rolling(24).mean()

    # hourly volatility
    df["Volatility"] = price.rolling(12).std()

    # hourly momentum
    df["Momentum"] = price - price.shift(12)
    
    df.dropna(inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    return df
