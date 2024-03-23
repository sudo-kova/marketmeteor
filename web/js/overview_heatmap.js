export function create_heatmap() {
    fetch('/api/get-heatmap-data', {
        cache: 'no-cache',
    })
    .then(response => response.json())
    .then(data => {
        // Function to extract column values from the dataset
        function unpack(rows, key) {
            return rows.map(row => row[key]);
        }

        function createTooltipText(rows) {
            return rows.map(row => row.join('<br>')); // Joining all column values with <br>
        }

        const scl = [
            [0, '#FF76B7'],     // Red at the smallest value (0% of the scale)
            [1, '#76FFBF']      // Green at the largest value (100% of the scale)
        ];

        var data = [{
            type: 'scattergeo',
            mode: 'markers',
            text: createTooltipText(data),
            lat: unpack(data, 5),   // Using column 8 for latitude
            lon: unpack(data, 6),   // Using column 7 for longitude
            marker: {
                color: unpack(data, 8),  // Using live1d for coloring
                colorscale: scl,
                cmin: -10,
                cmax: 10,
                reversescale: true,
                opacity: 0.5,
                size: 10,
                colorbar: {
                    title: 'Live 1D Change'
                }
            },
        }];

        var layout = {
            geo: {
                scope: 'north america',
                showland: true,
                landcolor: 'rgb(212,212,212)',
                subunitcolor: 'rgb(255,255,255)',
                countrycolor: 'rgb(255,255,255)',
                showlakes: true,
                lakecolor: 'rgb(255,255,255)',
                showsubunits: true,
                showcountries: true,
                resolution: 50,
                projection: {
                    type: 'conic conformal',
                    rotation: {
                        long: -100
                    }
                },
            },
            title: 'Ticker Data Visualization',
            width: 600,
            height: 600
        };

        Plotly.newPlot('graphDivHeatmap', data, layout);
    })
    .catch(error => {
        console.error('Error fetching heatmap data:', error);
    });
}
