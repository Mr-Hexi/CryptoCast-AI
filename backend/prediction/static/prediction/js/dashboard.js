// Colors (matching CSS)
const COLORS = {
    lstm: {
        border: '#58a6ff',
        bg: 'rgba(88, 166, 255, 0.1)',
        hover: 'rgba(88, 166, 255, 0.2)'
    },
    gru: {
        border: '#3fb950',
        bg: 'rgba(63, 185, 80, 0.1)',
        hover: 'rgba(63, 185, 80, 0.2)'
    },
    grid: 'rgba(48, 54, 61, 0.5)',
    text: '#8b949e'
};

// Chart instances
let charts = {
    comparison: null,
    lstm: null,
    gru: null
};

// Global Chart default config
Chart.defaults.color = COLORS.text;
Chart.defaults.font.family = "'Inter', sans-serif";
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: {
            position: 'top',
            labels: { color: '#e6edf3', usePointStyle: true, boxWidth: 8 }
        },
        tooltip: {
            backgroundColor: 'rgba(13, 17, 23, 0.9)',
            titleColor: '#e6edf3',
            bodyColor: '#e6edf3',
            borderColor: 'rgba(48, 54, 61, 0.8)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
                label: function (context) {
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        x: {
            grid: { display: false, color: COLORS.grid },
            ticks: {
                maxTicksLimit: 8,
                callback: function (val, index) {
                    // Just show Hour:Minute for cleaner x-axis
                    const dateStr = this.getLabelForValue(val);
                    if (!dateStr) return '';
                    const date = new Date(dateStr);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            }
        },
        y: {
            grid: { color: COLORS.grid },
            ticks: {
                callback: function (value) {
                    return '$' + value.toLocaleString();
                }
            }
        }
    }
};

/**
 * Initialize charts
 */
function initCharts() {
    // Comparison Chart
    const ctxComp = document.getElementById('comparisonChart').getContext('2d');
    charts.comparison = new Chart(ctxComp, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            ...commonOptions,
            plugins: { ...commonOptions.plugins, title: { display: false } }
        }
    });

    // LSTM Chart
    const ctxLstm = document.getElementById('lstmChart').getContext('2d');
    charts.lstm = new Chart(ctxLstm, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { ...commonOptions, plugins: { legend: { display: false } } }
    });

    // GRU Chart
    const ctxGru = document.getElementById('gruChart').getContext('2d');
    charts.gru = new Chart(ctxGru, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { ...commonOptions, plugins: { legend: { display: false } } }
    });
}

/**
 * Fetch and Render Data
 */
async function loadDashboardData() {
    const btn = document.getElementById('refreshBtn');
    const spinner = document.getElementById('refreshSpinner');

    // UI Loading state
    btn.disabled = true;
    spinner.classList.remove('d-none');

    try {
        // Fetch concurrently, API urls injected in HTML
        const [metricsRes, infoRes, forecastRes] = await Promise.all([
            fetch(API_GET_METRICS),
            fetch(API_GET_INFO),
            fetch(API_GET_FORECAST)
        ]);

        const metrics = await metricsRes.json();
        const info = await infoRes.json();
        const forecasts = await forecastRes.json();

        updateMetricsTable(metrics);
        updateModelInfo(info);
        updateCharts(forecasts);
        updateNextPrices(forecasts);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        alert("Failed to load dashboard data. Check backend connection.");
    } finally {
        btn.disabled = false;
        spinner.classList.add('d-none');
    }
}

function updateMetricsTable(data) {
    if (data.lstm) {
        document.getElementById('lstmMae').textContent = data.lstm.mae !== null ? data.lstm.mae : 'N/A';
        document.getElementById('lstmRmse').textContent = data.lstm.rmse !== null ? data.lstm.rmse : 'N/A';
        document.getElementById('lstmTrainLoss').textContent = data.lstm.training_loss !== null ? data.lstm.training_loss : 'N/A';
    }
    if (data.gru) {
        document.getElementById('gruMae').textContent = data.gru.mae !== null ? data.gru.mae : 'N/A';
        document.getElementById('gruRmse').textContent = data.gru.rmse !== null ? data.gru.rmse : 'N/A';
        document.getElementById('gruTrainLoss').textContent = data.gru.training_loss !== null ? data.gru.training_loss : 'N/A';
    }
}

function updateModelInfo(data) {
    const setStageClass = (elemId, stage) => {
        const el = document.getElementById(elemId);
        el.textContent = stage;
        el.className = 'badge me-2'; // Reset

        if (stage.toLowerCase() === 'production') el.classList.add('bg-success');
        else if (stage.toLowerCase() === 'staging') el.classList.add('bg-warning', 'text-dark');
        else if (stage.toLowerCase() === 'archived') el.classList.add('bg-secondary');
        else el.classList.add('bg-primary');
    };

    if (data.lstm) {
        document.getElementById('lstmVersion').textContent = data.lstm.version;
        setStageClass('lstmStage', data.lstm.stage);
    }
    if (data.gru) {
        document.getElementById('gruVersion').textContent = data.gru.version;
        setStageClass('gruStage', data.gru.stage);
    }
}

function updateNextPrices(forecasts) {
    const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

    if (forecasts.lstm_forecast && forecasts.lstm_forecast.length > 0) {
        document.getElementById('lstmNextPrice').textContent = formatPrice(forecasts.lstm_forecast[0].price);
    } else {
        document.getElementById('lstmNextPrice').textContent = "N/A";
    }

    if (forecasts.gru_forecast && forecasts.gru_forecast.length > 0) {
        document.getElementById('gruNextPrice').textContent = formatPrice(forecasts.gru_forecast[0].price);
    } else {
        document.getElementById('gruNextPrice').textContent = "N/A";
    }
}

function updateCharts(forecasts) {
    // Determine labels from the one that has data
    let labels = [];
    if (forecasts.lstm_forecast && forecasts.lstm_forecast.length > 0) {
        labels = forecasts.lstm_forecast.map(f => f.date);
    } else if (forecasts.gru_forecast && forecasts.gru_forecast.length > 0) {
        labels = forecasts.gru_forecast.map(f => f.date);
    }

    const lstmData = (forecasts.lstm_forecast || []).map(f => f.price);
    const gruData = (forecasts.gru_forecast || []).map(f => f.price);

    // Update Comparison
    charts.comparison.data = {
        labels: labels,
        datasets: [
            {
                label: 'LSTM Forecast',
                data: lstmData,
                borderColor: COLORS.lstm.border,
                backgroundColor: COLORS.lstm.bg,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            },
            {
                label: 'GRU Forecast',
                data: gruData,
                borderColor: COLORS.gru.border,
                backgroundColor: COLORS.gru.bg,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: false,
                tension: 0.4
            }
        ]
    };
    charts.comparison.update();

    // Update Individual LSTM
    charts.lstm.data = {
        labels: labels,
        datasets: [{
            label: 'LSTM Predicted Price',
            data: lstmData,
            borderColor: COLORS.lstm.border,
            backgroundColor: COLORS.lstm.bg,
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
            tension: 0.4
        }]
    };
    charts.lstm.update();

    // Update Individual GRU
    charts.gru.data = {
        labels: labels,
        datasets: [{
            label: 'GRU Predicted Price',
            data: gruData,
            borderColor: COLORS.gru.border,
            backgroundColor: COLORS.gru.bg,
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
            tension: 0.4
        }]
    };
    charts.gru.update();
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    loadDashboardData();

    // Attach event listener to refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);
});
