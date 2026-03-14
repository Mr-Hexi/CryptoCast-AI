from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.generic import TemplateView
from .apps import PredictionConfig
import pandas as pd
import numpy as np
import sys
import os
import joblib

# Ensure ml_pipeline is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if project_root not in sys.path:
    sys.path.append(project_root)

from ml_pipeline.data.ingest import download_data
from ml_pipeline.features.technical_indicators import add_features
from ml_pipeline.data.preprocessing import scale_data
from .services.mlflow_service import (
    get_model_metrics,
    get_model_versions,
    get_model_forecasts,
    init_mlflow,
    resolve_model_reference,
)
from .tasks import enqueue_sequential_workflow, FULL_CYCLE_INTERVALS
from .services.analytics_service import get_roi_analysis, get_drift_analysis

class PredictAPIView(APIView):
    """
    API endpoint that predicts the next 24 hours of BTC price.
    """

    def post(self, request, model_type='lstm', format=None):
        if model_type == 'gru':
            target_model_name = "BTC_GRU"
        else:
            target_model_name = "BTC_LSTM"
            
        from .apps import MODEL_ALIAS, TRACKING_URI
        
        cache_key = f"{target_model_name}@{MODEL_ALIAS}"
        
        if cache_key not in PredictionConfig.models:
            try:
                import mlflow.pyfunc
                print(f"Lazy loading MLflow model {cache_key}...")
                mlflow.set_tracking_uri(TRACKING_URI)
                client = init_mlflow()
                model_info, source = resolve_model_reference(client, target_model_name)
                model_uri = f"models:/{target_model_name}/{model_info.version}"
                print(f"Resolved {target_model_name} via {source} -> {model_uri}")
                PredictionConfig.models[cache_key] = mlflow.pyfunc.load_model(model_uri)
                print(f"Model {cache_key} lazy-loaded successfully.")
            except Exception as e:
                return Response(
                    {"status": "error", "message": f"Failed to load model {cache_key} from MLflow: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        try:
            # 1. Fetch latest BTC data (last 30 days hourly to have enough history for MAs)
            temp_path = os.path.join(project_root, "data", "temp_inference.csv")
            df = download_data(ticker="BTC-USD", period="30d", interval="1h", output_path=temp_path)
            
            # 2. Generate initial features
            df_features = add_features(df)
            
            sequence_length = 72
            if len(df_features) < sequence_length:
                return Response(
                    {"status": "error", "message": "Not enough data for sequence generation."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # 3. Load Scaler
            feature_cols = ['Price', 'Volume', 'MA12', 'MA24', 'Volatility', 'Momentum']
            scaler_path = os.path.join(project_root, "data", "scaler.pkl")
            
            if not os.path.exists(scaler_path):
                return Response(
                    {"status": "error", "message": "Scaler object not found. Ensure training is completed."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            scaler = joblib.load(scaler_path)
                
            # 4. Forecast Next 24 Hours Iteratively
            future_hours = 24
            future_prices = []
            
            # Use working copy of dataframe
            temp_data = df_features.copy()
            
            for _ in range(future_hours):
                # Scale the last 72 hours
                scaled_temp = scaler.transform(temp_data[feature_cols].iloc[-sequence_length:])
                
                # Reshape to (1, 72, num_features)
                current_sequence = scaled_temp.reshape(1, sequence_length, len(feature_cols))
                
                # Predict ONE scaled value
                pred_scaled = PredictionConfig.models[cache_key].predict(current_sequence)
                if isinstance(pred_scaled, np.ndarray):
                    pred_scaled = pred_scaled[0][0] # PyFunc and raw Keras may return different nested arrays
                else: 
                    # If it returns a pandas dataframe
                    pred_scaled = np.array(pred_scaled)[0][0]
                
                # Inverse Scale
                dummy = np.zeros((1, len(feature_cols)))
                dummy[0,0] = pred_scaled
                pred_price = scaler.inverse_transform(dummy)[0,0]
                
                future_prices.append(round(float(pred_price), 2))
                
                # Create a new row, copying previous volume to simulate next row
                new_row = temp_data.iloc[-1].copy()
                new_row["Price"] = pred_price
                # Optionally, we can increment the Date by 1 hour for the index, but we just need it for features
                
                # Append to temp_data
                temp_data = pd.concat([temp_data, pd.DataFrame([new_row])], ignore_index=True)
                
                # Recalculate indicators for the appended row
                temp_data["MA12"] = temp_data["Price"].rolling(12).mean()
                temp_data["MA24"] = temp_data["Price"].rolling(24).mean()
                temp_data["Volatility"] = temp_data["Price"].rolling(12).std()
                temp_data["Momentum"] = temp_data["Price"] - temp_data["Price"].shift(12)
                
                temp_data = temp_data.bfill()

            # 5. Generate Future Timestamps
            last_date = pd.to_datetime(df_features['Date'].iloc[-1])
            future_dates = pd.date_range(
                start=last_date + pd.Timedelta(hours=1),
                periods=future_hours,
                freq="h"
            ).astype(str).tolist()
            
            # Combine into results
            forecast = [{"date": d, "predicted_price": p} for d, p in zip(future_dates, future_prices)]
            
            return Response({
                "status": "success",
                "model_used": f"{target_model_name}@{MODEL_ALIAS}",
                "forecast": forecast
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ModelMetricsAPIView(APIView):
    """
    API endpoint that returns testing metrics for both LSTM and GRU models.
    """
    def get(self, request, format=None):
        try:
            metrics = get_model_metrics()
            return Response(metrics, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ModelInfoAPIView(APIView):
    """
    API endpoint that returns model registry info (stage, version) for both models.
    """
    def get(self, request, format=None):
        try:
            versions = get_model_versions()
            return Response(versions, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ModelForecastsAPIView(APIView):
    """
    API endpoint that returns the 24-hour predictions for both models simultaneously.
    """
    def get(self, request, format=None):
        try:
            forecasts = get_model_forecasts()
            return Response(forecasts, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ROIAnalysisAPIView(APIView):
    """
    API endpoint that returns expected ROI analysis from model signals.
    """
    def get(self, request, format=None):
        try:
            capital = request.query_params.get("capital")
            initial_capital = float(capital) if capital else 1000.0
            roi = get_roi_analysis(initial_capital=initial_capital)
            return Response(roi, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DriftAnalysisAPIView(APIView):
    """
    API endpoint that returns drift score and timeline for dashboard plotting.
    """
    def get(self, request, format=None):
        try:
            drift = get_drift_analysis()
            return Response(drift, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TriggerHourlyCycleAPIView(APIView):
    """
    Manually trigger hourly cycle (1h updates for all configured assets).
    """
    def post(self, request, format=None):
        try:
            payload = enqueue_sequential_workflow(("1h",), run_type="manual_hourly")
            return Response(payload, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TriggerDailyCycleAPIView(APIView):
    """
    Manually trigger daily cycle (1d updates for all configured assets).
    """
    def post(self, request, format=None):
        try:
            payload = enqueue_sequential_workflow(("1d",), run_type="manual_daily")
            return Response(payload, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TriggerWeeklyFullCycleAPIView(APIView):
    """
    Manually trigger weekly full cycle (1h, 1d, 1w, 1m) for all configured assets.
    """
    def post(self, request, format=None):
        try:
            payload = enqueue_sequential_workflow(FULL_CYCLE_INTERVALS, run_type="manual_weekly_full_cycle")
            return Response(payload, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
