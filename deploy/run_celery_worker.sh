#!/bin/bash
set -e

PROJECT_PATH=${PROJECT_PATH:-/home/azureuser/CryptoCast-AI}
cd "$PROJECT_PATH/backend"

if [ -f "$PROJECT_PATH/backend/.env" ]; then
  set -a
  source "$PROJECT_PATH/backend/.env"
  set +a
fi

source venv/bin/activate

celery -A backend worker --loglevel=info --concurrency=1 --queues=asset_updates
