import { palette_purple, palette_red, palette_yellow, palette_green } from './colors.js';

export function plot_indicies(){

    fetch("/api/majorindicies-timeseries", { cache: 'no-cache' })
    .then(response => response.text()) // Get the response text instead of trying to parse as JSON
    .then(csvString => {
        const rows = csvString.split('\n').slice(1); // Skip the header row
        const data = rows.map(row => {
            const [datetime, close] = row.split(',');
            return { Datetime: datetime, Close: parseFloat(close) };
        });

        // Trace for the plot
        const trace = {
            x: data.map(row => row.Datetime),
            y: data.map(row => row.Close),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: '#6f42c1', // Replace with your preferred color
                width: 2
            },
            name: 'Close Price'
        };

        const firstDatetime = data.length > 0 ? data[0].Datetime.split(' ')[0] : null;
        const rangeStart = firstDatetime ? `${firstDatetime} 09:30` : '09:30';
        const rangeEnd = firstDatetime ? `${firstDatetime} 15:59` : '15:59';

        // Layout configuration
        const layout = {
            margin: { l: 50, r: 25, b: 25, t: 25 },
            paper_bgcolor: 'rgb(16 16 16 / 0%)',
            plot_bgcolor: 'rgb(16 16 16 / 0%)',
            xaxis: {
                color: '#868D98',
                gridcolor: '#444',
                // range: [trace[0] ? trace[0].Datetime : '09:30', '15:59']  // Set the x-axis range
                range: [rangeStart, rangeEnd]  // Set the x-axis range
                // range: [trace.x[0], trace.x[trace.x.length - 1]]
            },
            yaxis: {
                color: '#868D98',
                gridcolor: '#444'
            }
        };

        // Configuration for the plot
        const config = {
            modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian']
        };

        // Render the plot
        Plotly.newPlot('graphDivMajorIndicies', [trace], layout, config);


    })
    .catch(error => console.error('Error fetching data:', error));
}