import os
import sys
import argparse
import mlflow
from mlflow.tracking import MlflowClient

# Adjust sys path so we can import from project root if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

TRACKING_URI = "http://127.0.0.1:5000"

def main():
    parser = argparse.ArgumentParser(description="Manage MLflow Model Registry stages and aliases.")
    parser.add_argument(
        "--model", 
        type=str, 
        required=True, 
        help="Name of the registered model, optionally with an alias (e.g., 'BTC_LSTM' or 'BTC_LSTM@production')"
    )
    parser.add_argument(
        "--stage", 
        type=str, 
        choices=["Staging", "Production", "Archived", "None"], 
        help="Stage to transition the model to (Staging, Production, Archived, None)",
        default=None
    )
    parser.add_argument(
        "--alias", 
        type=str, 
        help="Alias to assign to the model (e.g., production, staging, shadow)",
        default=None
    )
    parser.add_argument(
        "--version", 
        type=int, 
        help="Specific model version to modify. If not provided, uses the latest version.",
        default=None
    )
    
    args = parser.parse_args()

    mlflow.set_tracking_uri(TRACKING_URI)
    client = MlflowClient(tracking_uri=TRACKING_URI)

    # Parse model and alias if provided like "BTC_LSTM@production"
    model_name = args.model
    alias = args.alias

    if "@" in model_name:
        parts = model_name.split("@")
        if len(parts) == 2:
            model_name = parts[0]
            if alias is None:
                alias = parts[1]
            else:
                print(f"Warning: Alias provided both in --model and --alias. Using --alias={alias}")
        else:
            print(f"Error: Invalid model name format '{model_name}'. Expected format: 'model_name' or 'model_name@alias'")
            sys.exit(1)

    print(f"Targeting model: {model_name}")

    if args.version is None:
        try:
            # Fetch latest versions. We check for all stages to find the absolute latest version.
            latest_versions = client.get_latest_versions(model_name, stages=["None", "Staging", "Production", "Archived"])
            if not latest_versions:
                print(f"Error: No versions found for registered model '{model_name}'. Make sure the model is registered first.")
                sys.exit(1)
            
            # Find the highest version number
            latest_version = max([int(v.version) for v in latest_versions])
            target_version = latest_version
            print(f"Found latest version: {target_version}")
        except mlflow.exceptions.RestException as e:
            print(f"Error interacting with MLflow. Make sure the model '{model_name}' exists and the tracking server is running.")
            print(e)
            sys.exit(1)
    else:
        target_version = args.version
        print(f"Using specified version: {target_version}")

    # Set Stage
    if args.stage:
        print(f"Transitioning model '{model_name}' version {target_version} to stage '{args.stage}'...")
        client.transition_model_version_stage(
            name=model_name,
            version=target_version,
            stage=args.stage,
            archive_existing_versions=(args.stage == "Production") # Automatically archive others if moving to production
        )
        print(f"Successfully transitioned to {args.stage}.")

    # Set Alias
    if alias:
        print(f"Setting alias '{alias}' for model '{model_name}' version {target_version}...")
        client.set_registered_model_alias(
            name=model_name,
            alias=alias,
            version=str(target_version)
        )
        print(f"Successfully set alias '{alias}'.")
        
    if not args.stage and not alias:
        print("No --stage or alias provided. Nothing was modified.")

if __name__ == "__main__":
    main()
