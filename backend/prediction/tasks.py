import os
import sys
from datetime import datetime, timezone

from celery import chain, shared_task

# Ensure repository root is importable.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if project_root not in sys.path:
    sys.path.append(project_root)

from ml_pipeline.data.ingest import download_data

DEFAULT_ASSETS = ("BTC-USD",)
FULL_CYCLE_INTERVALS = ("1h", "1d", "1w", "1m")
INTERVAL_TO_YFINANCE_INTERVAL = {
    "1h": "1h",
    "1d": "1d",
    "1w": "1wk",
    # In cycle naming this means one-month candles.
    "1m": "1mo",
}
INTERVAL_TO_PERIOD = {
    "1h": "60d",
    "1d": "730d",
    "1w": "10y",
    "1m": "max",
}


def _get_assets():
    raw = os.getenv("PIPELINE_ASSETS", ",".join(DEFAULT_ASSETS))
    assets = [item.strip() for item in raw.split(",") if item.strip()]
    return assets or list(DEFAULT_ASSETS)


def _safe_asset_name(asset):
    return asset.replace("/", "_").replace("-", "_").replace(" ", "_")


def _output_path(asset, interval):
    asset_key = _safe_asset_name(asset)
    return os.path.join(project_root, "data", "scheduled_updates", f"{asset_key}_{interval}.csv")


@shared_task(
    bind=True,
    name="prediction.tasks.process_asset_interval",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_asset_interval(self, asset, interval):
    if interval not in INTERVAL_TO_YFINANCE_INTERVAL:
        raise ValueError(f"Unsupported interval '{interval}'.")

    yf_interval = INTERVAL_TO_YFINANCE_INTERVAL[interval]
    period = INTERVAL_TO_PERIOD[interval]
    output_path = _output_path(asset, interval)
    dataset = download_data(
        ticker=asset,
        period=period,
        interval=yf_interval,
        output_path=output_path,
    )
    return {
        "asset": asset,
        "interval": interval,
        "rows": int(len(dataset)),
        "output_path": output_path,
        "processed_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def enqueue_sequential_workflow(intervals, run_type):
    assets = _get_assets()
    workflow = []
    for interval in intervals:
        for asset in assets:
            # Immutable signature prevents chain from injecting previous task results.
            workflow.append(process_asset_interval.si(asset, interval))

    if not workflow:
        return {"status": "skipped", "reason": "No assets configured"}

    result = chain(*workflow).apply_async(queue="asset_updates")
    return {
        "status": "queued",
        "run_type": run_type,
        "assets": assets,
        "intervals": list(intervals),
        "root_task_id": result.id,
    }


@shared_task(name="prediction.tasks.run_hourly_cycle")
def run_hourly_cycle():
    return enqueue_sequential_workflow(("1h",), run_type="hourly")


@shared_task(name="prediction.tasks.run_daily_cycle")
def run_daily_cycle():
    return enqueue_sequential_workflow(("1d",), run_type="daily")


@shared_task(name="prediction.tasks.run_weekly_full_cycle")
def run_weekly_full_cycle():
    return enqueue_sequential_workflow(FULL_CYCLE_INTERVALS, run_type="weekly_full_cycle")
