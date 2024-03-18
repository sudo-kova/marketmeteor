import { palette_purple, palette_red, palette_yellow, palette_green } from './colors.js';

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

        console.log(data);

        fillSummary(data.scenariosummary);

        fillPortSimSummaryTable(data.portsimsummary);
        

        // // Skip the first row (headers) and iterate over the rest
        // for (let i = 1; i < data.length; i++) {
        //     let row = tableBody.insertRow();
        //     let rowData = data[i];

        //     // Add click event listener to each row
        //     row.addEventListener('click', function() {
        //         postStartNr(rowData[0]); // Sends the first column ('Start') value
        //     });

        //     rowData.forEach(cellData => {
        //         let cell = row.insertCell();
        //         cell.textContent = formatDecimal(cellData);
        //     });
        // }

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

function createScatterPlot_single(timeseries) {

    const plotDiv = document.querySelector('.results-top-section');
    plotDiv.id = 'plotly-div'; // Assign a unique ID

    let configport = {modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
    displaylogo: false}

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
        marker: { color: palette_purple },
    };

    const layout = {
        margin: { l: 50, r: 25, b: 25, t: 25 },
        // title: 'Portfolio Value Over Time',
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

    // Plotly.newPlot('results-top-section', [plotData], layout);
    Plotly.newPlot('plotly-div', [plotData], layout);
}

function createScatterPlot(timeseries) {
    const plotDiv = document.querySelector('.results-top-section');
    plotDiv.id = 'plotly-div'; // Assign a unique ID

    let configport = {
        modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        displaylogo: false
    };

    // Ensure timeseries data is available and has more than just the header row
    if (!timeseries || timeseries.length <= 1) {
        console.log("Insufficient data for plotting");
        return;
    }

    // Assuming date_nr is the first column, Portfolio Value is the second column
    // and the second-to-last column is the Secondary Metric
    const plotDataPortfolioValue = {
        x: timeseries.map(row => row[0]),
        y: timeseries.map(row => parseFloat(row[1])),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Portfolio Value',
        marker: { color: palette_purple },
    };

    const plotDataSecondaryMetric = {
        x: timeseries.map(row => row[0]),
        y: timeseries.map(row => parseFloat(row[row.length - 2])),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'S&P 500 Index',
        marker: { color: palette_green },
    };

    const layout = {
        margin: { l: 50, r: 25, b: 25, t: 25 },
        paper_bgcolor: 'rgb(16 16 16 / 0%)',
        plot_bgcolor: 'rgb(16 16 16 / 0%)',
        xaxis: { 
            color: '#868D98',
            gridcolor: '#444'
        },
        yaxis: { 
            color: '#868D98',
            gridcolor: '#444'
        }
    };

    Plotly.newPlot('plotly-div', [plotDataPortfolioValue, plotDataSecondaryMetric], layout, configport);
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

function fillSummary(scenarioSummary) {
    const list = document.getElementById('summary-list'); // Ensure this element exists in your HTML
    if (list) { // Check if the element exists to avoid errors
        list.innerHTML = ''; // Clear existing list items

        // Skip the headers, which are at index 0
        scenarioSummary.slice(1).forEach((scenario) => {
            let listItem = document.createElement('li');
            // Skip the first two values ('Scenario' and 'Base Path') and join the rest
            let content = scenario.slice(2).map(value => formatDecimal(value)).join(', ');
            listItem.textContent = content;
            list.appendChild(listItem);
        });
    } else {
        console.error("Element with id 'summary-list' was not found.");
    }
}


function fillPortSimSummaryTable(data){


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