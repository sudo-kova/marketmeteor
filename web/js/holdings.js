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

export function createPortfolio_row() {
    // Get the table element
    const table = document.getElementById('port-table');
    let tbody = table.getElementsByTagName('tbody')[0];

    // If tbody doesn't exist, create it and append it to the table
    if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
    }

    // Create a new row
    const newRow = document.createElement('tr');

    // Define the cell properties
    const cellProperties = [
        { editable: true, required: true, placeholder: 'AAPL (in caps)' }, // Ticker
        { editable: true, required: true, placeholder: 'MM/DD/YYYY' },     // Buy Date
        { editable: true, required: true, placeholder: '0.00' },           // Buy Price
        { editable: false },                                               // Last
        { editable: true, required: false, placeholder: '0.00' },          // Target
        { editable: false },                                               // 1d %
        { editable: false },                                               // 63d %
        { editable: true, required: false, placeholder: 'MM/DD/YYYY' },    // Sell Date
        { editable: true, required: false, placeholder: '0.00' },          // Sell Price
        { editable: false },                                               // RTD
        { editable: false },                                               // RTD (GSPC)
        { editable: false }                                                // Earnings
    ];

    // Create cells based on properties
    cellProperties.forEach((prop, i) => {
        const newCell = document.createElement('td');
        newCell.contentEditable = prop.editable;

        if (prop.editable) {
            if (prop.required) {
                newCell.classList.add('required-cell');
                newCell.setAttribute('data-placeholder', prop.placeholder);
                // Placeholder text and event listeners as before
                newCell.innerText = prop.placeholder; 
                newCell.classList.add('placeholder');
                newCell.addEventListener('focus', function() {
                    if (this.classList.contains('placeholder')) {
                        this.innerText = '';
                        this.classList.remove('placeholder');
                    }
                });
                newCell.addEventListener('blur', function() {
                    if (this.innerText === '') {
                        this.innerText = prop.placeholder;
                        this.classList.add('placeholder');
                    }
                });
            } else {
                newCell.setAttribute('data-placeholder', prop.placeholder);
                newCell.innerText = prop.placeholder;
                newCell.classList.add('placeholder');
                newCell.addEventListener('focus', function() {
                    if (this.classList.contains('placeholder')) {
                        this.innerText = '';
                        this.classList.remove('placeholder');
                    }
                });
                newCell.addEventListener('blur', function() {
                    if (this.innerText === '') {
                        this.innerText = prop.placeholder;
                        this.classList.add('placeholder');
                    }
                });
            }
        }
        newRow.appendChild(newCell);
    });

    // Append the row to the table
    tbody.appendChild(newRow);
}

export function editPortfolio() {
    // Get all the rows in the tbody of the port-table
    const rows = document.querySelectorAll('#port-table tbody tr');

    // Toggle the edit mode
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            // Check if cell is in a column that should be editable
            const isEditableColumn = [0, 1, 2, 4, 7, 8].includes(index);

            if (cell.isContentEditable) {
                // If already editable, make it non-editable
                cell.contentEditable = 'false';
                cell.classList.remove('editable-cell');
                if (!isEditableColumn) {
                    // If it's not an editable column, clear the content
                    cell.textContent = '';
                }
            } else if (isEditableColumn) {
                // !! doesn't appear to be working
                // If not editable and it's an editable column, make it editable
                cell.contentEditable = 'true';
                cell.classList.add('editable-cell');
            }
        });
    });
}

export function savePortfolio(){

    validateTable()

    let temphideholdingsSettingsMenu = document.querySelector('.holdingsettingsmenu');
    temphideholdingsSettingsMenu.classList.add('button-disabled');
    // disabled all holding settings while saving temporarily

    const userEmail = globalUserEmail; 
    let portfolioName = document.getElementById('newPortfolioName').value;
    const table = document.getElementById('port-table');
    const rows = table.rows;
    const portfolioData = [];

    // ---- DATA validation ----
    // Replace spaces with underscores
    portfolioName = portfolioName.replace(/\s+/g, '_');
    // Remove special characters, allow only alphanumeric and underscores
    portfolioName = portfolioName.replace(/[^a-zA-Z0-9_]/g, '');
    // ---- end of validation ----

    let tickerIndex = -1; // Index of the "Ticker" column

    // Process header row separately to find the "Ticker" column index
    if (rows.length > 0) {
        const headerCells = rows[0].cells;
        const headerData = [];
        for (let j = 0; j < headerCells.length; j++) {
            const cellText = headerCells[j].innerText || headerCells[j].textContent;
            if (cellText === "Ticker") {
                tickerIndex = j;
                headerData.push("symbol");
            } else {
                headerData.push(cellText);
            }
        }
        portfolioData.push(headerData);
    }

    // Process remaining rows
    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].cells;
        const rowData = [];
        for (let j = 0; j < cells.length; j++) {
            // if (j === tickerIndex) {
            //     // Replace "Ticker" with "symbol" in data rows
            //     rowData.push("symbol");
            // } else {
            //     rowData.push(cells[j].innerText || cells[j].textContent);
            // }
            rowData.push(cells[j].innerText || cells[j].textContent);
        }
        portfolioData.push(rowData);
    }

    const portfolio = {
        token: globalToken,
        user: userEmail,
        name: portfolioName,
        data: portfolioData
    };

    console.log(JSON.stringify(portfolio)); // For demonstration

    // Send JSON to webserver
    fetch('/api/savePortfolio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(portfolio)
    }).then(async response => {
        // Handle response
        console.log('Portfolio saved:', response);

        // Check if the response is ok (status code in the range 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('User data:', responseData);
        
        const allWatchlists = [...responseData['public_watchlists'], ...responseData['user_watchlists']];
        updateDropdown(allWatchlists);

    }).catch(error => {
        // Handle error
        console.error('Error:', error);

    }).finally(() => {
        // spinner.style.display = 'none'; // Hide the spinner once the fetch is complete
        temphideholdingsSettingsMenu.classList.remove('button-disabled');
    });
}

// Function to validate the required cells
export function validateTable() {
    const requiredCells = document.querySelectorAll('.required-cell');
    let isValid = true;

    requiredCells.forEach(cell => {
        // Check if the cell's content is only the placeholder or is empty
        const isPlaceholderOrEmpty = cell.classList.contains('placeholder') || !cell.textContent.trim();

        if (isPlaceholderOrEmpty) {
            isValid = false;
            cell.classList.add('error'); // Highlight or indicate error
        } else {
            cell.classList.remove('error');
        }
    });

    return isValid;
}

export const updateDropdown = (watchlists) => {
    const dropdown = document.getElementById('optionsDropdown');
    dropdown.innerHTML = ''; // Clear existing options

    watchlists.forEach(watchlist => {
        const option = document.createElement('option');
        option.value = watchlist;
        option.text = watchlist;
        dropdown.appendChild(option);
    });
};