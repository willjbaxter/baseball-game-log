---
title: "Barrel Map"
---

# Barrel Map

Exit velocity vs launch angle for all batted balls from attended games.

<div class="chart-container">
    <div id="barrelChart" style="width: 100%; height: 600px;"></div>
</div>

<script>
// Load data from static files
fetch('/barrel_map.json')
.then(response => response.json())
.then(barrelData => {

// Prepare data for Plotly
const homeRuns = barrelData.filter(d => d.outcome === 'home_run');
const hits = barrelData.filter(d => d.outcome === 'hit');
const outs = barrelData.filter(d => d.outcome === 'out');

const traces = [
    {
        x: outs.map(d => d.launch_speed),
        y: outs.map(d => d.launch_angle),
        mode: 'markers',
        type: 'scatter',
        name: 'Outs',
        marker: {
            color: '#666',
            size: 6,
            opacity: 0.6
        },
        text: outs.map(d => `${d.batter_name}<br>${d.description}<br>${d.matchup}`),
        hovertemplate: '%{text}<br>%{x}mph, %{y}°<extra></extra>'
    },
    {
        x: hits.map(d => d.launch_speed),
        y: hits.map(d => d.launch_angle),
        mode: 'markers',
        type: 'scatter',
        name: 'Hits',
        marker: {
            color: '#4ecdc4',
            size: 8,
            opacity: 0.8
        },
        text: hits.map(d => `${d.batter_name}<br>${d.description}<br>${d.matchup}`),
        hovertemplate: '%{text}<br>%{x}mph, %{y}°<extra></extra>'
    },
    {
        x: homeRuns.map(d => d.launch_speed),
        y: homeRuns.map(d => d.launch_angle),
        mode: 'markers',
        type: 'scatter',
        name: 'Home Runs',
        marker: {
            color: '#ff6b6b',
            size: 12,
            opacity: 1
        },
        text: homeRuns.map(d => `${d.batter_name}<br>${d.description}<br>${d.matchup}`),
        hovertemplate: '%{text}<br>%{x}mph, %{y}°<extra></extra>'
    }
];

const layout = {
    title: 'Exit Velocity vs Launch Angle',
    xaxis: {
        title: 'Exit Velocity (mph)',
        range: [60, 120],
        gridcolor: '#444'
    },
    yaxis: {
        title: 'Launch Angle (degrees)',
        range: [-20, 50],
        gridcolor: '#444'
    },
    paper_bgcolor: '#2d2d2d',
    plot_bgcolor: '#2d2d2d',
    font: { color: '#e0e0e0' },
    showlegend: true,
    hovermode: 'closest'
};

const config = {
    responsive: true,
    displayModeBar: false
};

Plotly.newPlot('barrelChart', traces, layout, config);
})
.catch(error => {
    console.error('Error loading barrel map data:', error);
    document.getElementById('barrelChart').innerHTML = '<p>Error loading data</p>';
});
</script>