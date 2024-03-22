import { palette_purple, palette_red, palette_yellow, palette_green, palette_light_gray } from './colors.js';

export function plot_indicies(){

    fetch("/api/majorindicies-timeseries", { cache: 'no-cache' })
    .then(response => response.json())  // Parse as JSON
    .then(data => {
        const traces = [];

        if (Array.isArray(data) && data.length > 0) {
            for (let index in data[0]) {
                if (index !== "Datetime") {
                    // Find the first non-null value as the baseline for percentage calculation
                    const firstNonEmptyEntry = data.find(entry => entry[index]);
                    const baseline = firstNonEmptyEntry ? parseFloat(firstNonEmptyEntry[index]) : null;

                    if (baseline) { // Proceed only if a baseline is found
                        const trace = {
                            x: data.map(entry => entry.Datetime),
                            y: data.map(entry => {
                                const value = parseFloat(entry[index]);
                                return value ? ((value - baseline) / baseline) * 100 : null; // Calculate percentage change
                            }),
                            type: 'scatter',
                            mode: 'lines',
                            line: {
                                color: index === '^DJI' ? palette_red : 
                                index === '^GSPC' ? palette_green : 
                                index === '^NDX' ? palette_purple : 
                                index === '^VIX' ? palette_light_gray : 
                                palette_yellow, // Default color for other indices
                                width: 2
                            },
                            name: index
                        };
                        traces.push(trace);
                    }
                }
            }
        }

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
            // height: 600,  // Set the plot height
            margin: { l: 50, r: 25, b: 25, t: 25 },
            paper_bgcolor: 'rgb(16 16 16 / 0%)',
            plot_bgcolor: 'rgb(16 16 16 / 0%)',
            xaxis: {
                color: '#868D98',
                gridcolor: '#444',
                // range: [trace[0] ? trace[0].Datetime : '09:30', '15:59']  // Set the x-axis range
                range: [rangeStart, rangeEnd],  // Set the x-axis range
                // range: [trace.x[0], trace.x[trace.x.length - 1]]
                title: 'Time'  // Add a title to the X-axis
            },
            yaxis: {
                color: '#868D98',
                gridcolor: '#444',
                title: '% Change'  // Add a title to the Y-axis

            }
        };

        // Configuration for the plot
        const config = {
            responsive: true, // Ensures plot resizes with container
            modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian']
        };

        // Render the plot
        // Plotly.newPlot('graphDivMajorIndicies', traces, layout, config, {responsive: true});
        Plotly.newPlot('graphDivMajorIndicies', traces, layout, config);


    })
    .catch(error => console.error('Error fetching data:', error));
}