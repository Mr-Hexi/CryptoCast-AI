from django.apps import AppConfig
import mlflow
import sys

import os

TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")
MODEL_NAME = os.getenv("MODEL_NAME", "BTC_LSTM")
MODEL_ALIAS = os.getenv("MODEL_ALIAS", "production")

class PredictionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'prediction'
    models = {} # Cache for dynamically loaded models

    def ready(self):
        # We will load the models lazily in views.py
        pass
