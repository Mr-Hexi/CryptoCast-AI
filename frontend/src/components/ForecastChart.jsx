import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import InfoIcon from './InfoIcon';

const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value);
        return (
            <div style={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', border: '1px solid rgba(48, 54, 61, 0.8)', padding: '12px', borderRadius: '8px', color: '#e6edf3' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{label}</p>
                <p style={{ margin: 0 }}>
                    <span style={{ fontWeight: '600' }}>{payload[0].name}: </span>
                    {price}
                </p>
            </div>
        );
    }
    return null;
};

const ForecastChart = ({ historyData, forecastData, modelType, title, loading }) => {
    const forecastColor = '#ef4444';
    const historyColor = '#58a6ff';

    const mergedData = [];
    if (historyData && historyData.length > 0) {
        historyData.forEach(item => {
            mergedData.push({
                date: item.date,
                history_price: item.price
            });
        });

        if (forecastData && forecastData.length > 0) {
            const lastHistory = historyData[historyData.length - 1];
            mergedData.push({
                date: lastHistory.date,
                history_price: lastHistory.price,
                forecast_price: lastHistory.price
            });
        }
    }

    if (forecastData && forecastData.length > 0) {
        forecastData.forEach(item => {
            mergedData.push({
                date: item.date,
                forecast_price: item.price
            });
        });
    }

    return (
        <div className="glass-card">
            <h5 className="card-title label-with-info">
                {title}
                <InfoIcon text={`Single-model ${modelType?.toUpperCase() || ''} forecast view against recent BTC history.`} />
            </h5>

            <div className="chart-wrapper chart-single">
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
                            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                            <Line
                                type="monotone"
                                dataKey="history_price"
                                name="Recent BTC Price"
                                stroke={historyColor}
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4, fill: historyColor, stroke: '#0d1117', strokeWidth: 2 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="forecast_price"
                                name="24-Hour Forecast"
                                stroke={forecastColor}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 0 }}
                                activeDot={{ r: 4, fill: forecastColor, stroke: '#0d1117', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default ForecastChart;
