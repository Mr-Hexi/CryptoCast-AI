import React, { useState, useEffect } from 'react';
import { getMetrics, getModelInfo, getForecast, getROIAnalysis, getDriftAnalysis } from '../services/api';

import PredictionCard from '../components/PredictionCard';
import ModelInfo from '../components/ModelInfo';
import ModelMetrics from '../components/ModelMetrics';
import ForecastChart from '../components/ForecastChart';
import ForecastComparison from '../components/ForecastComparison';
import ROIAnalysis from '../components/ROIAnalysis';
import DriftPanel from '../components/DriftPanel';
import ABTestingPanel from '../components/ABTestingPanel';

const Dashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [info, setInfo] = useState(null);
    const [forecasts, setForecasts] = useState(null);
    const [roi, setRoi] = useState(null);
    const [drift, setDrift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePanel, setActivePanel] = useState('forecasts');

    const loadData = async () => {
        setLoading(true);
        try {
            const [metricsRes, infoRes, forecastRes, roiRes, driftRes] = await Promise.all([
                getMetrics(),
                getModelInfo(),
                getForecast(),
                getROIAnalysis(1000),
                getDriftAnalysis(),
            ]);

            setMetrics(metricsRes);
            setInfo(infoRes);
            setForecasts(forecastRes);
            setRoi(roiRes);
            setDrift(driftRes);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);


    const lstmData = forecasts?.lstm_forecast || [];
    const gruData = forecasts?.gru_forecast || [];
    const historyData = forecasts?.history || [];

    const currentPrice = historyData.length > 0 ? historyData[historyData.length - 1].price : null;
    const lstmNextPrice = lstmData.length > 0 ? lstmData[0].price : null;
    const gruNextPrice = gruData.length > 0 ? gruData[0].price : null;

    return (
        <div className="container">
            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">BTC Forecast Dashboard</h1>
                    <p className="dashboard-subtitle">Real-time MLflow metrics, registry stages, and predictions</p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="btn-primary"
                >
                    {loading && (
                        <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </header>

            <nav className="feature-nav">
                <button
                    className={`feature-link ${activePanel === 'forecasts' ? 'active' : ''}`}
                    onClick={() => setActivePanel('forecasts')}
                >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Forecasts
                </button>
                <button
                    className={`feature-link ${activePanel === 'roi' ? 'active' : ''}`}
                    onClick={() => setActivePanel('roi')}
                >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 12h10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    ROI Analysis
                </button>
                <button
                    className={`feature-link ${activePanel === 'drift' ? 'active' : ''}`}
                    onClick={() => setActivePanel('drift')}
                >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
                    </svg>
                    Drift Detection
                </button>
                <button
                    className={`feature-link ${activePanel === 'ab-testing' ? 'active' : ''}`}
                    onClick={() => setActivePanel('ab-testing')}
                >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 5h16M4 12h16M4 19h16" strokeLinecap="round" />
                        <circle cx="8" cy="5" r="2" />
                        <circle cx="16" cy="12" r="2" />
                        <circle cx="11" cy="19" r="2" />
                    </svg>
                    A/B Testing
                </button>
            </nav>

            {activePanel === 'forecasts' && (
                <div className="section-anchor">
                    {/* Top Row: Model Info, Prediction Cards, Metrics */}
                    <div className="grid-top">
                        {/* Model Info */}
                        <div className="model-info-container">
                            <ModelInfo info={info} loading={loading} />
                        </div>

                        {/* Prediction Cards */}
                        <div className="grid-predictions">
                            <PredictionCard
                                title="Current BTC Price"
                                price={currentPrice}
                                modelType="current"
                                loading={loading}
                            />
                            <PredictionCard
                                title="LSTM Next Price"
                                price={lstmNextPrice}
                                modelType="lstm"
                                loading={loading}
                            />
                            <PredictionCard
                                title="GRU Next Price"
                                price={gruNextPrice}
                                modelType="gru"
                                loading={loading}
                            />
                        </div>

                        {/* Metrics Table */}
                        <div className="metrics-container">
                            <ModelMetrics metrics={metrics} loading={loading} />
                        </div>
                    </div>

                    {/* Second Row: Comparison Chart */}
                    <div className="mb-6">
                        <ForecastComparison historyData={historyData} lstmData={lstmData} gruData={gruData} loading={loading} />
                    </div>

                    {/* Third Row: Individual Forecast Charts */}
                    <div className="grid-bottom">
                        <ForecastChart
                            historyData={historyData}
                            forecastData={lstmData}
                            modelType="lstm"
                            title="LSTM Single-Model Forecast"
                            loading={loading}
                        />
                        <ForecastChart
                            historyData={historyData}
                            forecastData={gruData}
                            modelType="gru"
                            title="GRU Single-Model Forecast"
                            loading={loading}
                        />
                    </div>
                </div>
            )}

            {activePanel === 'roi' && (
                <div className="mb-6 section-anchor">
                    <ROIAnalysis
                        roi={roi}
                        loading={loading}
                    />
                </div>
            )}

            {activePanel === 'drift' && (
                <div className="mb-6 section-anchor">
                    <DriftPanel drift={drift} loading={loading} />
                </div>
            )}

            {activePanel === 'ab-testing' && (
                <div className="mb-6 section-anchor">
                    <ABTestingPanel metrics={metrics} loading={loading} />
                </div>
            )}
        </div>
    );
};

export default Dashboard;
