// new ui
let tickerItems;
let currentTicker;
let tickerlist;
let tickerDataSummary = {};
let initialTableData = {}; // save summary data once saved
let currentTableData = {}; // to maintaine state of currently filtered data

// colors
let palette_purple = '#7A76FF' // linked
let palette_red = '#FF76B7'
let palette_yellow = '#FBFF76'
let palette_green = '#76FFBF'


let isSummaryFetched = false;
let isFilterModalOpen = false;
const columnNames = ['Ticker', 'Record', 'Minimum M20', 'Latest Earnings Offset'];

let sortDirection = 'ascending'; // default direction of rows
let currentTickerIndex = 0; // keep track of active ticker in ticker-tape

let sectorDataCache = null;
let globalData = []; // This will hold the data fetched from /get-m20-data

let minute_data_shown = false;

function convertTimestamp(timestamp) {
    const parts = timestamp.split(/[:\/\s-]/);
    const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    const formattedTimestamp = `${parts[2]}-${months[parts[1]]}-${parts[0]}T${parts[3]}:${parts[4]}:${parts[5]}${parts[6]}`;
    return formattedTimestamp;
}

function formatTimeForDisplay(date) {
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}

function fetchAccessLogData() {
    fetch('/api/usage')
    .then(response => response.json())
    .then(data => {
        const portTableBody = document.getElementById('port-table').getElementsByTagName('tbody')[0];
        const m20TableBody = document.getElementById('m20-table').getElementsByTagName('tbody')[0];
        portTableBody.innerHTML = ''; // Clear existing rows
        m20TableBody.innerHTML = ''; // Clear existing rows for m20-table

        let uniqueNames = new Set();
        let tickerCounts = {};
        let apiCounts = {
            '/api/get-m20-data': 0,
            '/api/get-portfolio': 0,
            '/api/chartdata': 0,
            '/api/one_minute_chartdata': 0
        };

        // Process the data
        data.forEach(item => {
            // Populate the port-table with new rows
            let portRow = portTableBody.insertRow();
            portRow.insertCell().textContent = item['Anonymous Name'];
            portRow.insertCell().textContent = item['Timestamp'];
            portRow.insertCell().textContent = item['Request'];
            portRow.insertCell().textContent = item['StatusCode'];
            portRow.insertCell().textContent = item['Size'];

            // Count unique names and API requests
            uniqueNames.add(item['Anonymous Name']);
            Object.keys(apiCounts).forEach(apiEndpoint => {
                if (item['Request'].includes(apiEndpoint)) {
                    apiCounts[apiEndpoint]++;
                }
            });

            // Parse and count ticker frequency for /api/chartdata/ticker.csv
            if (item['Request'].includes('/api/chartdata/')) {
                let ticker = item['Request'].split('/api/chartdata/')[1].split('.csv')[0];
                ticker = decodeURIComponent(ticker); // Replace encoded characters like '%5E' with '^'
                tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
            }
        });

        // Sort tickers by frequency in descending order
        let sortedTickers = Object.keys(tickerCounts).sort((a, b) => tickerCounts[b] - tickerCounts[a]);

        // Populate the m20-table with ticker data
        sortedTickers.forEach(ticker => {
            let truncatedTicker = ticker.slice(0, 6); // Truncate ticker to a maximum of 6 characters

            let m20Row = m20TableBody.insertRow();
            m20Row.insertCell().textContent = truncatedTicker;
            m20Row.insertCell().textContent = tickerCounts[ticker];
        });

        // Update HTML with the counts
        document.getElementById('nr_dinos').textContent = uniqueNames.size;
        document.getElementById('nr_m20data').textContent = apiCounts['/api/get-m20-data'];
        document.getElementById('nr_getportfolio').textContent = apiCounts['/api/get-portfolio'];
        document.getElementById('nr_chartdata').textContent = apiCounts['/api/chartdata'];
        document.getElementById('nr_1mchartdata').textContent = apiCounts['/api/one_minute_chartdata'];



        // Prepare data for Plotly
        let plotData = {
            '/api/get-m20-data': [],
            '/api/get-portfolio': [],
            '/api/chartdata': [],
            '/api/one_minute_chartdata': []
        };
        let timestamps = {};

        data.forEach(item => {
            // let timestamp = new Date(item['Timestamp']);
            let timestamp = new Date(convertTimestamp(item['Timestamp']));
            timestamps[timestamp] = timestamps[timestamp] || {
                '/api/get-m20-data': 0,
                '/api/get-portfolio': 0,
                '/api/chartdata': 0,
                '/api/one_minute_chartdata': 0
            };
            Object.keys(apiCounts).forEach(apiEndpoint => {
                if (item['Request'].includes(apiEndpoint)) {
                    timestamps[timestamp][apiEndpoint]++;
                }
            });
        });

        Object.keys(timestamps).forEach(timestamp => {
            Object.keys(apiCounts).forEach(apiEndpoint => {
                plotData[apiEndpoint].push({ x: timestamp, y: timestamps[timestamp][apiEndpoint] });
            });
        });

        // Create Plotly traces
        let traces = Object.keys(plotData).map(apiEndpoint => {
            return {
                x: plotData[apiEndpoint].map(data => data.x),
                y: plotData[apiEndpoint].map(data => data.y),
                type: 'scatter',
                mode: 'lines',
                name: apiEndpoint
            };
        });

        const layout1d = {
            margin: { l: 50, r: 25, b: 25, t: 25 },
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

        // Plot the data
        Plotly.newPlot('graphDiv2', traces, layout1d);


    })
    .catch(error => console.error('Error fetching data:', error));
}




function setActiveTicker(index) {
    currentTicker = tickerItems[index].textContent.trim()
    // console.log(currentTicker)
    tickerItems[currentTickerIndex].classList.remove('active');
    tickerItems[index].classList.add('active');
    tickerItems[index].scrollIntoView({ inline: 'center', block: 'nearest' });
    // showImagesForTicker(tickerItems[index].textContent.trim());  // Update the images based on the active ticker
    plotGraph(tickerItems[index].textContent.trim())
    // turnCalendarIconWhite() // if a ticker was set active from the ticker tape, it will not be in rollback mode
    currentTickerIndex = index;
}

// Create Ticker Tape

function showImagesForTicker(ticker) {
    const imageDisplayDiv = document.querySelector('.image-display');
    imageDisplayDiv.innerHTML = '';  // Clear previous images

    for (let i = 1; i <= 2; i++) {
        const img = document.createElement('img');
        img.src = `imgs/${ticker}_chart_${i}.png`;
        imageDisplayDiv.appendChild(img);
    }
}

let isCalendarActive = false;
let isSearchActive = true;

// for clicking search icon
// document.querySelector('.search-icon').addEventListener('click', function() {
//     const overlay = document.getElementById('search-overlay');
//     const searchBox = document.getElementById('search-box');
    
//     // Reset the accumulated string and search box value
//     accumulatedString = '';
//     searchBox.value = '';

//     overlay.style.display = 'flex'; // Display the overlay

//     isSearchActive = true;
//     isCalendarActive = false;

// });

// for typing anywhere to begin a search
let accumulatedString = '';
let resetTimer;

// document.addEventListener('keydown', function(event) {

//     if (isFilterModalOpen) {
//         return;
//     }

//     const overlay = document.getElementById('search-overlay');
//     const searchBox = document.getElementById('search-box');
//     const searchBox_rb = document.getElementById('rollback-box'); // for calendar
//     const overlay_rb = document.getElementById('rollback-overlay');

//     // Clear the previous reset timer
//     clearTimeout(resetTimer);

//     if (isSearchActive) {
//         // Handle backspace key
//         if (event.key === 'Backspace') {
//             accumulatedString = accumulatedString.slice(0, -1).toUpperCase(); // Remove the last character
//             searchBox.value = accumulatedString; // Display in uppercase
//             return; // Exit the function here since we don't want to continue with the other logic
//         }

//         // If the current value is the placeholder text, reset the accumulated string
//         if (searchBox.value === '') {
//             accumulatedString = '';
//         }

//         if (event.key === 'Enter') {
//             if (accumulatedString) {
//                 // Show images for the searched ticker
//                 // showImagesForTicker(accumulatedString);
//                 plotGraph(accumulatedString.toUpperCase())
        
//                 // Highlight the ticker in the ticker tape
//                 const tickerItemsArray = Array.from(tickerItems);
//                 const index = tickerItemsArray.findIndex(item => item.textContent.trim() === accumulatedString.toUpperCase());
                
//                 if (index !== -1) {
//                     setActiveTicker(index);
//                 }
        
//                 accumulatedString = '';
//             }
//             overlay.style.display = 'none'; // Hide the overlay
//         } else if (event.key.length === 1) { // Check if a single character key was pressed (exclude special keys like Shift, Ctrl, etc.)
//             overlay.style.display = 'flex'; // Display the overlay

//             // Accumulate the typed characters
//             accumulatedString += event.key;
//             searchBox.value = accumulatedString.toUpperCase(); // Display the accumulated string in uppercase

//             // Set a timer to reset the accumulated string and hide the overlay after 2 seconds of inactivity
//             resetTimer = setTimeout(function() {
//                 accumulatedString = '';
//                 overlay.style.display = 'none';
//             }, 2000); // 2 seconds
//         }
//         // isSearchActive = false;

//     } else if (isCalendarActive) {

//         // Handle backspace key
//         if (event.key === 'Backspace') {
//             accumulatedString = accumulatedString.slice(0, -1); // Remove the last character
//             searchBox_rb.value = accumulatedString.toUpperCase(); // Display in uppercase
//             return; // Exit the function here since we don't want to continue with the other logic
//         }

//         // If the current value is the placeholder text, reset the accumulated string
//         if (searchBox_rb.value === 'Enter Rollback Date...') {
//             accumulatedString = '';
//         }

//         if (event.key === 'Enter') {
//             if (accumulatedString) {
//                 // console.log('accumulatedString: ', accumulatedString);
        
//                     // potential issue iwth keyup staying attached to this block instead of the 
//                     // search..

//                 // Send the accumulatedString to the server
//                 fetch('/process-date', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify({ 
//                         date: accumulatedString,
//                         ticker: currentTicker
//                      }),
//                 })
//                 .then(response => response.json())
//                 .then(data => {
//                     // console.log('Response from server:', data);
//                     // load new CSV file and replot
//                     plotGraph_rollback(currentTicker)
//                     turnCalendarIconPurple();

//                 })
//                 .catch(error => {
//                     console.error('Error:', error);
//                 });
        
//                 accumulatedString = '';
//             }
//             overlay_rb.style.display = 'none'; // Hide the overlay
//             isCalendarActive = false; // Disable Calendar doPOST until it is clicked again
//             isSearchActive = true; // Enable Search

//         } else if (event.key.length === 1) { // Check if a single character key was pressed (exclude special keys like Shift, Ctrl, etc.)
//             overlay_rb.style.display = 'flex'; // Display the overlay

//             // Accumulate the typed characters
//             accumulatedString += event.key;
//             searchBox_rb.value = accumulatedString.toUpperCase(); // Display the accumulated string in uppercase

//             // Set a timer to reset the accumulated string and hide the overlay after 2 seconds of inactivity
//             resetTimer = setTimeout(function() {
//                 accumulatedString = '';
//                 overlay_rb.style.display = 'none';
//             }, 10000); // 2 seconds
//         }
//         // isCalendarActive = false;

//     }

// });

function isM20NonEmpty(row) {
    // Check if 'm20 pass' or 'm20 fail' is not an empty string
    let nonEmpty = row['m20 pass'] !== "" || row['m20 fail'] !== "";
    // console.log("row:", row);
    // console.log("isM20NonEmpty:", nonEmpty);
    return nonEmpty;
}

function getMarkerStyle(rowIndex, totalRows, regularColor, specialOutlineColor) {
    if (rowIndex >= totalRows - 63) {
        // Special style for last 63 rows
        return {
            color: 'rgba(0, 0, 0, 0)', // Transparent fill
            line: {
                color: specialOutlineColor, // Special outline color
                width: 1 // Width of the outline
            },
            size: 8 // Size of the marker
        };
    } else {
        // Standard style for other rows
        return {
            color: regularColor, // Regular color
            line: {
                color: regularColor, // Regular line color (same as the fill color)
                width: 1 // Standard width of the outline
            },
            size: 8 // Standard size of the marker
        };
    }
}

function resizePlotlyGraphs() {
    // removed 'graphDiv5' since it is a table not a plot
    var graphs = ['graphDiv', 'graphDiv2', 'graphDiv3', 'graphDiv4']; // List of all Plotly graph container IDs
    graphs.forEach(function(graphId) {
        var graphDiv = document.getElementById(graphId);
        if (graphDiv) {
            var update = {
                width: graphDiv.offsetWidth, // or use clientWidth
                height: graphDiv.offsetHeight // or use clientHeight
            };
            Plotly.relayout(graphId, update);

            // console.log('relayout - ', graphId)
        }
    });
}


function fetchAndDisplayData() {

    // I put default values into the html

    const minOverallRecordPct = parseFloat(document.getElementById('minOverallRecordPct').value) || 90;
    const minPriceDiffPct = parseFloat(document.getElementById('minPriceDiffPct').value) || -2;
    const maxPriceDiffPct = parseFloat(document.getElementById('maxPriceDiffPct').value) || 2;
    const minEarnings = parseFloat(document.getElementById('minearnings').value) || 2;
    const maxEarnings = parseFloat(document.getElementById('maxearnings').value) || 3;

    // Fetch the data from the server (assuming your Python server has endpoints set up)
    fetch('/api/get-m20-data')
    .then(response => response.json())
    .then(data => {

        // console.log(data); // verified that json file contains all columns
        globalData = data; // store for applyFilter_m20data() later

        // Assuming the data is an array of objects with {ticker, currentPrice, m20tmrw, lastUpdated}
        const tableBody = document.getElementById('m20-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Clear existing rows

        // Populate the table with new rows
        data.forEach(item => {
            
            // Handle potentially undefined or malformed 'Overall Record'

            // console.log(item)
            
            const pulledAtKey = Object.keys(item).find(key => key.trim().startsWith('Pulled At'));
            const pulledAt = pulledAtKey ? item[pulledAtKey].toString().trim() : 'N/A';
        

            const overallRecordKey = Object.keys(item).find(key => key.trim().startsWith('Overall Record'));
            const overallRecord = overallRecordKey ? item[overallRecordKey].toString().trim() : '';
            // console.log(overallRecordKey)
            // const overallRecord = item['Overall Record'] ? item['Overall Record'].toString().trim() : '';
            // console.log(overallRecord)
            let overallRecordPct = null;
            if (overallRecord) {

                // console.log('parsing w/regex')
                // Updated regex to match a percentage in any part of the string
                const overallRecordPctMatch = overallRecord.match(/(\d+\.\d+)%/);
                if (overallRecordPctMatch) {
                    overallRecordPct = parseFloat(overallRecordPctMatch[1]);
                } else {
                    // If the match is not found, handle it as needed
                    overallRecordPct = 0; // For example, setting it to 0
                }
            }

            // Extract the prices and calculate the percent difference
            const currentPrice = parseFloat(item['Current Price']) || 'N/A';
            const m20Price = parseFloat(item['m20tmrw']).toFixed(2) || 'N/A';
            const pricediff = -(currentPrice - m20Price).toFixed(2);
            const pricediffpct = (pricediff/currentPrice*100).toFixed(2);

            const sixtyThreeDayPct = item['63d %'] ? (parseFloat(item['63d %'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const prevoneDayPct = item['previous daily delta'] ? (parseFloat(item['previous daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const oneDayPctVal = parseFloat(item['daily delta']); // Separate variable for numerical comparison
            const oneDayPct = item['daily delta'] ? (parseFloat(item['daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const earningsOffsetClosest = item['Earnings Offset Closest'] || 'N/A'; // Handle NaN or blank

            // Extract the percentage from the 'Overall Record' string
            // const overallRecordPctMatch = item['Overall Record'].match(/(\d+\.\d+)%/);
            // overallRecordPct = overallRecordPctMatch ? parseFloat(overallRecordPctMatch[1]) : null;

            const earningsValue = parseFloat(item['Earnings Offset Closest']);
            const earningsInRange = !isNaN(earningsValue) && earningsValue >= minEarnings && earningsValue <= maxEarnings;


            const live_1d = (item['Current Price'] && item['Close']) ? 
                ((parseFloat(item['Current Price'])/parseFloat(item['Close']) - 1) * 100).toFixed(2) + '%' : 
                'N/A';

            const live_63d_peak = (item['Current Price'] && item['63d peak']) ? 
                  ((parseFloat(item['Current Price'])/parseFloat(item['63d peak']) - 1) * 100).toFixed(2) + '%' : 
                  'N/A';


            // console.log(`Ticker: ${item['Ticker']}, Current Price: ${currentPrice}, m20 Price: ${m20Price}, Price Diff: ${pricediff}, Price Diff Pct: ${pricediffpct}, Overall Record Pct: ${overallRecordPct}, One Day Pct Val: ${oneDayPctVal}, Earnings In Range: ${earningsInRange}`);

            if (pricediffpct >= minPriceDiffPct && 
                pricediffpct <= maxPriceDiffPct && 
                overallRecordPct >= minOverallRecordPct &&
                (isNaN(oneDayPctVal) || oneDayPctVal < 0) &&
                earningsInRange) {
            // if (pricediffpct >= minPriceDiffPct && pricediffpct <= maxPriceDiffPct && overallRecordPct >= minOverallRecordPct && (isNaN(oneDayPctVal) || oneDayPctVal < 0)) {
            // if (pricediffpct >= -2 && pricediffpct <= 2 && overallRecordPct >= 80) {
            // if (pricediffpct >= -2 && pricediffpct <= 2) {
                let row = tableBody.insertRow();

                // Apply purple glow if pricediffpct is >= 00
                if (pricediffpct >= 0) {
                    row.classList.add('purple-glow');
                }

                // console.log("Adding row for:", item['Ticker'], item[overallRecordKey], pulledAt); // Debugging line

                row.insertCell().textContent = item['Ticker'];        // Changed from item.ticker
                row.insertCell().textContent = item[overallRecordKey];
                row.insertCell().textContent = `${item['Current Price']} (${live_1d})`
                row.insertCell().textContent = item['Close'];
                row.insertCell().textContent = m20Price;       // This is correct
                row.insertCell().textContent = `${pricediff} (${pricediffpct}%)`;
                row.insertCell().textContent = prevoneDayPct;       // Add prev 1d %
                row.insertCell().textContent = oneDayPct;       // Add 1d %
                row.insertCell().textContent = live_63d_peak;       // was sixtyThreeDayPct
                row.insertCell().textContent = earningsOffsetClosest;
                row.insertCell().textContent = pulledAt;     // Changed from item.lastUpdated


                row.addEventListener('click', () => {
                    // Retrieve and log the 'Ticker'
                    const ticker = item['Ticker'];
                    // console.log('Ticker from watchlist selected:', ticker);
        
                    // Update the ticker text in the HTML
                    document.getElementById('tickerSpan').textContent = ticker;

                    // remove showdiv class from div with ids = rd_closeseries, rd_63d, rd_63dearnings
                    // add hidediv class from div with ids = rd_closeseries, rd_63d, rd_63dearnings
                    const divIdsToHide = ['rd_closeseries', 'rd_63d', 'rd_63dearnings'];
                    divIdsToHide.forEach(divId => {
                        const div = document.getElementById(divId);
                        if (div) {
                            div.classList.remove('showdiv');
                            div.classList.add('hidediv');
                        }
                    });

                    // remove hidediv class from div with id = rd_oneminute
                    // add showdiv class from div with id = rd_oneminute
                    const oneMinuteDiv = document.getElementById('rd_oneminute');
                    oneMinuteDiv.classList.remove('hidediv');
                    oneMinuteDiv.classList.add('showdiv');

                    fetch("/api/one_minute_chartdata/" + ticker, { cache: 'no-cache' })
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
                
                        // Layout configuration
                        const layout = {
                            margin: { l: 50, r: 25, b: 25, t: 25 },
                            paper_bgcolor: 'rgb(16 16 16 / 0%)',
                            plot_bgcolor: 'rgb(16 16 16 / 0%)',
                            xaxis: {
                                color: '#868D98',
                                gridcolor: '#444',
                                range: [trace[0] ? trace[0].Datetime : '09:30', '15:59']  // Set the x-axis range
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
                        Plotly.newPlot('graphDiv6', [trace], layout, config);

                        minute_data_shown = true;
                
                    })
                    .catch(error => console.error('Error fetching data for ticker', ticker, ':', error));
                });

            }
        });
    })
    .catch(error => console.error('Error fetching data:', error));
}

function applyFilter_m20data() {

    // applies filter to existing data (globalData) that comes from /get-m20-data
    // console.log('attempting to apply filter to globalData')

    // need to update data.forEach to match: fetchAndDisplayData

    const minOverallRecordPct = parseFloat(document.getElementById('minOverallRecordPct').value) || 90;
    const minPriceDiffPct = parseFloat(document.getElementById('minPriceDiffPct').value) || -10;
    const maxPriceDiffPct = parseFloat(document.getElementById('maxPriceDiffPct').value) || 2;
    const minEarnings = parseFloat(document.getElementById('minearnings').value) || -40;
    const maxEarnings = parseFloat(document.getElementById('maxearnings').value) || 40;

    const tableBody = document.getElementById('m20-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    globalData.forEach(item => {
            
            // Handle potentially undefined or malformed 'Overall Record'

            // console.log(item)
            
            const pulledAtKey = Object.keys(item).find(key => key.trim().startsWith('Pulled At'));
            const pulledAt = pulledAtKey ? item[pulledAtKey].toString().trim() : 'N/A';
        

            const overallRecordKey = Object.keys(item).find(key => key.trim().startsWith('Overall Record'));
            const overallRecord = overallRecordKey ? item[overallRecordKey].toString().trim() : '';
            // console.log(overallRecordKey)
            // const overallRecord = item['Overall Record'] ? item['Overall Record'].toString().trim() : '';
            // console.log(overallRecord)
            let overallRecordPct = null;
            if (overallRecord) {

                // console.log('parsing w/regex')
                // Updated regex to match a percentage in any part of the string
                const overallRecordPctMatch = overallRecord.match(/(\d+\.\d+)%/);
                if (overallRecordPctMatch) {
                    overallRecordPct = parseFloat(overallRecordPctMatch[1]);
                } else {
                    // If the match is not found, handle it as needed
                    overallRecordPct = 0; // For example, setting it to 0
                }
            }

            // Extract the prices and calculate the percent difference
            const currentPrice = parseFloat(item['Current Price']) || 'N/A';
            const m20Price = parseFloat(item['m20tmrw']).toFixed(2) || 'N/A';
            const pricediff = -(currentPrice - m20Price).toFixed(2);
            const pricediffpct = (pricediff/currentPrice*100).toFixed(2);

            const sixtyThreeDayPct = item['63d %'] ? (parseFloat(item['63d %'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const prevoneDayPct = item['previous daily delta'] ? (parseFloat(item['previous daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const oneDayPctVal = parseFloat(item['daily delta']); // Separate variable for numerical comparison
            const oneDayPct = item['daily delta'] ? (parseFloat(item['daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const earningsOffsetClosest = item['Earnings Offset Closest'] || 'N/A'; // Handle NaN or blank

            // Extract the percentage from the 'Overall Record' string
            // const overallRecordPctMatch = item['Overall Record'].match(/(\d+\.\d+)%/);
            // overallRecordPct = overallRecordPctMatch ? parseFloat(overallRecordPctMatch[1]) : null;

            const earningsValue = parseFloat(item['Earnings Offset Closest']);
            const earningsInRange = !isNaN(earningsValue) && earningsValue >= minEarnings && earningsValue <= maxEarnings;

            const live_1d = (item['Current Price'] && item['Close']) ? 
                ((parseFloat(item['Current Price'])/parseFloat(item['Close']) - 1) * 100).toFixed(2) + '%' : 
                'N/A';

            const live_63d_peak = (item['Current Price'] && item['63d peak']) ? 
                ((parseFloat(item['Current Price'])/parseFloat(item['63d peak']) - 1) * 100).toFixed(2) + '%' : 
                'N/A';
            // console.log(`Ticker: ${item['Ticker']}, Current Price: ${currentPrice}, m20 Price: ${m20Price}, Price Diff: ${pricediff}, Price Diff Pct: ${pricediffpct}, Overall Record Pct: ${overallRecordPct}, One Day Pct Val: ${oneDayPctVal}, Earnings In Range: ${earningsInRange}`);

            if (pricediffpct >= minPriceDiffPct && 
                pricediffpct <= maxPriceDiffPct && 
                overallRecordPct >= minOverallRecordPct &&
                (isNaN(oneDayPctVal) || oneDayPctVal < 0) &&
                earningsInRange) {
            // if (pricediffpct >= minPriceDiffPct && pricediffpct <= maxPriceDiffPct && overallRecordPct >= minOverallRecordPct && (isNaN(oneDayPctVal) || oneDayPctVal < 0)) {
            // if (pricediffpct >= -2 && pricediffpct <= 2 && overallRecordPct >= 80) {
            // if (pricediffpct >= -2 && pricediffpct <= 2) {
                let row = tableBody.insertRow();

                // Apply purple glow if pricediffpct is >= 00
                if (pricediffpct >= 0) {
                    row.classList.add('purple-glow');
                }

                // console.log("Adding row for:", item['Ticker'], item[overallRecordKey], pulledAt); // Debugging line

                row.insertCell().textContent = item['Ticker'];        // Changed from item.ticker
                row.insertCell().textContent = item[overallRecordKey];
                row.insertCell().textContent = `${item['Current Price']} (${live_1d})`
                row.insertCell().textContent = item['Close'];
                row.insertCell().textContent = m20Price;       // This is correct
                row.insertCell().textContent = `${pricediff} (${pricediffpct}%)`;
                row.insertCell().textContent = prevoneDayPct;       // Add prev 1d %
                row.insertCell().textContent = oneDayPct;       // Add 1d %
                row.insertCell().textContent = live_63d_peak;       // was sixtyThreeDayPct
                row.insertCell().textContent = earningsOffsetClosest;
                row.insertCell().textContent = pulledAt;     // Changed from item.lastUpdated


                row.addEventListener('click', () => {
                    // Retrieve and log the 'Ticker'
                    const ticker = item['Ticker'];
                    // console.log('Ticker from watchlist selected:', ticker);
        
                    // Update the ticker text in the HTML
                    document.getElementById('tickerSpan').textContent = ticker;

                    // remove showdiv class from div with ids = rd_closeseries, rd_63d, rd_63dearnings
                    // add hidediv class from div with ids = rd_closeseries, rd_63d, rd_63dearnings
                    const divIdsToHide = ['rd_closeseries', 'rd_63d', 'rd_63dearnings'];
                    divIdsToHide.forEach(divId => {
                        const div = document.getElementById(divId);
                        if (div) {
                            div.classList.remove('showdiv');
                            div.classList.add('hidediv');
                        }
                    });

                    // remove hidediv class from div with id = rd_oneminute
                    // add showdiv class from div with id = rd_oneminute
                    const oneMinuteDiv = document.getElementById('rd_oneminute');
                    oneMinuteDiv.classList.remove('hidediv');
                    oneMinuteDiv.classList.add('showdiv');

                    fetch("/api/one_minute_chartdata/" + ticker, { cache: 'no-cache' })
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
                
                        // Layout configuration
                        const layout = {
                            margin: { l: 50, r: 25, b: 25, t: 25 },
                            paper_bgcolor: 'rgb(16 16 16 / 0%)',
                            plot_bgcolor: 'rgb(16 16 16 / 0%)',
                            xaxis: {
                                color: '#868D98',
                                gridcolor: '#444',
                                range: [trace[0] ? trace[0].Datetime : '09:30', '15:59']  // Set the x-axis range
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
                        Plotly.newPlot('graphDiv6', [trace], layout, config);

                        minute_data_shown = true;
                
                    })
                    .catch(error => console.error('Error fetching data for ticker', ticker, ':', error));
                });

            }
        });
}

function fetchPortData() {


    // Get the selected value from the dropdown
    // const selectedAccount = document.getElementById('optionsDropdown').value;
    // get the text content of the selected option
    const selectedAccount = document.getElementById('optionsDropdown').selectedOptions[0].text;

    // Fetch the data from the server (assuming your Python server has endpoints set up)
    // fetch('/api/get-portfolio')
    fetch(`/api/get-portfolio?account=${selectedAccount}`)
    .then(response => response.json())
    .then(data => {

        // console.log(data); // verified that json file contains all columns

        // Assuming the data is an array of objects with {ticker, currentPrice, m20tmrw, lastUpdated}
        const tableBody = document.getElementById('port-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Clear existing rows

        // Populate the table with new rows
        data.forEach(item => {
            
            let row = tableBody.insertRow();

            // Calculate the percentage change
            let last = item['Last'];
            let target = item['Target'];
            let buyPrice = item['Buy Price'];
            let percentageChange = ((last / buyPrice - 1) * 100).toFixed(2);

            row.insertCell().textContent = item['symbol'];
            row.insertCell().textContent = item['Buy Date'];
            row.insertCell().textContent = item['Buy Price'];

            // Last Price Cell
            let lastCell = row.insertCell();
            lastCell.textContent = `${last} (${percentageChange}%)`;

            // Change text color to red if the percentage is negative
            if (percentageChange < 0) {
                lastCell.style.color = palette_red;
            }

            // Add the purple-glow class to the row if:
            // There is a valid target value.
            // There is no Sell Date set for the item.
            // The last value is greater than the target value.
            if (target && !item['Sell Date'] && last > target) {
                row.classList.add('purple-glow');
            }

            let rtd = parseFloat(item['RTD']);
            let rtdGSPC = parseFloat(item['RTD (GSPC)']);
        
            if (rtd >= rtdGSPC && item['Sell Date']) {
                row.classList.add('green-success-glow');
            } else {
                if (item['Sell Date']) {
                    row.classList.add('grey-hidden-glow');
                }
            }

            row.insertCell().textContent = item['Target'];
            row.insertCell().textContent = item['1d%'];
            row.insertCell().textContent = item['63d%'];
            row.insertCell().textContent = item['Sell Date'];
            row.insertCell().textContent = item['Sell Price'];
            row.insertCell().textContent = item['RTD'];
            row.insertCell().textContent = item['RTD (GSPC)'];
            row.insertCell().textContent = item['Earnings'];
            
        });
    })
    .catch(error => console.error('Error fetching data:', error));
}




// Function to toggle the 'hidediv' class
function toggleHiddenTableMenu() {
    var elements = document.querySelectorAll('.hiddentablemenu');
    elements.forEach(function(element) {
        element.classList.toggle('hidediv');
    });
}

// Set up the event listener on all elements with the 'settings-icon' class
var settingsIcons = document.querySelectorAll('.settings-icon');
settingsIcons.forEach(function(icon) {
    icon.addEventListener('click', toggleHiddenTableMenu);
});

function setupTitlesInteraction() {
    // console.log('Adding button listeners...');

    var graphDiv5Button = document.querySelector("button[data-target='graphDiv5']");
    var holdingsDiv6Button = document.querySelector("button[data-target='holdingsDiv6']");
    var graphDiv5 = document.getElementById("graphDiv5");
    var holdingsDiv6 = document.getElementById("holdingsDiv6");

    graphDiv5Button.addEventListener("click", function() {
        graphDiv5.classList.add('showdiv');
        graphDiv5.classList.remove('hidediv');
        holdingsDiv6.classList.add('hidediv');
        holdingsDiv6.classList.remove('showdiv');
        // console.log("Showing Incoming Meteors");
    });

    holdingsDiv6Button.addEventListener("click", function() {
        holdingsDiv6.classList.add('showdiv');
        holdingsDiv6.classList.remove('hidediv');
        graphDiv5.classList.add('hidediv');
        graphDiv5.classList.remove('showdiv');
        // console.log("Showing Holdings");
    });
}

function loadDataForTicker(ticker) {
    // added parsing for Last-Modified http header
    return fetch(`/api/chartdata/${ticker}.csv`)
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

function loadSectorData() {
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

function processSectorData() {
    // Assuming 'currentTicker' is defined and accessible
    const tickerData = sectorDataCache.find(row => row.Symbol === currentTicker);
    if (tickerData) {
        document.getElementById('sectormerrill').textContent = tickerData.Sector;
    } else {
        document.getElementById('sectormerrill').textContent = 'Unknown';
    }
}

function csvToJSON(csv) {
    // Adjusting the split method to handle different types of line breaks
    const lines = csv.split(/\r\n|\n/);
    // console.log('Number of lines:', lines.length); // Log the number of lines
    const result = [];
    const headers = lines[0].split(",");

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines
        // console.log('Processing line:', lines[i]); // Log each line being processed

        let obj = {};
        const currentline = lines[i].split(",");

        if (currentline.length !== headers.length) {
            console.error('Mismatched column count on line ' + i);
            continue; // Skip lines with mismatched column count
        }

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = currentline[j].trim();
            // console.log(`Data at ${headers[j].trim()}:`, currentline[j].trim()); // Log each data point
        }
        result.push(obj);
    }
    // console.log('Final JSON:', result); // Log the final JSON
    return result;
}

function adjustGraphHeights() {
    var headerHeight = document.querySelector('header').offsetHeight; // Replace 'header' with the appropriate selector for your header
    var tickerTapeHeight = document.querySelector('.ticker-tape').offsetHeight; // Adjust if your ticker-tape class is different

    var availableHeight = window.innerHeight - headerHeight - tickerTapeHeight;
    var graphHeight = availableHeight / 2; // Divide the available height between the two graphs

    document.getElementById('graphDiv').style.height = graphHeight + 'px';
    document.getElementById('graphDiv2').style.height = graphHeight + 'px';
}

function handlePath() {
    var path = document.location.pathname.substring(1); // Remove the leading slash

    var checkTickerList = setInterval(function() {

        if (path) {

            // Check if the path is for the mobile page
            if (path === 'index_mobile.html') {
                clearInterval(checkTickerList); // Stop polling
                plotGraph(tickerlist[0]);
                // Code to handle mobile page logic
                console.log('Mobile page detected');
                // Add any mobile-specific JavaScript here
            } else if (path === 'index_legacy.html') {
                clearInterval(checkTickerList); // Stop polling

                // plotGraph(tickerlist[0]);
 
                // Code to handle mobile page logic
                console.log('Legacy page detected');
                // Add any mobile-specific JavaScript here
            } else if (tickerlist && tickerlist.length > 0) {
                clearInterval(checkTickerList);  // Stop polling

                console.log('updating page content for: ', path); // This will log 'aapl' if the URL is https://marketmeteor.org/aapl
                // Call a function to handle the path, like updating the page content
                var capitalizedPath = path.toUpperCase();

                console.log('indexing ', capitalizedPath, ' in tickerlist ...')

                // console.log(tickerlist)

                // Ensure tickerList is loaded
                if (tickerlist && tickerlist.length > 0) {
                    // Find the index of the capitalized path in tickerList
                    var index = tickerlist.findIndex(ticker => ticker === capitalizedPath);
                    if (index !== -1) {
                        // If the ticker is found, set it as active
                        setActiveTicker(index);
                        console.log(index)
                    } else {
                        console.log('Ticker not found:', capitalizedPath);
                    }
                } else {
                    console.log('Ticker list not available.');
                }
            }
        }
        else{
            clearInterval(checkTickerList);  // Stop polling
            plotGraph(tickerlist[0]);
            // console.log('Plotting graph for:', tickerlist[0]);
        }

    }, 100); // Check every 100 milliseconds

    // fetchAndDisplayData();
}

// Function to simulate a double-click
function simulateDoubleClick(selector) {

    // Use requestAnimationFrame: For visual changes, wrapping the changes in requestAnimationFrame 
    // can ensure they're made at the optimal time in the browser's rendering cycle.

    var event = new MouseEvent('dblclick', {
      'bubbles': true,
      'cancelable': true
    });
  
    var element = document.querySelector(selector);
    
    if(element) {
      requestAnimationFrame(function() {
        element.dispatchEvent(event);
      });
    } else {
      console.error('Element not found');
    }
  }

function setUpEventListeners() {

    document.getElementById('watchlist').addEventListener('dblclick', function(event) {
        // Find the parent .row of the clicked .watchlist
        var clickedRow = event.currentTarget.closest('.row');

        // Use a flag to track the state of the click
        var isExpanded = clickedRow.getAttribute('data-expanded') === 'true';

        // Select all .row elements
        var rows = document.querySelectorAll('.row');

        rows.forEach(function(row) {
            if (row === clickedRow) {
                // Toggle the height of the clicked .row

                // I want to change height 100% if not Expanded, 
                // otherwise remove the height
                row.style.height = isExpanded ? '' : '100%'; // Use '' to remove inline height
                // row.style.height = isExpanded ? '50%' : '100%';

                // Update the expanded state
                clickedRow.setAttribute('data-expanded', !isExpanded);
            } else {
                // Show other rows if collapsing the clicked row, hide if expanding
                if (isExpanded) {
                    row.classList.remove('hidediv');
                } else {
                    row.classList.add('hidediv');
                }
            }

            // Toggle visibility of all .roundedDiv elements in each row
            // var roundedDivs = row.querySelectorAll('.roundedDiv');
            // var roundedDivs = row.querySelectorAll('.roundedDiv:not(#watchlist)');
            var roundedDivs = row.querySelectorAll('.roundedDiv:not(#watchlist):not(#rd_oneminute)');

            roundedDivs.forEach(function(div) {
                if (isExpanded) {
                    div.classList.remove('hidediv');
                    div.classList.add('showdiv');
                } else {
                    div.classList.remove('showdiv');
                    div.classList.add('hidediv');
                }
            });
        });

        resizePlotlyGraphs();

    });

    document.getElementById('rd_63d').addEventListener('dblclick', function(event) {

        // CAUSES A HEIGHTING ISSUE

        // Find the parent .row of the clicked .rd_63d
        var clickedRow = event.currentTarget.closest('.row');

        // Use a flag to track the state of the click
        var isExpanded = clickedRow.getAttribute('data-expanded') === 'true';

        // Select all .row elements
        var rows = document.querySelectorAll('.row');

        rows.forEach(function(row) {
            if (row === clickedRow) {
                // Toggle the height of the clicked .row
                row.style.height = isExpanded ? '' : '100%'; // Use '' to remove inline height
                // row.style.height = isExpanded ? '50%' : '100%';
                // Update the expanded state
                clickedRow.setAttribute('data-expanded', !isExpanded);
            } else {
                // Show other rows if collapsing the clicked row, hide if expanding
                if (isExpanded) {
                    row.classList.remove('hidediv');
                } else {
                    row.classList.add('hidediv');
                }
            }

            // Toggle visibility of all .roundedDiv elements in each row
            // var roundedDivs = row.querySelectorAll('.roundedDiv');
            // var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_63d)');
            var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_63d):not(#rd_oneminute)');

            roundedDivs.forEach(function(div) {
                if (isExpanded) {
                    div.classList.remove('hidediv');
                    div.classList.add('showdiv');
                } else {
                    div.classList.remove('showdiv');
                    div.classList.add('hidediv');
                }
            });
        });

        resizePlotlyGraphs();

    });


    document.getElementById('rd_63dearnings').addEventListener('dblclick', function(event) {


        // CAUSES A HEIGHTING ISSUE

        // Find the parent .row of the clicked .rd_63dearnings
        var clickedRow = event.currentTarget.closest('.row');

        // Use a flag to track the state of the click
        var isExpanded = clickedRow.getAttribute('data-expanded') === 'true';

        // Select all .row elements
        var rows = document.querySelectorAll('.row');

        rows.forEach(function(row) {
            if (row === clickedRow) {
                // Toggle the height of the clicked .row
                row.style.height = isExpanded ? '' : '100%'; // Use '' to remove inline height
                // row.style.height = isExpanded ? '50%' : '100%';
                // Update the expanded state
                clickedRow.setAttribute('data-expanded', !isExpanded);
            } else {
                // Show other rows if collapsing the clicked row, hide if expanding
                if (isExpanded) {
                    row.classList.remove('hidediv');
                } else {
                    row.classList.add('hidediv');
                }
            }

            // Toggle visibility of all .roundedDiv elements in each row
            // var roundedDivs = row.querySelectorAll('.roundedDiv');
            // var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_63dearnings)');
            var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_63dearnings):not(#rd_oneminute)');

            roundedDivs.forEach(function(div) {
                if (isExpanded) {
                    div.classList.remove('hidediv');
                    div.classList.add('showdiv');
                } else {
                    div.classList.remove('showdiv');
                    div.classList.add('hidediv');
                }
            });
        });

        resizePlotlyGraphs();

    });

    document.getElementById('rd_closeseries').addEventListener('dblclick', function(event) {

        // Find the parent .row of the clicked .rd_closeseries
        var clickedRow = event.currentTarget.closest('.row');

        // Use a flag to track the state of the click
        var isExpanded = clickedRow.getAttribute('data-expanded') === 'true';

        // Select all .row elements
        var rows = document.querySelectorAll('.row');

        rows.forEach(function(row) {
            if (row === clickedRow) {
                // Toggle the height of the clicked .row
                row.style.height = isExpanded ? '' : '100%'; // Use '' to remove inline height
                // row.style.height = isExpanded ? '50%' : '100%';
                // Update the expanded state
                clickedRow.setAttribute('data-expanded', !isExpanded);
            } else {
                // Show other rows if collapsing the clicked row, hide if expanding
                if (isExpanded) {
                    row.classList.remove('hidediv');
                } else {
                    row.classList.add('hidediv');
                }
            }

            // Toggle visibility of all .roundedDiv elements in each row
            // var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_closeseries)');
            var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_closeseries):not(#rd_oneminute)');

            roundedDivs.forEach(function(div) {
                if (isExpanded) {
                    div.classList.remove('hidediv');
                    div.classList.add('showdiv');
                } else {
                    div.classList.remove('showdiv');
                    div.classList.add('hidediv');
                }
            });
        });

        resizePlotlyGraphs();

    });

    document.getElementById('rd_maxfwd').addEventListener('dblclick', function(event) {
        // Find the parent .row of the clicked .rd_maxfwd
        var clickedRow = event.currentTarget.closest('.row');

        // Use a flag to track the state of the click
        var isExpanded = clickedRow.getAttribute('data-expanded') === 'true';

        // Select all .row elements
        var rows = document.querySelectorAll('.row');

        rows.forEach(function(row) {
            if (row === clickedRow) {
                // Toggle the height of the clicked .row
                row.style.height = isExpanded ? '' : '100%'; // Use '' to remove inline height
                // row.style.height = isExpanded ? '50%' : '100%';
                // Update the expanded state
                clickedRow.setAttribute('data-expanded', !isExpanded);
            } else {
                // Show other rows if collapsing the clicked row, hide if expanding
                if (isExpanded) {
                    row.classList.remove('hidediv');
                } else {
                    row.classList.add('hidediv');
                }
            }

            // Toggle visibility of all .roundedDiv elements in each row
            // var roundedDivs = row.querySelectorAll('.roundedDiv');
            // var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_maxfwd)');
            var roundedDivs = row.querySelectorAll('.roundedDiv:not(#rd_maxfwd):not(#rd_oneminute)');

            roundedDivs.forEach(function(div) {
                if (isExpanded) {
                    div.classList.remove('hidediv');
                    div.classList.add('showdiv');
                } else {
                    div.classList.remove('showdiv');
                    div.classList.add('hidediv');
                }
            });
        });

        resizePlotlyGraphs();

    });

}

// window.onload = adjustGraphHeights;
// window.onresize = adjustGraphHeights;

window.onload = function() {

    fetchAccessLogData();

    handlePath();

    // setUpEventListeners();

    // fetchPortData();

    // setupTitlesInteraction();

    // resizePlotlyGraphs();

};

// window.onload = handlePath;

// window.onload = function() {
//     setTimeout(function() {
//         fetchAndDisplayData();
//     }, 3000); // 3000 milliseconds = 3 seconds
// };
