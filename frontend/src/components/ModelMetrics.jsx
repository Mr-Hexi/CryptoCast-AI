import React from 'react';
import InfoIcon from './InfoIcon';

const ModelMetrics = ({ metrics, loading }) => {
    const determineBestModel = () => {
        if (!metrics?.lstm || !metrics?.gru) return null;

        const lstmMae = metrics.lstm.mae;
        const gruMae = metrics.gru.mae;
        const lstmRmse = metrics.lstm.rmse;
        const gruRmse = metrics.gru.rmse;

        if (lstmMae == null || gruMae == null || lstmRmse == null || gruRmse == null) {
            return null;
        }

        const lstmScore = lstmMae + lstmRmse;
        const gruScore = gruMae + gruRmse;

        if (lstmScore < gruScore) {
            return 'lstm';
        }
        if (gruScore < lstmScore) {
            return 'gru';
        }
        return 'tie';
    };

    const bestModel = determineBestModel();

    const getBestModelReason = () => {
        if (!bestModel || bestModel === 'tie') return '';

        const mae = metrics[bestModel].mae;
        const rmse = metrics[bestModel].rmse;
        const otherModel = bestModel === 'lstm' ? 'GRU' : 'LSTM';
        const otherMae = bestModel === 'lstm' ? metrics.gru.mae : metrics.lstm.mae;
        const otherRmse = bestModel === 'lstm' ? metrics.gru.rmse : metrics.lstm.rmse;

        const maeDiff = Math.abs(mae - otherMae);
        const rmseDiff = Math.abs(rmse - otherRmse);
        const maeText = maeDiff > 10
            ? `about $${maeDiff.toFixed(0)} less average error`
            : `$${maeDiff.toFixed(2)} less average error`;
        const rmseText = rmseDiff > 10
            ? `about $${rmseDiff.toFixed(0)} fewer large mistakes`
            : `$${rmseDiff.toFixed(2)} fewer large mistakes`;

        const modelName = bestModel === 'lstm' ? 'LSTM' : 'GRU';
        return `${modelName} predicted BTC prices more accurately. It had ${maeText} and ${rmseText} compared to ${otherModel}.`;
    };

    return (
        <div className="glass-card overflow-hidden">
            <h5 className="card-title label-with-info" style={{ marginBottom: '0', paddingBottom: '1rem' }}>
                Testing Metrics
                <InfoIcon text="Evaluation metrics from the latest testing run for both models." />
            </h5>

            {bestModel && bestModel !== 'tie' && (
                <div className={`best-model-badge ${bestModel}`}>
                    <span className="best-icon">*</span>
                    <strong>{bestModel === 'lstm' ? 'LSTM' : 'GRU'} performs best</strong>
                    <p className="best-reason">{getBestModelReason()}</p>
                </div>
            )}

            <div className="table-container table-container-no-scroll">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Model</th>
                            <th>
                                MAE
                                <InfoIcon text="Mean Absolute Error: average absolute gap between predicted and actual BTC price. Lower is better." />
                            </th>
                            <th>
                                RMSE
                                <InfoIcon text="Root Mean Square Error: penalizes large errors more than MAE. Lower is better." />
                            </th>
                            <th>
                                Training Loss
                                <InfoIcon text="Final training loss (typically MSE) from model fitting. Lower usually means better convergence." />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className={bestModel === 'lstm' ? 'best-row' : ''}>
                            <td>
                                <div className="model-name">
                                    <div className="dot lstm"></div>
                                    <span>LSTM</span>
                                    {bestModel === 'lstm' && <span className="best-badge">Best</span>}
                                    {bestModel === 'tie' && <span className="tie-badge">Tie</span>}
                                </div>
                            </td>
                            <td>{loading ? '...' : metrics?.lstm?.mae ?? 'N/A'}</td>
                            <td>{loading ? '...' : metrics?.lstm?.rmse ?? 'N/A'}</td>
                            <td>{loading ? '...' : metrics?.lstm?.training_loss ?? 'N/A'}</td>
                        </tr>
                        <tr className={bestModel === 'gru' ? 'best-row' : ''}>
                            <td>
                                <div className="model-name">
                                    <div className="dot gru"></div>
                                    <span>GRU</span>
                                    {bestModel === 'gru' && <span className="best-badge">Best</span>}
                                    {bestModel === 'tie' && <span className="tie-badge">Tie</span>}
                                </div>
                            </td>
                            <td>{loading ? '...' : metrics?.gru?.mae ?? 'N/A'}</td>
                            <td>{loading ? '...' : metrics?.gru?.rmse ?? 'N/A'}</td>
                            <td>{loading ? '...' : metrics?.gru?.training_loss ?? 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ModelMetrics;
