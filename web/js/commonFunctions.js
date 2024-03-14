import { currentTicker, minute_data_shown, sectorDataCache } from './script_parallax.js';
import { csvToJSON} from './file.js';
import { palette_purple, palette_red, palette_yellow, palette_green } from './colors.js';

export function loadDataForTicker(ticker) {
    // added parsing for Last-Modified http header
    return fetch(`/api/chartdata/${ticker}.csv`, {
        cache: 'no-cache', // or 'reload'
        })
        .then(response => {
            // console.log('Fetch response:', response);

            // Check for last-modified header
            const lastModified = response.headers.get('Last-Modified');
            // console.log('Last modified date:', lastModified);
            document.getElementById('lastmodified').textContent = lastModified;

            // if (lastModified) {
            //     console.log('Last modified date:', lastModified);
            // }

            return response.text();
        })
        .then(csvText => {
            // console.log('CSV Text:', csvText);
            return csvToJSON(csvText);
        })
        .catch(error => {
            console.error('Error loading data:', error);
        });
}

export function plotGraph(ticker) {
    return new Promise((resolve, reject) => {
        loadDataForTicker(ticker).then(data => {


            // ---- before plotting, make sure the 1 minute plot is hidden

            // console.log('inside plotGraph')

            if (minute_data_shown) {

                // remove showdiv class from div with id = rd_oneminute
                // add hidediv class from div with id = rd_oneminute
                const oneMinuteDiv = document.getElementById('rd_oneminute');
                oneMinuteDiv.classList.remove('showdiv');
                oneMinuteDiv.classList.add('hidediv');

                // remove showdiv class from div with ids = rd_closeseries, rd_63d, rd_63dearnings
                // add hidediv class from div with ids = rd_closeseries, rd_63d, rd_63dearnings
                const divIdsToHide = ['rd_closeseries', 'rd_63d', 'rd_63dearnings'];
                divIdsToHide.forEach(divId => {
                    const div = document.getElementById(divId);
                    if (div) {
                        div.classList.remove('hidediv');
                        div.classList.add('showdiv');
                    }
                });

                // Update the minute_data_shown state
                minute_data_shown = false;

            }
            // ---- finished ensuring that the 1 minute plot is hiddden

            const config = {modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
            displaylogo: false}

            data = data.slice(63); // full data, ignores first 63 rows
            let inplay_data = data.slice(-63); // in play data, last 63 rows
            const totalRows = data.length;

            // ---- Information Bar ----

            // > m20 pass minimum price
            // const m20PassValues = data
            // .map(row => row['m20 pass'])
            // .filter(value => value !== null && value !== "")
            // .map(value => parseFloat(value));
            // const minM20Pass = m20PassValues.length > 0 ? Math.min(...m20PassValues) : "No valid data";
            // document.getElementById('minM20PassValue').textContent = minM20Pass;

            // > m20 pass minimum delta
            const filteredData = data
                .filter(row => row['m20 pass'] !== null && row['m20 pass'] !== ""); // Filter data based on 'm20 pass' and then find the minimum value in the "63" column
            const values63 = filteredData.map(row => parseFloat(row['63']));
            const min63Value = values63.length > 0 ? Math.min(...values63) : "No valid data";
            // Format the number to two decimal places if it's a number
            let displayValue = min63Value*100;
            if (!isNaN(displayValue)) {
                displayValue = displayValue.toFixed(2);
            }
            document.getElementById('minM20PassValue').textContent = displayValue + '%';

            // > Latest Earnings Offset

            let latestEarningsOffset;
            if (data.length > 0 && 'Earnings Offset Closest' in data[data.length - 1]) {
                const lastRow = data[data.length - 1];
                latestEarningsOffset = lastRow['Earnings Offset Closest'];
            } else {
                latestEarningsOffset = 'NaN'; // or any other placeholder you prefer
            }
            document.getElementById('latestEarningsOffset').textContent = latestEarningsOffset;

            // > Overall Team Record (includes in play)
            const m20PassCount = data.filter(row => row['m20 pass'] !== null && row['m20 pass'] !== "").length;
            const m20FailCount = data.filter(row => row['m20 fail'] !== null && row['m20 fail'] !== "").length;
            let Pwin =  (m20PassCount / (m20PassCount + m20FailCount) * 100).toFixed(2)
            let recordValue = m20PassCount + " - " + m20FailCount + " (" + Pwin + "%)"
            document.getElementById('recordValue').textContent = recordValue;

            // > In-Play Team Record (last 63 rows)
            const m20PassCount_inplay = inplay_data.filter(row => row['m20 pass'] !== null && row['m20 pass'] !== "").length;
            const m20FailCount_inplay = inplay_data.filter(row => row['m20 fail'] !== null && row['m20 fail'] !== "").length;
            Pwin =  (m20PassCount_inplay / (m20PassCount_inplay + m20FailCount_inplay) * 100).toFixed(2)
            let inPlayValue = m20PassCount_inplay + " - " + m20FailCount_inplay + " (" + Pwin + "%)"
            document.getElementById('inPlayValue').textContent = inPlayValue;

            // document.getElementById('m20FailCount').textContent = m20FailCount;

            // > Sector Information
            loadSectorData();

            // -------------------------

            // PLOT: 1d % vs. Date (daily delta)

            const trace1d = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['daily delta'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>1d %: ${row['daily delta']}<br>63d %: ${row['63d %']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines', // Use lines instead of markers
                line: {
                    color: palette_purple, // Dull purple color
                    width: 2
                },
                hoverinfo: 'text',
                name: '1d %'
            };

            const layout1d = {
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: '1d % vs. Date',
                //     font: {
                //         color: '#868D98' // Setting title color
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444' // Darker grid lines
                },
                yaxis: {
                    color: '#868D98',
                    gridcolor: '#444'
                }
            };

            // const trace1 = {
            //     x: data.map(row => row['Date']),
            //     y: data.map(row => parseFloat(row['63d %'])),
            //     text: data.map(row => {
            //         return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>1d %: ${row['daily delta']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
            //     }),
            //     type: 'scatter',
            //     mode: 'lines', // Use lines instead of markers
            //     line: {
            //         color: palette_purple, // Dull purple color
            //         width: 2
            //     },
            //     hoverinfo: 'text',
            //     name: '63d %'
            // };

            const trace1 = {
                x: data.map(row => row['Date']),
                y: data.map(row => (parseFloat(row['63d %']) * 100).toFixed(2)), // Corrected: Apply toFixed to each element
                text: data.map(row => {
                    let sixtyThreeDPercent = (parseFloat(row['63d %']) * 100).toFixed(2);
                    let oneDPercent = (parseFloat(row['daily delta']) * 100).toFixed(2);
                    return `Date: ${row['Date']}<br>63d %: ${sixtyThreeDPercent}%<br>1d %: ${oneDPercent}%<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: palette_purple,
                    width: 2
                },
                hoverinfo: 'text',
                name: '63d %'
            };

            // const trace2 = {
            //     x: data.map(row => row['Date']),
            //     y: data.map(row => parseFloat(row['Close'])),
            //     text: data.map(row => {
            //         return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>1d %: ${row['daily delta']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
            //     }),
            //     type: 'scatter',
            //     mode: 'lines', // Use lines instead of markers
            //     line: {
            //         color: palette_purple, // Dull purple color
            //         width: 2
            //     },
            //     hoverinfo: 'text',
            //     name: 'Price'
            // };

            const trace2 = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['Close'])), // Assuming you don't want to change this line
                text: data.map(row => {
                    let sixtyThreeDPercent = (parseFloat(row['63d %']) * 100).toFixed(2); // Format 63d % value
                    let oneDPercent = (parseFloat(row['daily delta']) * 100).toFixed(2); // Format 1d % value
                    return `Date: ${row['Date']}<br>63d %: ${sixtyThreeDPercent}%<br>1d %: ${oneDPercent}%<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: palette_purple,
                    width: 2
                },
                hoverinfo: 'text',
                name: 'Price'
            };

            // Filter data for points where 'Earnings Offset Closest' is 0
            const linePoints = data.filter(row => row['Earnings Offset Closest'] === '0');

            // Create arrays for x and y values of markers
            const xValuesForMarkers = linePoints.map(row => row['Date']);
            const yValuesForMarkers = linePoints.map(row => parseFloat(row['Close'])); // Replace 'Close' with the relevant y-value field

            // Trace for vertical lines (as scatter plot)
            const traceVerticalLines = {
                x: xValuesForMarkers,
                y: yValuesForMarkers,
                mode: 'text', // Display both lines and text
                type: 'scatter',
                name: 'Earnings Offset',
                text: 'E', // Specify the text to display (the letter 'E')
                textposition: 'top center', // Position the text above the marker
                textfont: {
                    color: '#868D98', // Text color
                    size: 12, // Text size, adjust as needed
                    // Additional font styling can go here
                },
                hoverinfo: 'none'
            };
            
            

            const traceM20Pass = {
                x: data.filter(row => row['m20 pass'] !== null).map(row => row['Date']),
                y: data.filter(row => row['m20 pass'] !== null).map(row => parseFloat(row['m20 pass'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>`;
                }),
                type: 'scatter',
                mode: 'markers', // Use markers for scatter points
                marker: {
                    color: palette_green, // Choose a color that stands out
                    size: 10 // Adjust the size as needed
                },
                name: 'M20 Pass',
                hoverinfo: 'text' // Specify to use the text field for hover information
            };

            const traceM20Fail = {
                x: data.filter(row => row['m20 fail'] !== null).map(row => row['Date']),
                y: data.filter(row => row['m20 fail'] !== null).map(row => parseFloat(row['m20 fail'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>`;
                }),
                type: 'scatter',
                mode: 'markers', // Use markers for scatter points
                marker: {
                    color: palette_red, // Choose a color that stands out
                    size: 10 // Adjust the size as needed
                },
                name: 'M20 Fail',
                hoverinfo: 'text' // Specify to use the text field for hover information
            };

            const layout = {
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: '63d % vs. Date',
                //     font: {
                //         color: '#868D98' // Setting title color
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444' // Darker grid lines
                },
                yaxis: {
                    color: '#868D98',
                    gridcolor: '#444'
                },
                shapes: [
                    { // Horizontal line at -20%
                        type: 'line',
                        x0: 0,
                        y0: -20.0,
                        x1: 1,
                        y1: -20.0,
                        xref: 'paper',
                        line: {
                            color: palette_red,
                            width: 2
                        }
                    }
                ]
            };

            const layout2 = {
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: 'Close vs. Date',
                //     font: {
                //         color: '#868D98' // Setting title color
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444', // Darker grid lines
                    range: [trace2.x[0], trace2.x[trace2.x.length - 1]] // Set the range from the first to the last date in trace2
                },
                yaxis: {
                    color: '#868D98',
                    gridcolor: '#444'
                },
                legend: {
                    x: 0,
                    y: 1,
                    xanchor: 'left',
                    yanchor: 'top',
                    bgcolor: 'rgba(0,0,0,0)', // Transparent background
                    font: {
                        color: '#868D98'
                    }
                }
            };


            const layout3 = {
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: '63d % vs. Earnings Offset Closest',
                //     font: {
                //         color: '#868D98' // Setting title color
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444', // Darker grid lines
                    // range: [trace2.x[0], trace2.x[trace2.x.length - 1]] // Set the range from the first to the last date in trace2
                },
                yaxis: {
                    color: '#868D98',
                    gridcolor: '#444'
                },
                legend: {
                    x: 0,
                    y: 1,
                    xanchor: 'left',
                    yanchor: 'top',
                    bgcolor: 'rgba(0,0,0,0)', // Transparent background
                    font: {
                        color: '#868D98'
                    }
                }
            };

            const zeroChances = {
                x: data.filter(row => isM20NonEmpty(row) && row['chance'] === 0).map(row => row['Earnings Offset Closest']),
                y: data.filter(row => isM20NonEmpty(row) && row['chance'] === 0).map(row => parseFloat(row['63d %'])),
                type: 'scatter',
                mode: 'markers',
                marker: {
                    color: 'red',
                    size: 8
                },
                name: '0 chances'
            };
            
            const zeroChances_debug_working = {
                x: data.filter(row => {
                    let hasM20 = isM20NonEmpty(row);
                    let chanceValue = parseInt(row['chance'], 10); // Convert to number
                    let matchesCriteria = hasM20 && chanceValue === 0;
            
                    // Debugging logs
                    // console.log(`Row: ${JSON.stringify(row)}, Has M20: ${hasM20}, Chance Value: ${chanceValue}, Matches Criteria: ${matchesCriteria}`);
            
                    return matchesCriteria;
                }).map(row => row['Earnings Offset Closest']),
                y: data.filter(row => isM20NonEmpty(row) && parseInt(row['chance'], 10) === 0).map(row => parseFloat(row['63d %'])),
                type: 'scatter',
                mode: 'markers',
                marker: {
                    color: 'red',
                    size: 8
                },
                name: '0 chances'
            };
            
            // const zeroChances_debug = {
            //     x: [],
            //     y: [],
            //     mode: 'markers',
            //     marker: {
            //         color: [],
            //         line: {
            //             color: [],
            //             width: []
            //         },
            //         size: []
            //     },
            //     name: '0 chances'
            // };
            
            // data.forEach((row, index) => {
            //     if (isM20NonEmpty(row) && parseInt(row['chance'], 10) === 0) {
            //         zeroChances_debug.x.push(row['Earnings Offset Closest']);
            //         zeroChances_debug.y.push(parseFloat(row['63d %']));
            //         let markerStyle = getMarkerStyle(index, data.length, 'red', 'red');
            //         zeroChances_debug.marker.color.push(markerStyle.color);
            //         zeroChances_debug.marker.line.color.push(markerStyle.line.color);
            //         zeroChances_debug.marker.line.width.push(markerStyle.line.width);
            //         zeroChances_debug.marker.size.push(markerStyle.size);
            //     }
            // });

            let zeroChances_debug = {
                x: [],
                y: [],
                mode: 'markers',
                hoverinfo: [],
                marker: {
                    color: [],
                    line: {
                        color: [],
                        width: []
                    },
                    size: []
                },
                name: '0 chances'
            };

            zeroChances_debug.x = [];
            zeroChances_debug.y = [];
            zeroChances_debug.text = []; // For custom hover text
            zeroChances_debug.hoverinfo = []; // To specify hover information for each point
            zeroChances_debug.marker = {
                color: [],
                line: {
                    color: [],
                    width: []
                },
                size: []
            };
            
            data.forEach((row, index) => {

                // if (index < 63) {
                    // return; // Skip processing this row
                // }

                if (isM20NonEmpty(row) && parseInt(row['chance'], 10) === 0) {
                    zeroChances_debug.x.push(row['Earnings Offset Closest']);
                    zeroChances_debug.y.push(parseFloat(row['63d %']));
                    let markerStyle = getMarkerStyle(index, totalRows, palette_red, palette_red);
                    zeroChances_debug.marker.color.push(markerStyle.color);
                    zeroChances_debug.marker.line.color.push(markerStyle.line.color);
                    zeroChances_debug.marker.line.width.push(markerStyle.line.width);
                    zeroChances_debug.marker.size.push(markerStyle.size);
            
                    // Custom hover text for last 63 rows
                    if (index >= totalRows - 63) {
                        let daysAgo = totalRows - index - 1; // subtract 1
                        zeroChances_debug.text.push(`${daysAgo} day(s) so far`);
                        zeroChances_debug.hoverinfo.push('text');
                    } else {
                        zeroChances_debug.text.push('');
                        zeroChances_debug.hoverinfo.push('none');
                    }
                }
            });

            // const oneToFiveChances = {
            //     x: data.filter(row => isM20NonEmpty(row) && row['chance'] >= 1 && row['chance'] <= 5).map(row => row['Earnings Offset Closest']),
            //     y: data.filter(row => isM20NonEmpty(row) && row['chance'] >= 1 && row['chance'] <= 5).map(row => parseFloat(row['63d %'])),
            //     type: 'scatter',
            //     mode: 'markers',
            //     marker: {
            //         color: 'yellow',
            //         size: 8
            //     },
            //     name: '1-5 chances'
            // };
            
            const oneToFiveChances = {
                x: [],
                y: [],
                mode: 'markers',
                marker: {
                    color: [],
                    line: {
                        color: [],
                        width: []
                    },
                    size: []
                },
                name: '1-5 chances'
            };

            data.forEach((row, index) => {
                // if (index < 63) {
                    // return; // Skip processing this row
                // }

                if (isM20NonEmpty(row) && row['chance'] >= 1 && row['chance'] <= 5) {
                    oneToFiveChances.x.push(row['Earnings Offset Closest']);
                    oneToFiveChances.y.push(parseFloat(row['63d %']));
                    let markerStyle = getMarkerStyle(index, data.length, palette_yellow, palette_yellow);
                    oneToFiveChances.marker.color.push(markerStyle.color);
                    oneToFiveChances.marker.line.color.push(markerStyle.line.color);
                    oneToFiveChances.marker.line.width.push(markerStyle.line.width);
                    oneToFiveChances.marker.size.push(markerStyle.size);
                }
            });

            // const sixOrMoreChances = {
            //     x: data.filter(row => isM20NonEmpty(row) && row['chance'] >= 6).map(row => row['Earnings Offset Closest']),
            //     y: data.filter(row => isM20NonEmpty(row) && row['chance'] >= 6).map(row => parseFloat(row['63d %'])),
            //     type: 'scatter',
            //     mode: 'markers',
            //     marker: {
            //         color: 'green',
            //         size: 8
            //     },
            //     name: '6 or more chances'
            // };

            const sixOrMoreChances = {
                x: [],
                y: [],
                mode: 'markers',
                marker: {
                    color: [],
                    line: {
                        color: [],
                        width: []
                    },
                    size: []
                },
                name: '6 or more chances'
            };

            data.forEach((row, index) => {

                // if (index < 63) {
                    // return; // Skip processing this row
                // }

                if (isM20NonEmpty(row) && row['chance'] >= 6) {
                    sixOrMoreChances.x.push(row['Earnings Offset Closest']);
                    sixOrMoreChances.y.push(parseFloat(row['63d %']));
                    let markerStyle = getMarkerStyle(index, data.length, palette_green, palette_green);
                    sixOrMoreChances.marker.color.push(markerStyle.color);
                    sixOrMoreChances.marker.line.color.push(markerStyle.line.color);
                    sixOrMoreChances.marker.line.width.push(markerStyle.line.width);
                    sixOrMoreChances.marker.size.push(markerStyle.size);
                }
            });

            // zeroChances_debug.hoverinfo = 'none';
            oneToFiveChances.hoverinfo = 'none';
            sixOrMoreChances.hoverinfo = 'none';

            Plotly.newPlot('graphDiv', [trace1], layout, config);

            // Add custom CSS for styling tooltips
            // const customTooltipStyle = document.createElement('style');
            // customTooltipStyle.innerHTML = `
            // .hovertext {
            //     background-color: #16161782 !important;
            //     border-radius: 8px !important;
            //     padding: 10px !important;
            //     color: white !important;
            //     font-size: 12px !important;
            // }
            // `;
            // document.head.appendChild(customTooltipStyle);




            // Plotly.newPlot('graphDiv2', [trace2, traceM20Pass, traceM20Fail], layout2);
            Plotly.newPlot('graphDiv2', [trace2, traceVerticalLines, traceM20Pass, traceM20Fail], layout2, config); // Earnings
            Plotly.newPlot('graphDiv3', [zeroChances_debug, oneToFiveChances, sixOrMoreChances], layout3, config);
            
            // 1d% graph replaced with the m20 watchlist
            // Plotly.newPlot('graphDiv5', [trace1d], layout1d, config); // 1d % vs. Date

            // console.log(zeroChances_debug)
            // console.log(oneToFiveChances)
            // console.log(sixOrMoreChances)
            
            // bar chart for M20 signals
            const barChartData = data.filter(row => row['m20 pass'] !== null || row['m20 fail'] !== null).map(row => parseFloat(row['63']));
            // const barChartData = data.filter(row => 
            //     (row['m20 pass'] !== null && row['m20 pass'].trim() !== "") || 
            //     (row['m20 fail'] !== null && row['m20 fail'].trim() !== "")
            // ).map(row => parseFloat(row['63']));
            
            const filteredDates = data.filter(row => 
                (row['m20 pass'] !== null && row['m20 pass'].trim() !== "") || 
                (row['m20 fail'] !== null && row['m20 fail'].trim() !== "")
            ).map(row => row['Date']);

            // const barChartTrace = {
            //     // x: barChartData.map((_, index) => `Data Point ${index + 1}`), // Creating labels for each data point
            //     x: data.map(row => row['Date']),
            //     // x: filteredDates,
            //     // y: barChartData,
            //     y: data.map(row => parseFloat(row['63'])),
            //     type: 'bar',
            //     // marker: {
            //     //     color: palette_purple, // Choose a color for the bars
            //     // }
            //     marker: {
            //         color: data.map(row => (row['m20 pass'] === null || row['m20 pass'] === "" || row['m20 fail'] === null || row['m20 fail'] === "") ? '#808080' : palette_purple)
            //     }


            // };
            
            // const barChartTrace = {
            //     x: data.map(row => row['Date']),
            //     y: data.map(row => parseFloat(row['63'])),
            //     type: 'bar',
            //     marker: {
            //         color: data.map(row => (row['m20 pass'] !== null && row['m20 pass'] !== "" || row['m20 fail'] !== null && row['m20 fail'] !== "") ? palette_purple : '#808080') // Color palette_purple if not null/empty, grey otherwise
            //     }
            // };
            
            const barChartTrace = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['63'])),
                type: 'bar',
                marker: {
                    color: data.map(row => {
                        if (row['m20 fail'] !== null && row['m20 fail'] !== "") {
                            return palette_red; // Red color for non-null and non-empty 'm20 fail'
                        } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                            return palette_purple; // Default color if 'm20 pass' is not null/empty
                        }
                        return '#808080'; // Grey for other cases
                    })
                },
                name: '63 day maximum delta'
            };
            
            const barChartTrace_min63 = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['63min'])),
                type: 'bar',
                marker: {
                    color: data.map(row => {
                        if (row['m20 fail'] !== null && row['m20 fail'] !== "") {
                            return palette_red; // Red color for non-null and non-empty 'm20 fail'
                        } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                            return palette_purple; // Default color if 'm20 pass' is not null/empty
                        }
                        return '#808080'; // Grey for other cases
                    })
                },
                name: '63 day minimum delta'
            };

            const barChartLayout = {
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: 'Maximum Delta Foward 63 Days',
                //     font: {
                //         color: '#868D98' // Setting title color
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)',
                plot_bgcolor: 'rgb(16 16 16 / 0%)',
                xaxis: {
                    color: '#868D98',
                    gridcolor: '#444',
                },
                yaxis: {
                    color: '#868D98',
                    gridcolor: '#444',
                },
                showlegend: false
            };

            Plotly.newPlot('graphDiv4', [barChartTrace, barChartTrace_min63], barChartLayout, config);

            // for summary table
            // tickerDataSummary[ticker] = {
            //     recordValue: recordValue,
            //     displayValue: displayValue,
            //     latestEarningsOffset: latestEarningsOffset
            // };
            resolve();

        }).catch(error => {
            reject(error);
        });
    });
}

export function processSectorData() {
    // Assuming 'currentTicker' is defined and accessible
    // const tickerData = sectorDataCache.find(row => row.Symbol === currentTicker);
    const tickerData = sectorDataCache.find(row => row["\uFEFFSymbol"] === currentTicker);
    if (tickerData) {
        document.getElementById('sectormerrill').textContent = tickerData.Sector;
        document.getElementById('companyname').textContent = tickerData.Name;
        document.getElementById('companyscountry').textContent = tickerData.Country;
    } else {
        document.getElementById('sectormerrill').textContent = 'Unknown';
        document.getElementById('companyname').textContent = 'Unknown';
        document.getElementById('companyscountry').textContent = 'Unknown';
    }

}

export function loadSectorData() {
    // Check if data is already fetched and stored in cache
    if (sectorDataCache) {
        processSectorData();
    } else {
        fetch('/api/sectors-data')
            .then(response => response.json())
            .then(data => {
                sectorDataCache = data; // Store data in cache
                processSectorData();
            })
            .catch(error => {
                console.error('Error fetching sector data:', error);
                document.getElementById('sectormerrill').textContent = 'Error loading data';
            });
    }
}

export function turnCalendarIconWhite() {
    // Get the calendar icon div
    var calendarIcon = document.querySelector('.calendar-icon');

    // Get all SVG elements that have a stroke attribute
    var svgElements = calendarIcon.querySelectorAll('svg [stroke]');

    // Change the stroke color to white
    svgElements.forEach(function(element) {
        element.setAttribute('stroke', 'white');
    });
}