import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import InfoIcon from './InfoIcon';

const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', border: '1px solid rgba(48, 54, 61, 0.8)', padding: '12px', borderRadius: '8px', color: '#e6edf3' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color, margin: '0 0 4px 0', fontWeight: '600', fontSize: '14px' }}>
                        {entry.name}: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const ForecastComparison = ({ historyData, lstmData, gruData, loading }) => {
    const mergedData = [];

    if (historyData && historyData.length > 0) {
        historyData.forEach(item => {
            mergedData.push({
                date: item.date,
                history_price: item.price
            });
        });

        if ((lstmData?.length > 0) || (gruData?.length > 0)) {
            const lastHistory = historyData[historyData.length - 1];
            mergedData.push({
                date: lastHistory.date,
                history_price: lastHistory.price,
                lstm_price: lastHistory.price,
                gru_price: lastHistory.price
            });
        }
    }

    if (lstmData?.length > 0 || gruData?.length > 0) {
        const maxLen = Math.max(lstmData?.length || 0, gruData?.length || 0);
        for (let i = 0; i < maxLen; i++) {
            mergedData.push({
                date: lstmData?.[i]?.date || gruData?.[i]?.date,
                lstm_price: lstmData?.[i]?.price || null,
                gru_price: gruData?.[i]?.price || null,
            });
        }
    }

    return (
        <div className="glass-card">
            <h5 className="card-title label-with-info">
                Forecast Comparison (Next 24 Hours)
                <InfoIcon text="Side-by-side trajectory of historical BTC price and 24-hour model forecasts." />
            </h5>

            <div className="chart-wrapper chart-comparison">
                {loading ? (
                    <div className="skeleton-chart skeleton">
                        <div className="skeleton-dot skeleton"></div>
                        <div className="skeleton-dot skeleton"></div>
                        <div className="skeleton-dot skeleton"></div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                                domain={['auto', 'auto']}
                                stroke="#8b949e"
                                tick={{ fill: '#8b949e', fontSize: 12 }}
                                tickFormatter={(val) => `$${val.toLocaleString()}`}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

                            <Line
                                type="monotone"
                                dataKey="history_price"
                                name="Recent BTC Price"
                                stroke="#8b949e"
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4, fill: '#8b949e', stroke: '#0d1117', strokeWidth: 2 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="lstm_price"
                                name="LSTM Forecast"
                                stroke="#58a6ff"
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 6, fill: '#58a6ff', stroke: '#0d1117', strokeWidth: 2 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="gru_price"
                                name="GRU Forecast"
                                stroke="#3fb950"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 0 }}
                                activeDot={{ r: 6, fill: '#3fb950', stroke: '#0d1117', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default ForecastComparison;
