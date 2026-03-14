import React from 'react';

const InfoIcon = ({ text }) => (
    <span
        className="metric-info-icon info-inline"
        data-tooltip={text}
        aria-label={text}
        role="img"
    >
        i
    </span>
);

export default InfoIcon;
