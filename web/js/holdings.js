import { palette_purple, palette_red, palette_yellow, palette_green } from './colors.js';
import { setMinuteDataShown, getMinuteDataShown } from './script_parallax.js';

export function fetchPortData() {


    // Get the selected value from the dropdown
    // const selectedAccount = document.getElementById('optionsDropdown').value;
    // get the text content of the selected option
    const selectedAccount = document.getElementById('optionsDropdown').selectedOptions[0].text;

    // Fetch the data from the server (assuming your Python server has endpoints set up)
    // fetch('/api/get-portfolio')
    fetch(`/api/get-portfolio?account=${selectedAccount}`, {
        cache: 'no-cache', // or 'reload'
    })
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
    // Ensure 'last' and 'target' are treated as numbers
            let last = Number(item['Last']);
            let target = Number(item['Target']);
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
            
            row.addEventListener('click', () => {
                // Retrieve and log the 'Ticker'
                const ticker = item['symbol'];
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

        });

        // Once data is fetched, apply the flash animation
        const tbodyElement = document.querySelector('#port-table tbody');
        tbodyElement.classList.add('flash');
    
        // Remove the class after the animation is complete to reset the state
        setTimeout(() => {
            tbodyElement.classList.remove('flash');
        }, 1000); // Should match the duration of the animation

    })
    .catch(error => console.error('Error fetching data:', error));
}