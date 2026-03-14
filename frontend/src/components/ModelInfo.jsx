import React from 'react';
import InfoIcon from './InfoIcon';

const ModelInfo = ({ info, loading }) => {
    if (loading || !info) {
        return (
            <div className="glass-card">
                <h5 className="card-title label-with-info">
                    Model Registry Info
                    <InfoIcon text="MLflow registry stage and version currently tracked by the dashboard." />
                </h5>
                <div className="skeleton skeleton-box"></div>
                <div className="skeleton skeleton-box"></div>
            </div>
        );
    }

    const getStageClass = (stage) => {
        const s = (stage || '').toLowerCase();
        if (s === 'production') return 'production';
        if (s === 'staging') return 'staging';
        if (s === 'archived') return 'archived';
        return 'default';
    };

    return (
        <div className="glass-card">
            <h5 className="card-title label-with-info">
                Model Registry Info
                <InfoIcon text="MLflow registry stage and version currently tracked by the dashboard." />
            </h5>

            <div className="info-boxes">
                <div className="info-box lstm">
                    <div>
                        <h6 className="info-label label-with-info">
                            LSTM Model
                            <InfoIcon text="Metadata for the LSTM model variant in registry." />
                        </h6>
                        <div className="info-details">
                            <span className={`badge ${getStageClass(info.lstm?.stage)}`}>
                                {info.lstm?.stage || 'N/A'}
                            </span>
                            <span className="version-text">Ver: {info.lstm?.version || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="info-box gru">
                    <div>
                        <h6 className="info-label label-with-info">
                            GRU Model
                            <InfoIcon text="Metadata for the GRU model variant in registry." />
                        </h6>
                        <div className="info-details">
                            <span className={`badge ${getStageClass(info.gru?.stage)}`}>
                                {info.gru?.stage || 'N/A'}
                            </span>
                            <span className="version-text">Ver: {info.gru?.version || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelInfo;
