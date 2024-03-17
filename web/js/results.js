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

    const plotDiv = document.querySelector('.results-top-section');
    plotDiv.id = 'plotly-div'; // Assign a unique ID

    // Ensure timeseries data is available and has more than just the header row
    if (!timeseries || timeseries.length <= 1) {
        console.log("Insufficient data for plotting");
        return;
    }

    // Prepare data for Plotly
    const plotData = {
        x: timeseries.map(row => row[0]), // Assuming date_nr is the first column
        y: timeseries.map(row => parseFloat(row[1])), // Assuming Portfolio Value is the second column
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: 'blue' },
    };

    const layout = {
        title: 'Portfolio Value Over Time',
        xaxis: { title: 'Date Number' },
        yaxis: { title: 'Portfolio Value' }
    };

    // Plotly.newPlot('results-top-section', [plotData], layout);
    Plotly.newPlot('plotly-div', [plotData], layout);
}


function fillHoldingsHistoryTable(holdingsHistory) {
    const tableBody = document.getElementById('portsimholdings-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    // holdingsHistory.forEach(rowData => {
    //     let row = tableBody.insertRow();
    //     rowData.forEach(cellData => {
    //         let cell = row.insertCell();
    //         cell.textContent = cellData;
    //     });
    // });

    // Skip the first row (headers) and iterate over the rest
    for (let i = 1; i < holdingsHistory.length; i++) {
        let row = tableBody.insertRow();
        let rowData = holdingsHistory[i];

        rowData.forEach(cellData => {
            let cell = row.insertCell();
            cell.textContent = formatDecimal(cellData);
        });
    }


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