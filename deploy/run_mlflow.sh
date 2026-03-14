#!/bin/bash
set -e

PROJECT_PATH=${PROJECT_PATH:-/home/azureuser/CryptoCast-AI}
cd "$PROJECT_PATH/backend"

source venv/bin/activate

mlflow server \
  --backend-store-uri sqlite:///$PROJECT_PATH/backend/mlflow.db \
  --default-artifact-root $PROJECT_PATH/backend/mlartifacts \
  --host 127.0.0.1 --port 5000
