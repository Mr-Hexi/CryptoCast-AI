import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import InfoIcon from './InfoIcon';

const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
};

const statusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'low') return 'drift-low';
    if (s === 'moderate') return 'drift-moderate';
    if (s === 'high') return 'drift-high';
    return 'drift-low';
};

const DriftPanel = ({ drift, loading }) => {
    const timeline = drift?.timeline || [];
    const featureDrift = drift?.feature_drift || {};
    const featureEntries = Object.entries(featureDrift);

    return (
        <div className="glass-card">
            <div className="drift-header">
                <h5 className="card-title label-with-info">
                    Data Drift Detection
                    <InfoIcon text="Tracks how much recent production data deviates from baseline training behavior." />
                </h5>
                <span className={`drift-badge ${statusClass(drift?.status)}`}>
                    {loading ? '...' : (drift?.status || 'unknown').toUpperCase()}
                </span>
            </div>

            <div className="drift-summary">
                <div>
                    <div className="info-label label-with-info">
                        Overall Drift Score
                        <InfoIcon text="Aggregate drift indicator derived from monitored features. Higher means stronger drift." />
                    </div>
                    <div className="drift-score">{loading ? '...' : (drift?.overall_drift_score ?? 'N/A')}</div>
                </div>
                <div>
                    <div className="info-label label-with-info">
                        Baseline / Recent
                        <InfoIcon text="Number of samples used for baseline and recent drift comparison windows." />
                    </div>
                    <div className="drift-score-small">
                        {loading ? '...' : `${drift?.baseline_points || 0} / ${drift?.recent_points || 0}`}
                    </div>
                </div>
            </div>

            <div className="chart-wrapper chart-drift">
                {loading ? (
                    <div className="skeleton-chart skeleton">
                        <div className="skeleton-dot skeleton"></div>
                        <div className="skeleton-dot skeleton"></div>
                        <div className="skeleton-dot skeleton"></div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatTime}
                                stroke="#8b949e"
                                tick={{ fill: '#8b949e', fontSize: 12 }}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis
                                domain={[0, 'auto']}
                                stroke="#8b949e"
                                tick={{ fill: '#8b949e', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                width={60}
                            />
                            <Tooltip
                                formatter={(value) => [Number(value).toFixed(4), 'Drift Score']}
                                labelFormatter={(label) => formatTime(label)}
                            />
                            <Line
                                type="monotone"
                                dataKey="drift_score"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#0d1117', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="drift-features">
                {loading ? (
                    <div className="skeleton skeleton-box"></div>
                ) : (
                    featureEntries.map(([feature, value]) => (
                        <div key={feature} className="drift-feature-item">
                            <span className="label-with-info">
                                {feature}
                                <InfoIcon text="Per-feature PSI drift score and severity level." />
                            </span>
                            <span>{value.psi} ({value.level})</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DriftPanel;
