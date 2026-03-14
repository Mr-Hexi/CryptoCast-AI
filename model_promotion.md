# Model Promotion and Registry Workflow

With the introduction of the MLflow Model Registry integration, managing the lifecycle of your forecasting models (`BTC_LSTM`, `BTC_GRU`) is now standardized and robust.

This document describes how to train models, register them, change their stages, and assign aliases.

---

## 1. Training and Auto-Registration

Training pipelines (`train_lstm.py` and `train_gru.py`) have been updated. They no longer automatically log models via autologging in order to prevent duplicates. Instead, models are explicitly logged and automatically registered at the end of the script using `mlflow.tensorflow.log_model()`.

To train and register a new version:

```bash
# Ensure your MLflow tracking server is running at http://127.0.0.1:5000
python ml_pipeline/models/train_lstm.py

# Or for the GRU model:
python ml_pipeline/models/train_gru.py
```

This will run the training process and at the end, register a new version of `BTC_LSTM` or `BTC_GRU` in the MLflow model registry.

---

## 2. Using the Model Version Management Utility

You can use `ml_pipeline/models/register_model.py` to move models between stages and assign them aliases.

By default, without specifying a `--version`, the script will operate on the **latest version** of the given model.

### 2.1 Promoting a Model to Staging

When a newly trained model is ready for testing, transition it to the `Staging` stage:

```bash
python ml_pipeline/models/register_model.py --model BTC_LSTM --stage Staging
```

### 2.2 Promoting a Model to Production

Once a model has been validated in `Staging`, promote it to `Production`. 
*Note: Setting a model to `Production` stage will automatically archive the previous production models.*

```bash
python ml_pipeline/models/register_model.py --model BTC_LSTM --stage Production
```

### 2.3 Archiving a Model Manually

If you need to manually retire a model:

```bash
python ml_pipeline/models/register_model.py --model BTC_LSTM --stage Archived
```

---

## 3. Working with Aliases (MLflow 3.x)

Aliases (like `production`, `staging`, `shadow`) offer a flexible way to reference models without relying on the formal stage mechanism. Our utility script allows setting aliases directly.

### 3.1 Assigning an Alias

You can assign an alias using the `--alias` flag:

```bash
python ml_pipeline/models/register_model.py --model BTC_LSTM --alias staging
```

### 3.2 Using Inline Model Aliases

You can also specify the alias inline with the model name using the `@` syntax:

```bash
python ml_pipeline/models/register_model.py --model BTC_LSTM@production
```

This will automatically pick up `BTC_LSTM` as the model and `production` as the alias, and assign it to the latest version of the model.

---

## 4. Combining Stage Transition and Aliasing

You can perform both a stage transition and set an alias in a single command. 

For instance, changing the latest `BTC_GRU` to `Staging` and giving it a `staging` alias:

```bash
python ml_pipeline/models/register_model.py --model BTC_GRU@staging --stage Staging
```

Or targeting a specific version (e.g., version 2):

```bash
python ml_pipeline/models/register_model.py --model BTC_GRU --stage Production --alias production --version 2
```
