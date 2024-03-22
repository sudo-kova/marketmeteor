import { palette_purple, palette_red, palette_yellow, palette_green, palette_light_gray } from './colors.js';
import { setMinuteDataShown, getMinuteDataShown } from './script_parallax.js';

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
                // title: 'Time'  // Add a title to the X-axis
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

export function fill_gainers_table(){

    const minOverallRecordPct = 50;
    const minPriceDiffPct = -50;
    const maxPriceDiffPct = 50;
    const minEarnings = -63;
    const maxEarnings = 63;

    fetch('/api/get-gainers-data', {
        cache: 'no-cache', // or 'reload'
    })
    .then(response => response.json())
    .then(data => {

        // console.log(data); // verified that json file contains all columns
        // globalData = data; // store for applyFilter_m20data() later
        // setglobalData(data)

        // Assuming the data is an array of objects with {ticker, currentPrice, m20tmrw, lastUpdated}
        const tableBody = document.getElementById('gainers-table').getElementsByTagName('tbody')[0];
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


            const averageDuration = parseFloat(item['average_duration']);
            const totalDaysBelowThreshold = parseFloat(item['total_days_below_threshold']);
            const earningsInRangeFilt6 = !isNaN(earningsValue) && earningsValue >= -63 && earningsValue <= 14;

            // console.log(`Ticker: ${item['Ticker']}, Current Price: ${currentPrice}, m20 Price: ${m20Price}, Price Diff: ${pricediff}, Price Diff Pct: ${pricediffpct}, Overall Record Pct: ${overallRecordPct}, One Day Pct Val: ${oneDayPctVal}, Earnings In Range: ${earningsInRange}`);

            if (pricediffpct >= minPriceDiffPct && 
                pricediffpct <= maxPriceDiffPct && 
                overallRecordPct >= minOverallRecordPct &&
                earningsInRange) {
                    
            // if (pricediffpct >= minPriceDiffPct && pricediffpct <= maxPriceDiffPct && overallRecordPct >= minOverallRecordPct && (isNaN(oneDayPctVal) || oneDayPctVal < 0)) {
            // if (pricediffpct >= -2 && pricediffpct <= 2 && overallRecordPct >= 80) {
            // if (pricediffpct >= -2 && pricediffpct <= 2) {
                let row = tableBody.insertRow();

                // Apply purple glow if pricediffpct is >= 00
                if (pricediffpct >= 0) {
                    row.classList.add('purple-glow');
                }

                let category = ''
                // earningsValue between -63 and 14 (including -63 but not including 14)
                // average_duration <= 7
                // total_days_below_threshold < 126
                // live_63d_peak >= -35
                // live_1d >= -5
                if(averageDuration <= 7 && 
                    totalDaysBelowThreshold < 126 &&
                    earningsInRangeFilt6 &&
                    parseFloat(live_63d_peak) >= -35 &&  // Ensure proper parsing for comparison
                    parseFloat(live_1d) >= -5) {         // Ensure proper parsing for comparison
                     category = 'High Probability';      // Renamed for clarity
                 }

                // console.log("Adding row for:", item['Ticker'], item[overallRecordKey], pulledAt); // Debugging line

                row.insertCell().textContent = item['Ticker'];        // Changed from item.ticker
                row.insertCell().textContent = item[overallRecordKey];
                row.insertCell().textContent = `${item['Current Price'].toFixed(2)} (${live_1d})`
                row.insertCell().textContent = item['Close'];
                row.insertCell().textContent = m20Price;       // This is correct
                row.insertCell().textContent = `${pricediff} (${pricediffpct}%)`;
                row.insertCell().textContent = prevoneDayPct;       // Add prev 1d %
                row.insertCell().textContent = oneDayPct;       // Add 1d %
                row.insertCell().textContent = live_63d_peak;       // was sixtyThreeDayPct
                row.insertCell().textContent = earningsOffsetClosest;
                row.insertCell().textContent = item['average_duration'];
                row.insertCell().textContent = item['total_days_below_threshold'];
                row.insertCell().textContent = category;
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
                        Plotly.newPlot('graphDiv6', [trace], layout, config);

                        // minute_data_shown = true;
                        setMinuteDataShown(true)
                
                    })
                    .catch(error => console.error('Error fetching data for ticker', ticker, ':', error));
                });

            }
        });

        // Once data is fetched, apply the flash animation
        const tbodyElement = document.querySelector('#gainers-table tbody');
        tbodyElement.classList.add('flash');
    
        // Remove the class after the animation is complete to reset the state
        setTimeout(() => {
            tbodyElement.classList.remove('flash');
        }, 1000); // Should match the duration of the animation

        
    })
    .catch(error => console.error('Error fetching data:', error));

}