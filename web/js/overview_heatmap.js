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
            return rows.map(row => {
                return `Ticker: ${row[0]}<br>` +
                       `Current Price: ${parseFloat(row[1]).toFixed(2)}<br>` +
                       `Pulled At: ${row[2]}<br>` +
                       `City: ${row[3]}<br>` +
                       `State: ${row[4]}<br>` +
                       `Close: ${row[7]}<br>` +
                       `1d %: ${ parseFloat(row[8]).toFixed(2)}`;
            });
        }

        const scl = [
            [0, '#ff76b6'],       // Red for the smallest value (0% of the scale, assuming negative values)
            [0.5, '#fbff76'],     // Red up to the middle of the scale (0 on your scale)
            [0.5, '#76ffbf'],   // Green from the middle of the scale (0 on your scale)
            [1, '#76ffbf']      // Green for the largest value (100% of the scale, assuming positive values)
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
                cmin: -20,
                cmax: 20,
                reversescale: false,
                opacity: 0.5,
                size: 3,
                colorbar: {
                    title: '% Change',
                    thickness: 20,
                    // titleside: 'right',
                    ticks: 'outside',
                    ticklen: 1,
                    shoticksuffix: 'last',
                    dtick: 5
                }
            },
        }];

        var layout = {
            margin: {
                l: 10,  // Left margin
                r: 0,  // Right margin
                t: 0,  // Top margin
                b: 0   // Bottom margin
            },      
            geo: {
                scope: 'world', // Use 'world' to have the flexibility to show multiple regions
                showland: true,
                landcolor: '#333',  // Darker land color
                subunitcolor: '#444',  // Darker subunit color
                countrycolor: '#555',  // Darker country border color
                showlakes: true,
                lakecolor: '#444',  // Darker lake color
                bgcolor: 'rgb(16 16 16 / 0%)',
                // bordercolor: 'red',  // Darker border color
                coastlinecolor: '#555',  // Darker coastline color
                showsubunits: true,
                showcountries: true,
                showframe: false,       // Hide frame
                resolution: 100,
                projection: {
                    type: 'mercator', // A projection type that works well for world maps
                },
                // center: { // Manually adjust the center to show South America and the UK
                //     lon: -30,
                //     lat: 20
                // }
            },
            paper_bgcolor: 'rgb(16 16 16 / 0%)',
            plot_bgcolor: 'rgb(16 16 16 / 0%)',
            width: 600,
            height: 600
        };

        Plotly.newPlot('graphDivHeatmap', data, layout);
    })
    .catch(error => {
        console.error('Error fetching heatmap data:', error);
    });
}
