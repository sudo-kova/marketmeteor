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
                reversescale: false,
                opacity: 0.5,
                size: 10,
                colorbar: {
                    title: '% Change'
                }
            },
        }];

        var layout = {
            geo: {
                scope: 'world', // Use 'world' to have the flexibility to show multiple regions
                showland: true,
                landcolor: '#333',  // Darker land color
                subunitcolor: '#444',  // Darker subunit color
                countrycolor: '#555',  // Darker country border color
                showlakes: true,
                lakecolor: '#444',  // Darker lake color
                bgcolor: 'rgb(16, 16, 16)',  // Dark background color for the map
                bordercolor: '#555',  // Darker border color
                coastlinecolor: '#555',  // Darker coastline color
                showsubunits: true,
                showcountries: true,
                resolution: 50,
                projection: {
                    type: 'mercator', // A projection type that works well for world maps
                },
                center: { // Manually adjust the center to show South America and the UK
                    lon: -30,
                    lat: 20
                }
            },
            paper_bgcolor: 'rgb(16, 16, 16)',  // Dark background color
            plot_bgcolor: 'rgb(16, 16, 16)',  // Dark plot area color
            width: 600,
            height: 600
        };

        Plotly.newPlot('graphDivHeatmap', data, layout);
    })
    .catch(error => {
        console.error('Error fetching heatmap data:', error);
    });
}
