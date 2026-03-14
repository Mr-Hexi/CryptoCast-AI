import React from 'react';
import InfoIcon from './InfoIcon';

const IMPORTANT_METRICS = [
    { key: 'mae', label: 'MAE', description: 'Lower is better' },
    { key: 'rmse', label: 'RMSE', description: 'Lower is better' },
    { key: 'training_loss', label: 'Training Loss', description: 'Lower is better' },
];

const formatValue = (value) => {
    if (value == null || Number.isNaN(Number(value))) return 'N/A';
    const numeric = Number(value);
    if (Math.abs(numeric) >= 1000) return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return numeric.toFixed(4);
};

const formatDelta = (value) => {
    if (value == null || Number.isNaN(Number(value))) return 'N/A';
    const numeric = Number(value);
    const sign = numeric > 0 ? '+' : '';
    return `${sign}${numeric.toFixed(4)}`;
};

const metricWinner = (lstmValue, gruValue) => {
    if (lstmValue == null || gruValue == null) return 'N/A';
    if (lstmValue < gruValue) return 'LSTM';
    if (gruValue < lstmValue) return 'GRU';
    return 'Tie';
};

const ABTestingPanel = ({ metrics, loading }) => {
    const lstm = metrics?.lstm || {};
    const gru = metrics?.gru || {};

    const rows = IMPORTANT_METRICS.map((metric) => {
        const lstmValue = lstm[metric.key];
        const gruValue = gru[metric.key];
        const delta = (gruValue != null && lstmValue != null) ? Number(gruValue) - Number(lstmValue) : null;
        const lift = (lstmValue != null && Number(lstmValue) !== 0 && gruValue != null)
            ? ((Number(lstmValue) - Number(gruValue)) / Number(lstmValue)) * 100
            : null;

        return {
            ...metric,
            lstmValue,
            gruValue,
            delta,
            lift,
            winner: metricWinner(lstmValue, gruValue),
        };
    });

    const lstmWins = rows.filter((row) => row.winner === 'LSTM').length;
    const gruWins = rows.filter((row) => row.winner === 'GRU').length;
    const overallWinner = lstmWins === gruWins ? 'Tie' : (lstmWins > gruWins ? 'LSTM' : 'GRU');
    const validLifts = rows.map((row) => row.lift).filter((value) => value != null);
    const avgLift = validLifts.length ? (validLifts.reduce((acc, value) => acc + value, 0) / validLifts.length) : null;

    return (
        <div className="glass-card">
            <div className="ab-header">
                <h5 className="card-title label-with-info">
                    A/B Testing (LSTM vs GRU)
                    <InfoIcon text="Compares A variant (LSTM) and B variant (GRU) on key evaluation metrics." />
                </h5>
                <span className={`ab-overall-badge ${overallWinner === 'GRU' ? 'ab-gru' : overallWinner === 'LSTM' ? 'ab-lstm' : 'ab-tie'}`}>
                    {loading ? '...' : `${overallWinner} Lead`}
                </span>
            </div>

            <div className="ab-summary">
                <div className="ab-summary-item">
                    <div className="info-label label-with-info">Variant A<InfoIcon text="Control variant in this panel: LSTM." /></div>
                    <div className="ab-summary-value">LSTM</div>
                </div>
                <div className="ab-summary-item">
                    <div className="info-label label-with-info">Variant B<InfoIcon text="Challenger variant in this panel: GRU." /></div>
                    <div className="ab-summary-value">GRU</div>
                </div>
                <div className="ab-summary-item">
                    <div className="info-label label-with-info">Metric Wins<InfoIcon text="How many important metrics each variant wins." /></div>
                    <div className="ab-summary-value">{loading ? '...' : `LSTM ${lstmWins} / GRU ${gruWins}`}</div>
                </div>
                <div className="ab-summary-item">
                    <div className="info-label label-with-info">Avg. Lift (GRU vs LSTM)<InfoIcon text="Average percentage improvement/degradation of GRU relative to LSTM across included metrics." /></div>
                    <div className={`ab-summary-value ${avgLift != null && avgLift > 0 ? 'ab-positive' : avgLift != null && avgLift < 0 ? 'ab-negative' : ''}`}>
                        {loading ? '...' : (avgLift == null ? 'N/A' : `${avgLift.toFixed(2)}%`)}
                    </div>
                </div>
            </div>

            <div className="table-container table-container-no-scroll">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>
                                Metric
                                <InfoIcon text="Important model quality metrics used for A/B comparison." />
                            </th>
                            <th>
                                LSTM (A)
                                <InfoIcon text="Metric value for A variant (LSTM)." />
                            </th>
                            <th>
                                GRU (B)
                                <InfoIcon text="Metric value for B variant (GRU)." />
                            </th>
                            <th>
                                Delta (B - A)
                                <InfoIcon text="Absolute difference between GRU and LSTM values." />
                            </th>
                            <th>
                                Lift %
                                <InfoIcon text="Relative change (%) of GRU against LSTM." />
                            </th>
                            <th>
                                Better
                                <InfoIcon text="Winner for each metric. Lower value wins for all listed metrics." />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key}>
                                <td>
                                    <div className="ab-metric-name">{row.label}</div>
                                    <div className="ab-metric-sub">{row.description}</div>
                                </td>
                                <td>{loading ? '...' : formatValue(row.lstmValue)}</td>
                                <td>{loading ? '...' : formatValue(row.gruValue)}</td>
                                <td>{loading ? '...' : formatDelta(row.delta)}</td>
                                <td>{loading ? '...' : (row.lift == null ? 'N/A' : `${row.lift.toFixed(2)}%`)}</td>
                                <td>
                                    <span className={`ab-winner-badge ${row.winner === 'LSTM' ? 'ab-lstm' : row.winner === 'GRU' ? 'ab-gru' : 'ab-tie'}`}>
                                        {loading ? '...' : row.winner}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ABTestingPanel;
