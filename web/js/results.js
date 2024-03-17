export function fetch_portfolio_simulations() {

    // gets summary.csv and loads it in div named "results-side-panel", beneath the h1
    // headers:
        // Start,
        // Total Return,
        // Beta,
        // Alpha,
        // Standard Deviation,
        // Sharpe Ratio,
        // Information Ratio,
        // average_risk_free_rate,
        // GSPC,
        // CD,
        // Sinkhole,
        // Buy Count

    fetch('/api/get-portsim-summary', {
    cache: 'no-cache', // or 'reload'
    })
    .then(response => response.json())
    .then(data => {

        const tableBody = document.getElementById('portsimsummary-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Clear existing rows

        console.log(data)

        // Skip the first row (headers) and iterate over the rest
        for (let i = 1; i < data.length; i++) {
            let row = tableBody.insertRow();
            let rowData = data[i];

            // Add click event listener to each row
            row.addEventListener('click', function() {
                postStartNr(rowData[0]); // Sends the first column ('Start') value
            });

            rowData.forEach(cellData => {
                let cell = row.insertCell();
                cell.textContent = formatDecimal(cellData);
            });
        }

    })
    .catch(error => console.error('Error fetching data:', error));
}

function postStartNr(startValue) {

    // sends the (portfolio) start number to retrieve dateN/port_timeseries.csv and dateN/portsim.csv
    fetch('/api/post-porttimeseries', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start: startValue }),
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response data
        console.log(data);

        // div with class "results-top-section"
        // call a function to create a scatter plotlyjs using timeseries
        createScatterPlot(data.timeseries);

        // div with class "results-bottom-section"
        // call a function to fill using holdingsHistory
        fillHoldingsHistoryTable(data.holdingsHistory);
    })
    .catch(error => console.error('Error in POST request:', error));
}

function createScatterPlot(timeseries) {
    const data = timeseries.map(item => ({
        x: item['date_nr'],
        y: item['Portfolio Value']
    }));

    const layout = {
        title: 'Portfolio Value Over Time',
        xaxis: {
            title: 'Date Number'
        },
        yaxis: {
            title: 'Portfolio Value'
        }
    };

    Plotly.newPlot('results-top-section', [data], layout);
}

function fillHoldingsHistoryTable(holdingsHistory) {
    const tableBody = document.getElementById('portsimholdings-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    holdingsHistory.forEach(rowData => {
        let row = tableBody.insertRow();
        rowData.forEach(cellData => {
            let cell = row.insertCell();
            cell.textContent = cellData;
        });
    });
}

function formatDecimal(value) {
    // The formatDecimal function checks if a value is a number and has a decimal point.
    // If it's a decimal number, it formats it to have a maximum of two decimal places using toFixed(2).
    // If it's not a number or doesn't have a decimal, it returns the value unchanged.

    // Check if the value is a number
    if (!isNaN(value) && value.toString().indexOf('.') != -1) {
        return parseFloat(value).toFixed(2);
    }
    return value;
}