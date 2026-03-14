import React from 'react';
import InfoIcon from './InfoIcon';

const fmtPct = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${Number(value).toFixed(2)}%`;
};

const fmtMoney = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const SignalBadge = ({ signal }) => {
    const s = (signal || 'hold').toLowerCase();
    const cls = s === 'buy' ? 'signal-buy' : s === 'sell' ? 'signal-sell' : 'signal-hold';
    return <span className={`signal-badge ${cls}`}>{s.toUpperCase()}</span>;
};

const ROIAnalysis = ({ roi, loading }) => {
    const lstm = roi?.models?.lstm || {};
    const gru = roi?.models?.gru || {};
    const consensus = roi?.consensus || {};

    return (
        <div className="glass-card">
            <h5 className="card-title label-with-info">
                ROI Analysis (Model Signals)
                <InfoIcon text="Expected return and projected portfolio value from each model signal." />
            </h5>
            <div className="roi-grid">
                <div className="roi-box">
                    <div className="roi-head">
                        <strong className="label-with-info">
                            LSTM
                            <InfoIcon text="Return projection from the LSTM model." />
                        </strong>
                        {loading ? '...' : <SignalBadge signal={lstm.signal} />}
                    </div>
                    <div className="roi-label label-with-info">
                        Expected Return
                        <InfoIcon text="Predicted percentage gain/loss over the configured horizon." />
                    </div>
                    <div className="roi-value" style={{ color: lstm.expected_return_pct > 0 ? 'var(--accent-green)' : lstm.expected_return_pct < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {loading ? '...' : fmtPct(lstm.expected_return_pct)}
                    </div>
                    <div className="roi-sub label-with-info">
                        Projected Value: {loading ? '...' : fmtMoney(lstm.projected_value)}
                        <InfoIcon text="Projected portfolio value after applying this model signal." />
                    </div>
                </div>

                <div className="roi-box">
                    <div className="roi-head">
                        <strong className="label-with-info">
                            GRU
                            <InfoIcon text="Return projection from the GRU model." />
                        </strong>
                        {loading ? '...' : <SignalBadge signal={gru.signal} />}
                    </div>
                    <div className="roi-label label-with-info">
                        Expected Return
                        <InfoIcon text="Predicted percentage gain/loss over the configured horizon." />
                    </div>
                    <div className="roi-value" style={{ color: gru.expected_return_pct > 0 ? 'var(--accent-green)' : gru.expected_return_pct < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {loading ? '...' : fmtPct(gru.expected_return_pct)}
                    </div>
                    <div className="roi-sub label-with-info">
                        Projected Value: {loading ? '...' : fmtMoney(gru.projected_value)}
                        <InfoIcon text="Projected portfolio value after applying this model signal." />
                    </div>
                </div>

                <div className="roi-box consensus">
                    <div className="roi-head">
                        <strong className="label-with-info">
                            Consensus
                            <InfoIcon text="Combined/aggregated view derived from model outputs." />
                        </strong>
                        <span className="roi-outlook">{loading ? '...' : (consensus.outlook || 'neutral').toUpperCase()}</span>
                    </div>
                    <div className="roi-label label-with-info">
                        Expected Return
                        <InfoIcon text="Predicted percentage gain/loss from the consensus strategy." />
                    </div>
                    <div className="roi-value" style={{ color: consensus.expected_return_pct > 0 ? 'var(--accent-green)' : consensus.expected_return_pct < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {loading ? '...' : fmtPct(consensus.expected_return_pct)}
                    </div>
                    <div className="roi-sub label-with-info">
                        Projected Value: {loading ? '...' : fmtMoney(consensus.projected_value)}
                        <InfoIcon text="Projected portfolio value under the consensus strategy." />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ROIAnalysis;
