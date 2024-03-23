export function create_heatmap() {
    fetch('/api/get-heatmap-data', {
        cache: 'no-cache',
    })
    .then(response => response.json())
    .then(data => {
        // Extract the header and rows
        const header = data[0];
        const rows = data.slice(1);

        // Extract the columns we need
        const tickers = rows.map(row => row[0]);
        const live1d = rows.map(row => parseFloat(row[6]));

        // Prepare data for the heatmap
        const heatmapData = [{
            type: 'heatmap',
            x: tickers,  // Tickers on x-axis
            y: ['Live 1D'],  // Single y-axis category
            z: [live1d],  // live1d values as 2D array
            colorscale: 'Viridis',  // Color scale
        }];

        // Define layout
        const layout = {
            title: 'Live 1D Change Heatmap',
            xaxis: {
                title: 'Ticker',
                type: 'category'
            },
            yaxis: {
                title: ''
            }
        };

        // Create the plot in the div with id 'graphDivHeatmap'
        Plotly.newPlot('graphDivHeatmap', heatmapData, layout);
    })
    .catch(error => {
        console.error('Error fetching heatmap data:', error);
    });
}
