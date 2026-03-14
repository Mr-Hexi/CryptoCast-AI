import axios from 'axios';

// Update baseURL if Django runs on a different host/port
const API_BASE = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_BASE,
});

export const getMetrics = async () => {
    const response = await api.get('/models/metrics/');
    return response.data;
};

export const getModelInfo = async () => {
    const response = await api.get('/models/info/');
    return response.data;
};

export const getForecast = async () => {
    const response = await api.get('/models/forecast/');
    return response.data;
};

export const getROIAnalysis = async (capital = 1000) => {
    const response = await api.get('/models/roi/', { params: { capital } });
    return response.data;
};

export const getDriftAnalysis = async () => {
    const response = await api.get('/models/drift/');
    return response.data;
};
