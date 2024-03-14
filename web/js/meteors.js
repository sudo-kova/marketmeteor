export function fetchAndDisplayData() {

    // I put default values into the html

    const minOverallRecordPct = parseFloat(document.getElementById('minOverallRecordPct').value) || 90;
    const minPriceDiffPct = parseFloat(document.getElementById('minPriceDiffPct').value) || -2;
    const maxPriceDiffPct = parseFloat(document.getElementById('maxPriceDiffPct').value) || 2;
    const minEarnings = parseFloat(document.getElementById('minearnings').value) || 2;
    const maxEarnings = parseFloat(document.getElementById('maxearnings').value) || 3;

    // Fetch the data from the server (assuming your Python server has endpoints set up)
    fetch('/api/get-m20-data', {
        cache: 'no-cache', // or 'reload'
    })
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

                        minute_data_shown = true;
                
                    })
                    .catch(error => console.error('Error fetching data for ticker', ticker, ':', error));
                });

            }
        });

        // Once data is fetched, apply the flash animation
        const tbodyElement = document.querySelector('#m20-table tbody');
        tbodyElement.classList.add('flash');
    
        // Remove the class after the animation is complete to reset the state
        setTimeout(() => {
            tbodyElement.classList.remove('flash');
        }, 1000); // Should match the duration of the animation

        
    })
    .catch(error => console.error('Error fetching data:', error));
}