from django.urls import path
from .views import (
    PredictAPIView, 
    ModelMetricsAPIView, 
    ModelInfoAPIView, 
    ModelForecastsAPIView,
    ROIAnalysisAPIView,
    DriftAnalysisAPIView,
    TriggerHourlyCycleAPIView,
    TriggerDailyCycleAPIView,
    TriggerWeeklyFullCycleAPIView,
)

urlpatterns = [
    path('predict/', PredictAPIView.as_view(), kwargs={'model_type': 'lstm'}, name='predict_default'),
    path('predict/lstm/', PredictAPIView.as_view(), kwargs={'model_type': 'lstm'}, name='predict_lstm'),
    path('predict/gru/', PredictAPIView.as_view(), kwargs={'model_type': 'gru'}, name='predict_gru'),
    
    # Dashboard Endpoints
    path('models/metrics/', ModelMetricsAPIView.as_view(), name='model_metrics'),
    path('models/info/', ModelInfoAPIView.as_view(), name='model_info'),
    path('models/forecast/', ModelForecastsAPIView.as_view(), name='model_forecasts'),
    path('models/roi/', ROIAnalysisAPIView.as_view(), name='model_roi_analysis'),
    path('models/drift/', DriftAnalysisAPIView.as_view(), name='model_drift_analysis'),

    # Manual Celery Triggers
    path('tasks/run/hourly/', TriggerHourlyCycleAPIView.as_view(), name='trigger_hourly_cycle'),
    path('tasks/run/daily/', TriggerDailyCycleAPIView.as_view(), name='trigger_daily_cycle'),
    path('tasks/run/weekly-full/', TriggerWeeklyFullCycleAPIView.as_view(), name='trigger_weekly_full_cycle'),
]
