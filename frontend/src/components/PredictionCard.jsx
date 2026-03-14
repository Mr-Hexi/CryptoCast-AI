import React from 'react';
import InfoIcon from './InfoIcon';

const PredictionCard = ({ title, price, modelType, loading }) => {
    const isLstm = modelType === 'lstm';
    const isGru = modelType === 'gru';
    const isCurrent = modelType === 'current';

    const formatPrice = (p) => {
        if (!p) return '...';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p);
    };

    const infoText = isCurrent
        ? 'Latest fetched BTC market price from the historical feed.'
        : 'Predicted BTC price for the next one-hour horizon.';

    return (
        <div className="glass-card">
            <div className="pred-card-body">
                <div>
                    <h3 className="pred-title label-with-info">
                        {title}
                        <InfoIcon text={infoText} />
                    </h3>
                    {loading ? (
                        <div className="skeleton skeleton-text"></div>
                    ) : (
                        <div className={`pred-price ${isLstm ? 'lstm' : isGru ? 'gru' : ''}`} style={isCurrent ? { color: '#fff' } : {}}>
                            {formatPrice(price)}
                        </div>
                    )}
                </div>
                <div className="pred-footer">
                    {isCurrent ? (
                        <>
                            <span className="dot" style={{ backgroundColor: '#fff' }}></span>
                            Latest fetched market price
                        </>
                    ) : (
                        <>
                            <span className={`dot ${isLstm ? 'lstm' : 'gru'}`}></span>
                            Predicting next 1 hour
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PredictionCard;
