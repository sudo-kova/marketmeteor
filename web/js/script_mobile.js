let tickerItems;
let currentTicker;
let tickerlist;
let tickerDataSummary = {};
let initialTableData = {}; // save summary data once saved
let currentTableData = {}; // to maintaine state of currently filtered data

let isSummaryFetched = false;
let isFilterModalOpen = false;
const columnNames = ['Ticker', 'Record', 'Minimum M20', 'Latest Earnings Offset'];

let sortDirection = 'ascending'; // default direction of rows
let currentTickerIndex = 0; // keep track of active ticker in ticker-tape

let sectorDataCache = null;
let globalData = []; // This will hold the data fetched from /get-m20-data

// web socket
let socket;
let isListening = false;
function updateConnectionStatus(isConnected) {

    // Update the connection status indicator
    const statusIndicator = document.getElementById('connectionStatus');
    if (isConnected) {
        statusIndicator.classList.add('active');
        document.getElementById('toggleConnection').textContent = 'Disable Web Socket'; // Update button text
    } else {
        statusIndicator.classList.remove('active');
        document.getElementById('toggleConnection').textContent = 'Enable Web Socket'; // Update button text
    }

    document.getElementById('connectionStatus').style.backgroundColor = isConnected ? 'green' : 'red';
}

function toggleConnection() {
    if (isListening) {
        socket.close();
    } else {
        socket = new WebSocket('ws://localhost:6789');

        socket.onopen = function(event) {
            updateConnectionStatus(true);
        };

        socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            // Update your table with the new data
            updateTable(data);
        };

        socket.onclose = function(event) {
            updateConnectionStatus(false);
            isListening = false;
        };
    }
    isListening = !isListening;
}

document.getElementById('toggleConnection').addEventListener('click', toggleConnection);

function updateTable(data) {

    // need to update data.forEach to match: fetchAndDisplayData

    const minOverallRecordPct = parseFloat(document.getElementById('minOverallRecordPct').value) || 90;
    const minPriceDiffPct = parseFloat(document.getElementById('minPriceDiffPct').value) || -10;
    const maxPriceDiffPct = parseFloat(document.getElementById('maxPriceDiffPct').value) || 2;
    const minEarnings = parseFloat(document.getElementById('minearnings').value) || -40;
    const maxEarnings = parseFloat(document.getElementById('maxearnings').value) || 40;

    const tableBody = document.getElementById('m20-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(item => {
        // Extract the prices and calculate the percent difference
        const currentPrice = parseFloat(item['Current Price']) || 'N/A';
        const m20Price = parseFloat(item['m20tmrw']).toFixed(2) || 'N/A';
        const pricediff = -(currentPrice - m20Price).toFixed(2);
        const pricediffpct = (pricediff/currentPrice*100).toFixed(2);

        const sixtyThreeDayPct = item['63d %'] ? (parseFloat(item['63d %'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
        const oneDayPctVal = parseFloat(item['daily delta']); // Separate variable for numerical comparison
        const oneDayPct = item['daily delta'] ? (parseFloat(item['daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
        const earningsOffsetClosest = item['Earnings Offset Closest'] || 'N/A'; // Handle NaN or blank

        // Extract the percentage from the 'Overall Record' string
        const overallRecordPctMatch = item['Overall Record'].match(/(\d+\.\d+)%/);
        const overallRecordPct = overallRecordPctMatch ? parseFloat(overallRecordPctMatch[1]) : null;

        const earningsValue = parseFloat(item['Earnings Offset Closest']);
        const earningsInRange = !isNaN(earningsValue) && earningsValue >= minEarnings && earningsValue <= maxEarnings;


        if (pricediffpct >= minPriceDiffPct && 
            pricediffpct <= maxPriceDiffPct && 
            overallRecordPct >= minOverallRecordPct &&
            (isNaN(oneDayPctVal) || oneDayPctVal < 0) &&
            earningsInRange) {
        // if (pricediffpct >= minPriceDiffPct && pricediffpct <= maxPriceDiffPct && overallRecordPct >= minOverallRecordPct && (isNaN(oneDayPctVal) || oneDayPctVal < 0)) {
            let row = tableBody.insertRow();
            // Apply purple glow if pricediffpct is >= 0
            if (pricediffpct >= 0) {
                row.classList.add('purple-glow');
            }

            // Insert cells with the data
            row.insertCell().textContent = item['Ticker'];
            row.insertCell().textContent = item['Overall Record'];
            row.insertCell().textContent = item['Current Price'];
            row.insertCell().textContent = item['Close'];
            row.insertCell().textContent = m20Price;
            row.insertCell().textContent = `${pricediff} (${pricediffpct}%)`;
            row.insertCell().textContent = oneDayPct;
            row.insertCell().textContent = sixtyThreeDayPct;
            row.insertCell().textContent = earningsOffsetClosest;
            row.insertCell().textContent = item['Pulled At'];
        }
    });
}

function applyFilter_m20data() {

    // applies filter to existing data (globalData) that comes from /get-m20-data
    console.log('attempting to apply filter to globalData')

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
            const oneDayPctVal = parseFloat(item['daily delta']); // Separate variable for numerical comparison
            const oneDayPct = item['daily delta'] ? (parseFloat(item['daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const earningsOffsetClosest = item['Earnings Offset Closest'] || 'N/A'; // Handle NaN or blank

            // Extract the percentage from the 'Overall Record' string
            // const overallRecordPctMatch = item['Overall Record'].match(/(\d+\.\d+)%/);
            // overallRecordPct = overallRecordPctMatch ? parseFloat(overallRecordPctMatch[1]) : null;

            const earningsValue = parseFloat(item['Earnings Offset Closest']);
            const earningsInRange = !isNaN(earningsValue) && earningsValue >= minEarnings && earningsValue <= maxEarnings;

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

                console.log("Adding row for:", item['Ticker'], item[overallRecordKey], pulledAt); // Debugging line

                row.insertCell().textContent = item['Ticker'];        // Changed from item.ticker
                row.insertCell().textContent = item[overallRecordKey];
                row.insertCell().textContent = item['Current Price']; // Changed from item.currentPrice
                row.insertCell().textContent = item['Close'];
                row.insertCell().textContent = m20Price;       // This is correct
                row.insertCell().textContent = `${pricediff} (${pricediffpct}%)`;
                row.insertCell().textContent = oneDayPct;       // Add 1d %
                row.insertCell().textContent = sixtyThreeDayPct;       // Add 63d %
                row.insertCell().textContent = earningsOffsetClosest;
                row.insertCell().textContent = pulledAt;     // Changed from item.lastUpdated
            }
        });
}

function setActiveTicker(index) {
    currentTicker = tickerItems[index].textContent.trim()
    console.log(currentTicker)
    tickerItems[currentTickerIndex].classList.remove('active');
    tickerItems[index].classList.add('active');
    tickerItems[index].scrollIntoView({ inline: 'center', block: 'nearest' });
    // showImagesForTicker(tickerItems[index].textContent.trim());  // Update the images based on the active ticker
    plotGraph(tickerItems[index].textContent.trim())
    // turnCalendarIconWhite() // if a ticker was set active from the ticker tape, it will not be in rollback mode
    currentTickerIndex = index;
}
  
// document.querySelector('.closebtn').addEventListener('click', function() {
//     document.getElementById("sidebar").style.left = "-250px";
// });

// document.querySelector('.hamburger').addEventListener('click', function() {
//     var sidebar = document.getElementById('sidebar');
//     var graphDiv = document.getElementById('graphDiv2');
//     var graphDiv3 = document.getElementById('graphDiv3');
//     const hamburgerIcon = document.querySelector('.hamburger svg');    

//     document.getElementById("sidebar").style.left = "0";
//     // sidebar.style.left = sidebar.style.left === '0px' ? '-250px' : '0px';

// });

// document.addEventListener('click', function(event) {
//     var sidebar = document.getElementById('sidebar');
//     var clickInsideSidebar = sidebar.contains(event.target);
//     var hamburger = document.querySelector('.hamburger');
//     var clickInsideHamburger = hamburger.contains(event.target);

//     if (!clickInsideSidebar && !clickInsideHamburger) {
//         sidebar.style.left = "-250px";
//     }
// });

// Navigation

document.getElementById('timelineLink').addEventListener('click', function() {
    // Assuming you want to hide the sidebar when the link is clicked
    document.getElementById('sidebar').style.left = '-250px';

    var graphDiv1 = document.getElementById('graphDiv');
    graphDiv1.style.display = 'block';

    var graphDiv2 = document.getElementById('graphDiv2');
    graphDiv2.style.display = 'block';

    var graphDiv3 = document.getElementById('graphDiv3');
    graphDiv3.style.display = 'none';

    var graphDiv4 = document.getElementById('graphDiv4');
    graphDiv4.style.display = 'none';

    var graphDiv5 = document.getElementById('graphDiv5');
    graphDiv5.style.display = 'none';

    var datatable_summary = document.getElementById('data-table');
    datatable_summary.style.display = 'none';

    var datapipeline = document.getElementById('data-table-pipelines');
    datapipeline.style.display = 'none';

    var m20watchlistdiv = document.getElementById('m20watchlistdiv');
    m20watchlistdiv.style.display = 'none';

});

document.getElementById('timelineLink2').addEventListener('click', function() {
    // Assuming you want to hide the sidebar when the link is clicked
    document.getElementById('sidebar').style.left = '-250px';

    var graphDiv1 = document.getElementById('graphDiv');
    graphDiv1.style.display = 'none';

    var graphDiv2 = document.getElementById('graphDiv2');
    graphDiv2.style.display = 'block';

    var graphDiv3 = document.getElementById('graphDiv3');
    graphDiv3.style.display = 'none';

    var graphDiv4 = document.getElementById('graphDiv4');
    graphDiv4.style.display = 'none';

    var graphDiv5 = document.getElementById('graphDiv5');
    graphDiv5.style.display = 'block';

    var datatable_summary = document.getElementById('data-table');
    datatable_summary.style.display = 'none';

    var datapipeline = document.getElementById('data-table-pipelines');
    datapipeline.style.display = 'none';

    var m20watchlistdiv = document.getElementById('m20watchlistdiv');
    m20watchlistdiv.style.display = 'none';

});

document.getElementById('earningsOffsetLink').addEventListener('click', function() {
    // Assuming you want to hide the sidebar when the link is clicked
    document.getElementById('sidebar').style.left = '-250px';

    // var graphDiv1 = document.getElementById('graphDiv');
    // graphDiv1.style.display = 'none';

    var graphDiv1 = document.getElementById('graphDiv');
    graphDiv1.style.display = 'block';

    var graphDiv2 = document.getElementById('graphDiv2');
    graphDiv2.style.display = 'none';

    var graphDiv3 = document.getElementById('graphDiv3');
    graphDiv3.style.display = 'block';

    var graphDiv4 = document.getElementById('graphDiv4');
    graphDiv4.style.display = 'none';

    var graphDiv5 = document.getElementById('graphDiv5');
    graphDiv5.style.display = 'none';

    var datatable_summary = document.getElementById('data-table');
    datatable_summary.style.display = 'none';

    var datapipeline = document.getElementById('data-table-pipelines');
    datapipeline.style.display = 'none';

    var m20watchlistdiv = document.getElementById('m20watchlistdiv');
    m20watchlistdiv.style.display = 'none';

});

document.getElementById('m20Link').addEventListener('click', function() {
    // Assuming you want to hide the sidebar when the link is clicked
    document.getElementById('sidebar').style.left = '-250px';

    var graphDiv1 = document.getElementById('graphDiv');
    graphDiv1.style.display = 'none';

    var graphDiv2 = document.getElementById('graphDiv2');
    graphDiv2.style.display = 'block';

    var graphDiv3 = document.getElementById('graphDiv3');
    graphDiv3.style.display = 'none';

    var graphDiv4 = document.getElementById('graphDiv4');
    graphDiv4.style.display = 'block';

    var graphDiv5 = document.getElementById('graphDiv5');
    graphDiv5.style.display = 'none';

    var datatable_summary = document.getElementById('data-table');
    datatable_summary.style.display = 'none';

    var datapipeline = document.getElementById('data-table-pipelines');
    datapipeline.style.display = 'none';

    var m20watchlistdiv = document.getElementById('m20watchlistdiv');
    m20watchlistdiv.style.display = 'none';

});

// document.getElementById('summaryTableLink').addEventListener('click', function() {
//     // Assuming you want to hide the sidebar when the link is clicked
//     document.getElementById('sidebar').style.left = '-250px';

//     // populateTable()
//     // populateTable(tickers);

//     // Fetch tickers and then populate the table
//     // Fetch and populate table only if it's the first time
//     if (!isSummaryFetched) {
//         fetch('/api/tickers.json')
//             .then(response => response.json())
//             .then(tickers => {
//                 populateTable_array(tickers);
//                 isSummaryFetched = true; // Update the flag
//             })
//             .catch(error => console.error("Failed to load tickers:", error));
//     }

//     var graphDiv1 = document.getElementById('graphDiv');
//     graphDiv1.style.display = 'none';

//     var graphDiv2 = document.getElementById('graphDiv2');
//     graphDiv2.style.display = 'none';

//     var graphDiv3 = document.getElementById('graphDiv3');
//     graphDiv3.style.display = 'none';

//     var graphDiv4 = document.getElementById('graphDiv4');
//     graphDiv4.style.display = 'none';

//     var graphDiv5 = document.getElementById('graphDiv5');
//     graphDiv5.style.display = 'none';

//     var datatable_summary = document.getElementById('data-table');
//     datatable_summary.style.display = 'block';

//     var datapipeline = document.getElementById('data-table-pipelines');
//     datapipeline.style.display = 'none';

//     var m20watchlistdiv = document.getElementById('m20watchlistdiv');
//     m20watchlistdiv.style.display = 'none';

// });

document.getElementById('livem20').addEventListener('click', function() {

    // for live watchlist

    // Assuming you want to hide the sidebar when the link is clicked
    document.getElementById('sidebar').style.left = '-250px';

    var graphDiv1 = document.getElementById('graphDiv');
    graphDiv1.style.display = 'none';

    var graphDiv2 = document.getElementById('graphDiv2');
    graphDiv2.style.display = 'none';

    var graphDiv3 = document.getElementById('graphDiv3');
    graphDiv3.style.display = 'none';

    var graphDiv4 = document.getElementById('graphDiv4');
    graphDiv4.style.display = 'none';

    var graphDiv5 = document.getElementById('graphDiv5');
    graphDiv5.style.display = 'none';

    var datatable_summary = document.getElementById('data-table');
    datatable_summary.style.display = 'none';

    var datapipeline = document.getElementById('data-table-pipelines');
    datapipeline.style.display = 'none';

    var m20watchlistdiv = document.getElementById('m20watchlistdiv');
    m20watchlistdiv.style.display = 'block';

    fetchAndDisplayData();

});

document.getElementById('pipelines').addEventListener('click', function() {
    // Assuming you want to hide the sidebar when the link is clicked
    document.getElementById('sidebar').style.left = '-250px';

    var graphDiv1 = document.getElementById('graphDiv');
    graphDiv1.style.display = 'none';

    var graphDiv2 = document.getElementById('graphDiv2');
    graphDiv2.style.display = 'none';

    var graphDiv3 = document.getElementById('graphDiv3');
    graphDiv3.style.display = 'none';

    var graphDiv4 = document.getElementById('graphDiv4');
    graphDiv4.style.display = 'none';

    var graphDiv5 = document.getElementById('graphDiv5');
    graphDiv5.style.display = 'none';

    var datatable_summary = document.getElementById('data-table');
    datatable_summary.style.display = 'none';

    var datapipeline = document.getElementById('data-table-pipelines');
    datapipeline.style.display = 'block';

    var m20watchlistdiv = document.getElementById('m20watchlistdiv');
    m20watchlistdiv.style.display = 'none';

    updateTaskStatus()

});

function fetchAndDisplayData() {

    // I put default values into the html

    const minOverallRecordPct = parseFloat(document.getElementById('minOverallRecordPct').value) || 90;
    const minPriceDiffPct = parseFloat(document.getElementById('minPriceDiffPct').value) || -2;
    const maxPriceDiffPct = parseFloat(document.getElementById('maxPriceDiffPct').value) || 2;
    const minEarnings = parseFloat(document.getElementById('minearnings').value) || 2;
    const maxEarnings = parseFloat(document.getElementById('maxearnings').value) || 3;

    // Fetch the data from the server (assuming your Python server has endpoints set up)
    fetch('/get-m20-data')
    .then(response => response.json())
    .then(data => {

        console.log(data); // verified that json file contains all columns
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
            const oneDayPctVal = parseFloat(item['daily delta']); // Separate variable for numerical comparison
            const oneDayPct = item['daily delta'] ? (parseFloat(item['daily delta'])*100).toFixed(2) + '%' : 'N/A'; // Handle NaN or blank
            const earningsOffsetClosest = item['Earnings Offset Closest'] || 'N/A'; // Handle NaN or blank

            // Extract the percentage from the 'Overall Record' string
            // const overallRecordPctMatch = item['Overall Record'].match(/(\d+\.\d+)%/);
            // overallRecordPct = overallRecordPctMatch ? parseFloat(overallRecordPctMatch[1]) : null;

            const earningsValue = parseFloat(item['Earnings Offset Closest']);
            const earningsInRange = !isNaN(earningsValue) && earningsValue >= minEarnings && earningsValue <= maxEarnings;

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

                console.log("Adding row for:", item['Ticker'], item[overallRecordKey], pulledAt); // Debugging line

                row.insertCell().textContent = item['Ticker'];        // Changed from item.ticker
                row.insertCell().textContent = item[overallRecordKey];
                row.insertCell().textContent = item['Current Price']; // Changed from item.currentPrice
                row.insertCell().textContent = item['Close'];
                row.insertCell().textContent = m20Price;       // This is correct
                row.insertCell().textContent = `${pricediff} (${pricediffpct}%)`;
                row.insertCell().textContent = oneDayPct;       // Add 1d %
                row.insertCell().textContent = sixtyThreeDayPct;       // Add 63d %
                row.insertCell().textContent = earningsOffsetClosest;
                row.insertCell().textContent = pulledAt;     // Changed from item.lastUpdated
            }
        });
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Create Ticker Tape

fetch('/api/tickers.json')
.then(response => response.json())
.then(tickers => {
    tickerlist = tickers; // Save the tickers to the global variable
    const tickerTapeDiv = document.querySelector('.ticker-tape');
    tickers.forEach((ticker, index) => {
        
        const tickerSpan = document.createElement('span');
        tickerSpan.textContent = ticker;
        tickerSpan.classList.add('ticker-item');
        if (index === 0) {
            console.log('used to set first ticker as active')
            // tickerSpan.classList.add('active');  // Set the first ticker as active initially
        }
        tickerSpan.addEventListener('click', function() {
            // showImagesForTicker(ticker);
            plotGraph(ticker)

            const index = tickers.indexOf(ticker);
            setActiveTicker(index);

        });
        tickerTapeDiv.appendChild(tickerSpan);
    });

    // Set the initial active ticker and its behavior
    let currentTickerIndex = 0;
    // const tickerItems = document.querySelectorAll('.ticker-item');
    tickerItems = document.querySelectorAll('.ticker-item');
    
    // Listen for arrow keys
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowRight' && currentTickerIndex < tickerItems.length - 1) {
            setActiveTicker(currentTickerIndex + 1);
        } else if (event.key === 'ArrowLeft' && currentTickerIndex > 0) {
            setActiveTicker(currentTickerIndex - 1);
        }
    });

    // Initially load images for the first ticker
    // showImagesForTicker(tickers[0]);

    // plotGraph(tickers[0])

    // populateTable(tickers);
    // populateTable_array(tickers);
});

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

// document.querySelector('.calendar-icon').addEventListener('click', function() {

//     console.log('clicked calendar')

//     const overlay_rb = document.getElementById('rollback-overlay');
//     const searchBox_rb = document.getElementById('rollback-box');

//     accumulatedString = '';
//     searchBox_rb.value = '';

//     overlay_rb.style.display = 'flex'; // Display the overlay

//     isCalendarActive = true;
//     isSearchActive = false;

// });


// for clicking search icon
document.querySelector('.search-icon').addEventListener('click', function() {
    const overlay = document.getElementById('search-overlay');
    const searchBox = document.getElementById('search-box');
    
    // Reset the accumulated string and search box value
    accumulatedString = '';
    searchBox.value = '';

    overlay.style.display = 'flex'; // Display the overlay

    isSearchActive = true;
    isCalendarActive = false;

});

function turnCalendarIconPurple() {
    // Get the calendar icon div
    var calendarIcon = document.querySelector('.calendar-icon');

    // Get all SVG elements that have a stroke attribute
    var svgElements = calendarIcon.querySelectorAll('svg [stroke]');

    // Change the stroke color to purple
    svgElements.forEach(function(element) {
        element.setAttribute('stroke', '#7a76ff');
    });
}

function turnCalendarIconWhite() {
    // Get the calendar icon div
    var calendarIcon = document.querySelector('.calendar-icon');

    // Get all SVG elements that have a stroke attribute
    var svgElements = calendarIcon.querySelectorAll('svg [stroke]');

    // Change the stroke color to white
    svgElements.forEach(function(element) {
        element.setAttribute('stroke', 'white');
    });
}

// for typing anywhere to begin a search
let accumulatedString = '';
let resetTimer;

// document.getElementById('search-box').addEventListener('input', function(event) {
document.addEventListener('keydown', function(event) {
    if(event.repeat) return; // Ignore repeated key press

    if (isFilterModalOpen) {
        return;
    }

    const overlay = document.getElementById('search-overlay');
    const searchBox = document.getElementById('search-box');
    const searchBox_rb = document.getElementById('rollback-box'); // for calendar
    const overlay_rb = document.getElementById('rollback-overlay');

    // Clear the previous reset timer
    clearTimeout(resetTimer);

    if (isSearchActive) {

        searchBox.focus(); // Add this line when the overlay is displayed

        // Handle backspace key
        if (event.key === 'Backspace') {
            accumulatedString = accumulatedString.slice(0, -1); // Remove the last character
            searchBox.value = accumulatedString.toUpperCase(); // Display in uppercase
            return; // Exit the function here since we don't want to continue with the other logic
        }

        // If the current value is the placeholder text, reset the accumulated string
        if (searchBox.value === 'Enter ticker...') {
            accumulatedString = '';
        }

        if (event.key === 'Enter') {
            if (accumulatedString) {
                // Show images for the searched ticker
                // showImagesForTicker(accumulatedString);
                console.log(accumulatedString)
                accumulatedString = event.target.value;

                plotGraph(accumulatedString)
        
                // Highlight the ticker in the ticker tape
                const tickerItemsArray = Array.from(tickerItems);
                const index = tickerItemsArray.findIndex(item => item.textContent.trim() === accumulatedString.toUpperCase());
                
                if (index !== -1) {
                    setActiveTicker(index);
                }
        
                accumulatedString = '';
            }
            overlay.style.display = 'none'; // Hide the overlay
        } else if (event.key.length === 1) { // Check if a single character key was pressed (exclude special keys like Shift, Ctrl, etc.)
            overlay.style.display = 'flex'; // Display the overlay

            // Accumulate the typed characters
            // accumulatedString += event.key;
            console.log(accumulatedString)
            accumulatedString = event.target.value;
            console.log(accumulatedString)

            searchBox.value = accumulatedString.toUpperCase(); // Display the accumulated string in uppercase

            // Set a timer to reset the accumulated string and hide the overlay after 2 seconds of inactivity
            resetTimer = setTimeout(function() {
                accumulatedString = '';
                overlay.style.display = 'none';
            }, 2000); // 2 seconds
        }
        // isSearchActive = false;

    } else if (isCalendarActive) {

        // Handle backspace key
        if (event.key === 'Backspace') {
            accumulatedString = accumulatedString.slice(0, -1); // Remove the last character
            searchBox_rb.value = accumulatedString.toUpperCase(); // Display in uppercase
            return; // Exit the function here since we don't want to continue with the other logic
        }

        // If the current value is the placeholder text, reset the accumulated string
        if (searchBox_rb.value === 'Enter Rollback Date...') {
            accumulatedString = '';
        }

        if (event.key === 'Enter') {
            if (accumulatedString) {
                console.log('accumulatedString: ', accumulatedString);
        
                    // potential issue iwth keyup staying attached to this block instead of the 
                    // search..

                // Send the accumulatedString to the server
                fetch('/process-date', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        date: accumulatedString,
                        ticker: currentTicker
                     }),
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Response from server:', data);
                    // load new CSV file and replot
                    plotGraph_rollback(currentTicker)
                    turnCalendarIconPurple();

                })
                .catch(error => {
                    console.error('Error:', error);
                });
        
                accumulatedString = '';
            }
            overlay_rb.style.display = 'none'; // Hide the overlay
            isCalendarActive = false; // Disable Calendar doPOST until it is clicked again
            isSearchActive = true; // Enable Search

        } else if (event.key.length === 1) { // Check if a single character key was pressed (exclude special keys like Shift, Ctrl, etc.)
            overlay_rb.style.display = 'flex'; // Display the overlay

            // Accumulate the typed characters
            accumulatedString += event.key;
            searchBox_rb.value = accumulatedString.toUpperCase(); // Display the accumulated string in uppercase

            // Set a timer to reset the accumulated string and hide the overlay after 2 seconds of inactivity
            resetTimer = setTimeout(function() {
                accumulatedString = '';
                overlay_rb.style.display = 'none';
            }, 10000); // 2 seconds
        }
        // isCalendarActive = false;

    }

});

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

function plotGraph(ticker) {
    return new Promise((resolve, reject) => {
        loadDataForTicker(ticker).then(data => {

            config = {modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
            displaylogo: false}

            data = data.slice(63); // full data, ignores first 63 rows
            inplay_data = data.slice(-63); // in play data, last 63 rows
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
            Pwin =  (m20PassCount / (m20PassCount + m20FailCount) * 100).toFixed(2)
            recordValue = m20PassCount + " - " + m20FailCount + " (" + Pwin + "%)"
            document.getElementById('recordValue').textContent = recordValue;

            // > In-Play Team Record (last 63 rows)
            const m20PassCount_inplay = inplay_data.filter(row => row['m20 pass'] !== null && row['m20 pass'] !== "").length;
            const m20FailCount_inplay = inplay_data.filter(row => row['m20 fail'] !== null && row['m20 fail'] !== "").length;
            Pwin =  (m20PassCount_inplay / (m20PassCount_inplay + m20FailCount_inplay) * 100).toFixed(2)
            inPlayValue = m20PassCount_inplay + " - " + m20FailCount_inplay + " (" + Pwin + "%)"
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
                    color: '#7a76ff', // Dull purple color
                    width: 2
                },
                hoverinfo: 'text',
                name: '1d %'
            };

            const layout1d = {
                // responsive: true,
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: '1d % vs. Date',
                //     font: {
                //         color: '#868D98', // Setting title color
                //         size: 12
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444' // Darker grid lines
                },
                yaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98',
                    gridcolor: '#444'
                }
            };

            const trace1 = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['63d %'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>1d %: ${row['daily delta']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines', // Use lines instead of markers
                line: {
                    color: '#7a76ff', // Dull purple color
                    width: 2
                },
                hoverinfo: 'text',
                name: '63d %'
            };

            const trace2 = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['Close'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>1d %: ${row['daily delta']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines', // Use lines instead of markers
                line: {
                    color: '#7a76ff', // Dull purple color
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
                    color: '#6dd06f', // Choose a color that stands out
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
                    color: '#801618', // Choose a color that stands out
                    size: 10 // Adjust the size as needed
                },
                name: 'M20 Fail',
                hoverinfo: 'text' // Specify to use the text field for hover information
            };

            const layout = {
                // responsive: true,
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: '63d % vs. Date',
                //     font: {
                //         color: '#868D98', // Setting title color
                //         size: 12
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444' // Darker grid lines
                },
                yaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98',
                    gridcolor: '#444'
                },
                shapes: [
                    { // Horizontal line at -20%
                        type: 'line',
                        x0: 0,
                        y0: -0.20,
                        x1: 1,
                        y1: -0.20,
                        xref: 'paper',
                        line: {
                            color: 'red',
                            width: 2
                        }
                    }
                ]
            };

            const layout2 = {
                // responsive: true,
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: 'Close vs. Date',
                //     font: {
                //         color: '#868D98', // Setting title color
                //         size: 12
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444', // Darker grid lines
                    range: [trace2.x[0], trace2.x[trace2.x.length - 1]] // Set the range from the first to the last date in trace2
                },
                yaxis: {
                    title: { font: { size: 10 } },
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
                // responsive: true,
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: '63d % vs. Earnings Offset Closest',
                //     font: {
                //         color: '#868D98', // Setting title color
                //         size: 12
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)', // Dark background color
                plot_bgcolor: 'rgb(16 16 16 / 0%)', // Dark plot area color
                xaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444', // Darker grid lines
                    
                    // range: [trace2.x[0], trace2.x[trace2.x.length - 1]] // Set the range from the first to the last date in trace2
                },
                yaxis: {
                    title: { font: { size: 10 } },
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
                    let markerStyle = getMarkerStyle(index, totalRows, 'red', 'red');
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
                    let markerStyle = getMarkerStyle(index, data.length, 'yellow', 'yellow');
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
                    let markerStyle = getMarkerStyle(index, data.length, "green", "green");
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
            // Plotly.newPlot('graphDiv2', [trace2, traceM20Pass, traceM20Fail], layout2);
            Plotly.newPlot('graphDiv2', [trace2, traceVerticalLines, traceM20Pass, traceM20Fail], layout2, config); // Earnings
            Plotly.newPlot('graphDiv3', [zeroChances_debug, oneToFiveChances, sixOrMoreChances], layout3, config);
            Plotly.newPlot('graphDiv5', [trace1d], layout1d, config); // 1d % vs. Date

            console.log(zeroChances_debug)
            console.log(oneToFiveChances)
            console.log(sixOrMoreChances)
            
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
            //     //     color: '#7a76ff', // Choose a color for the bars
            //     // }
            //     marker: {
            //         color: data.map(row => (row['m20 pass'] === null || row['m20 pass'] === "" || row['m20 fail'] === null || row['m20 fail'] === "") ? '#808080' : '#7a76ff')
            //     }


            // };
            
            // const barChartTrace = {
            //     x: data.map(row => row['Date']),
            //     y: data.map(row => parseFloat(row['63'])),
            //     type: 'bar',
            //     marker: {
            //         color: data.map(row => (row['m20 pass'] !== null && row['m20 pass'] !== "" || row['m20 fail'] !== null && row['m20 fail'] !== "") ? '#7a76ff' : '#808080') // Color #7a76ff if not null/empty, grey otherwise
            //     }
            // };
            
            const barChartTrace = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['63'])),
                type: 'bar',
                marker: {
                    color: data.map(row => {
                        if (row['m20 fail'] !== null && row['m20 fail'] !== "") {
                            return 'red'; // Red color for non-null and non-empty 'm20 fail'
                        } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                            return '#7a76ff'; // Default color if 'm20 pass' is not null/empty
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
                            return 'red'; // Red color for non-null and non-empty 'm20 fail'
                        } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                            return '#7a76ff'; // Default color if 'm20 pass' is not null/empty
                        }
                        return '#808080'; // Grey for other cases
                    })
                },
                name: '63 day minimum delta'
            };

            const barChartLayout = {
                // responsive: true,
                margin: { l: 50, r: 25, b: 25, t: 25 },
                // title: {
                //     text: 'Maximum Delta Foward 63 Days',
                //     font: {
                //         color: '#868D98', // Setting title color
                //         size: 12
                //     }
                // },
                paper_bgcolor: 'rgb(16 16 16 / 0%)',
                plot_bgcolor: 'rgb(16 16 16 / 0%)',
                xaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98',
                    gridcolor: '#444',
                },
                yaxis: {
                    title: { font: { size: 10 } },
                    color: '#868D98',
                    gridcolor: '#444',
                },
                showlegend: false
            };

            Plotly.newPlot('graphDiv4', [barChartTrace, barChartTrace_min63], barChartLayout, config);

            // for summary table
            tickerDataSummary[ticker] = {
                recordValue: recordValue,
                displayValue: displayValue,
                latestEarningsOffset: latestEarningsOffset
            };
            resolve();

        }).catch(error => {
            reject(error);
        });
    });
}

function obtainsummary(ticker) {
    return new Promise((resolve, reject) => {
        loadDataForTicker(ticker).then(data => {

            data = data.slice(63); // first 63 rows are meaningless

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

            // > Latest Earnings Offset

            let latestEarningsOffset;
            if (data.length > 0 && 'Earnings Offset Closest' in data[data.length - 1]) {
                const lastRow = data[data.length - 1];
                latestEarningsOffset = lastRow['Earnings Offset Closest'];
            } else {
                latestEarningsOffset = 'NaN'; // or any other placeholder you prefer
            }

            // > Team Record
            const m20PassCount = data.filter(row => row['m20 pass'] !== null && row['m20 pass'] !== "").length;
            const m20FailCount = data.filter(row => row['m20 fail'] !== null && row['m20 fail'] !== "").length;
            Pwin =  (m20PassCount / (m20PassCount + m20FailCount) * 100).toFixed(2)
            recordValue = m20PassCount + " - " + m20FailCount + " (" + Pwin + "%)"

            // -------------------------

            // for summary table
            tickerDataSummary[ticker] = {
                recordValue: recordValue,
                displayValue: displayValue,
                latestEarningsOffset: latestEarningsOffset
            };
            initialTableData = { ...tickerDataSummary };
            resolve();

        }).catch(error => {
            reject(error);
        });
    });
}

function populateTable_array_wait_for_all(tickers) {

    // Create an array of promises
    const plotGraphPromises = tickers.map(ticker => obtainsummary(ticker));

    // Wait for all plotGraph functions to complete
    Promise.all(plotGraphPromises).then(() => {
        // Now that all data has been processed, populate the table
        const table = document.createElement('table');
        // ... rest of your table generation code ...

        document.getElementById('data-table').innerHTML = '';
        document.getElementById('data-table').appendChild(table);
    }).catch(error => {
        console.error("An error occurred while plotting graphs:", error);
    });
}

function resetFilter() {
    // Reset the table to its initial unfiltered state
    resetTable();
}

function showFilterOptions(columnIndex) {
    const filterModal = document.getElementById('filterModal');
    const applyButton = document.getElementById('applyFilterButton');
    const closeButton = document.getElementById('closeFilterButton');

    const column = columnNames[columnIndex]; // Assuming columnNames is globally accessible

    // Show the modal
    filterModal.style.display = 'block';
    isFilterModalOpen = true;

    const resetButton = document.getElementById('resetFilterButton');
    resetButton.onclick = function() {
        resetFilter();
        filterModal.style.display = 'none'; // Hide the modal
    };

    // Event listener for Apply Filter button
    applyButton.onclick = function() {
        const minValue = parseFloat(document.getElementById('minValue').value);
        const maxValue = parseFloat(document.getElementById('maxValue').value);
        applyFilter(column, { min: minValue, max: maxValue });
        filterModal.style.display = 'none'; // Hide modal after applying filter
        isFilterModalOpen = false;
    };

    // Event listener for Close button
    closeButton.onclick = function() {
        filterModal.style.display = 'none';
        isFilterModalOpen = false;
    };
}

function applyFilter(column, criteria) {
    const filteredData = Object.entries(tickerDataSummary).filter(([ticker, item]) => {
        if (column === 'Record') {
            const percentage = extractPercentage(item.recordValue);
            return criteria.min <= percentage && percentage <= criteria.max;
        }
        // Add conditions for other columns if necessary
        return true;
    }).reduce((acc, [ticker, item]) => ({ ...acc, [ticker]: item }), {});

    // Re-populate the table with filteredData using the new function
    populateTableFromData(Object.keys(filteredData));
}


function extractPercentage(recordString) {
    const percentageMatch = recordString.match(/\(([^)]+)\)/); // Matches anything in parentheses
    if (percentageMatch && percentageMatch[1]) {
        return parseFloat(percentageMatch[1]);
    }
    return null; // Handle non-matching cases
}

function populateTableFromData(filteredTickers) {
    // Clear existing table content except the headers
    const dataTable = document.getElementById('data-table');
    dataTable.innerHTML = ''; // Clear any existing content

    // Create the table structure
    const table = document.createElement('table');
    dataTable.appendChild(table);

    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Create header row if not already present
    if (thead.rows.length === 0) {
        const headerRow = thead.insertRow();
        columnNames.forEach((columnName, columnIndex) => {
            const th = document.createElement('th');
            th.textContent = columnName;
            headerRow.appendChild(th);

            // Add click event for sorting
            th.onclick = function() {
                sortTableByColumn(columnName);
            };

            // Add filter button only for the 'Record' column
            if (columnName === 'Record') {
                const filterButton = document.createElement('button');
                filterButton.textContent = 'Filter';
                filterButton.onclick = function(event) {
                    event.stopPropagation(); // Prevent sorting when clicking the filter button
                    showFilterOptions(columnIndex);
                };
                th.appendChild(filterButton);
            }
        });
    }

    // Process each ticker
    filteredTickers.forEach(ticker => {
        if (tickerDataSummary[ticker]) {
            const row = tbody.insertRow();
            const tickerData = tickerDataSummary[ticker];
            row.insertCell().textContent = ticker;
            row.insertCell().textContent = tickerData.recordValue;
            row.insertCell().textContent = tickerData.displayValue;
            row.insertCell().textContent = tickerData.latestEarningsOffset;
        }
    });
}



function populateTableFromData2(filteredTickers) {

    // Update current table data state
    currentTableData = filteredTickers.reduce((acc, ticker) => {
        if (tickerDataSummary[ticker]) {
            acc[ticker] = tickerDataSummary[ticker];
        }
        return acc;
    }, {});

    // Clear existing table content
    const dataTable = document.getElementById('data-table');
    dataTable.innerHTML = '';

    // Create the table structure
    const table = document.createElement('table');
    const thead = table.createTHead(); // Define thead here
    const tbody = table.createTBody();

    // Create header row
    const headerRow = thead.insertRow();
    columnNames.forEach((columnName, columnIndex) => {
        const th = document.createElement('th');
        th.textContent = columnName;
        headerRow.appendChild(th);

        // Add click event for sorting
        th.onclick = function() {
            sortTableByColumn(columnName);
        };

        // Add filter button only for the 'Record' column
        if (columnName === 'Record') {
            const filterButton = document.createElement('button');
            filterButton.textContent = 'Filter';
            filterButton.onclick = function(event) {
                event.stopPropagation(); // Prevent sorting when clicking the filter button
                showFilterOptions(columnIndex);
            };
            th.appendChild(filterButton);
        }
    });

    // Process each ticker
    filteredTickers.forEach(ticker => {
        // Add a row for this ticker's data
        const row = tbody.insertRow();
        const tickerData = tickerDataSummary[ticker];
        row.insertCell().textContent = ticker;
        row.insertCell().textContent = tickerData.recordValue;
        row.insertCell().textContent = tickerData.displayValue;
        row.insertCell().textContent = tickerData.latestEarningsOffset;
    });

    // Append the updated table to the DOM
    dataTable.appendChild(table);
}

function sortTableByColumn(columnName) {
    const sortedData = Object.entries(currentTableData).sort(([tickerA, dataA], [tickerB, dataB]) => {
        let valueA = columnName === 'Record' ? extractPercentage(dataA.recordValue) : dataA[columnName];
        let valueB = columnName === 'Record' ? extractPercentage(dataB.recordValue) : dataB[columnName];

        // Convert to numbers if they are numeric values
        valueA = !isNaN(parseFloat(valueA)) ? parseFloat(valueA) : valueA;
        valueB = !isNaN(parseFloat(valueB)) ? parseFloat(valueB) : valueB;

        if (sortDirection === 'ascending') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    // Toggle sort direction for the next click
    sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';

    // Update the table with sorted data
    populateTableFromData(sortedData.map(([ticker]) => ticker));
    populateTableFromData(Object.keys(sortedData));
}


function resetTable() {
    // Clear existing table content
    const dataTable = document.getElementById('data-table');
    dataTable.innerHTML = '';

    // Create the table structure
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Create header row
    const headerRow = thead.insertRow();
    columnNames.forEach((columnName, columnIndex) => {
        const th = document.createElement('th');
        th.textContent = columnName;
        headerRow.appendChild(th);

        // Add click event for sorting
        th.onclick = function() {
            sortTableByColumn(columnName);
        };

        // Add filter button only for the 'Record' column
        if (columnName === 'Record') {
            const filterButton = document.createElement('button');
            filterButton.textContent = 'Filter';
            filterButton.onclick = function(event) {
                event.stopPropagation(); // Prevent sorting when clicking the filter button
                showFilterOptions(columnIndex);
            };
            th.appendChild(filterButton);
        }
    });
    // Process and populate rows from initialTableData
    Object.entries(initialTableData).slice(0, 50).forEach(([ticker, tickerData]) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = ticker;
        row.insertCell().textContent = tickerData.recordValue;
        row.insertCell().textContent = tickerData.displayValue;
        row.insertCell().textContent = tickerData.latestEarningsOffset;
    });

    // Append the updated table to the DOM
    dataTable.appendChild(table);
}

function populateTable_array(tickers) {

    const subsetoftickers = tickers.slice(0, 50);

    
    // Clear existing table content
    const dataTable = document.getElementById('data-table');
    dataTable.innerHTML = '';

    // Create the table structure
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    // // Create header row
    // const headerRow = thead.insertRow();
    // ['Ticker', 'Record', 'Minimum M20', 'Latest Earnings Offset'].forEach(text => {
    //     const th = document.createElement('th');
    //     th.textContent = text;
    //     headerRow.appendChild(th);

    //     // Add filter button in each th elements
    //     const filterButton = document.createElement('button');
    //     filterButton.textContent = 'Filter';
    //     filterButton.onclick = function() {
    //         showFilterOptions(ticker, column); // Function to show filter options
    //     };
    //     th.appendChild(filterButton);
    //     // end of filter button

    // });

    // Create header row
    // const headerRow = thead.insertRow();
    // columnNames.forEach((columnName, columnIndex) => {
    //     const th = document.createElement('th');
    //     th.textContent = columnName;
    //     headerRow.appendChild(th);

    //     // Add filter button in each th element
    //     const filterButton = document.createElement('button');
    //     filterButton.textContent = 'Filter';
    //     filterButton.onclick = function() {
    //         showFilterOptions(columnIndex); // Pass the column index
    //     };
    //     th.appendChild(filterButton);
    // });

    // Create header row
    const headerRow = thead.insertRow();
    columnNames.forEach((columnName, columnIndex) => {
        const th = document.createElement('th');
        th.textContent = columnName;
        headerRow.appendChild(th);

        // Add click event for sorting
        th.onclick = function() {
            sortTableByColumn(columnName);
        };

        // Add filter button only for the 'Record' column
        if (columnName === 'Record') {
            const filterButton = document.createElement('button');
            filterButton.textContent = 'Filter';
            filterButton.onclick = function(event) {
                event.stopPropagation(); // Prevent sorting when clicking the filter button
                showFilterOptions(columnIndex);
            };
            th.appendChild(filterButton);
        }
    });


    // Process each ticker
    subsetoftickers.forEach(ticker => {
        obtainsummary(ticker).then(() => {
            // Add a row for this ticker's data
            const row = tbody.insertRow();
            const tickerData = tickerDataSummary[ticker]; // Assuming this is where the data is stored
            row.insertCell().textContent = ticker;
            row.insertCell().textContent = tickerData.recordValue;
            row.insertCell().textContent = tickerData.displayValue;
            row.insertCell().textContent = tickerData.latestEarningsOffset;

            // Append the updated table to the DOM
            dataTable.appendChild(table);
        }).catch(error => {
            console.error("Error obtaining summary for ticker", ticker, ":", error);
        });
    });
}


function populateTable_array_live(tickers) {

    const subsetoftickers = tickers.slice(0, 50);
    // define subsetoftickers by those that have signaled or are close to the signal

    // Clear existing table content
    const dataTable = document.getElementById('signals-data-table');
    dataTable.innerHTML = '';

    // Create the table structure
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Create header row
    const headerRow = thead.insertRow();
    columnNames.forEach((columnName, columnIndex) => {
        const th = document.createElement('th');
        th.textContent = columnName;
        headerRow.appendChild(th);

        // Add click event for sorting
        th.onclick = function() {
            sortTableByColumn(columnName);
        };

        // Add filter button only for the 'Record' column
        if (columnName === 'Record') {
            const filterButton = document.createElement('button');
            filterButton.textContent = 'Filter';
            filterButton.onclick = function(event) {
                event.stopPropagation(); // Prevent sorting when clicking the filter button
                showFilterOptions(columnIndex);
            };
            th.appendChild(filterButton);
        }
    });


    // Process each ticker
    subsetoftickers.forEach(ticker => {
        obtainsummary(ticker).then(() => {
            // Add a row for this ticker's data
            const row = tbody.insertRow();
            const tickerData = tickerDataSummary[ticker]; // Assuming this is where the data is stored
            row.insertCell().textContent = ticker;
            row.insertCell().textContent = tickerData.recordValue;
            row.insertCell().textContent = tickerData.displayValue;
            row.insertCell().textContent = tickerData.latestEarningsOffset;

            // Append the updated table to the DOM
            dataTable.appendChild(table);
        }).catch(error => {
            console.error("Error obtaining summary for ticker", ticker, ":", error);
        });
    });
}

function plotGraph_orig(ticker) {
    loadDataForTicker(ticker).then(data => {

        data = data.slice(63); // first 63 rows are meaningless
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

        // > Team Record
        const m20PassCount = data.filter(row => row['m20 pass'] !== null && row['m20 pass'] !== "").length;
        const m20FailCount = data.filter(row => row['m20 fail'] !== null && row['m20 fail'] !== "").length;
        Pwin =  (m20PassCount / (m20PassCount + m20FailCount) * 100).toFixed(2)

        recordValue = m20PassCount + " - " + m20FailCount + " (" + Pwin + "%)"

        document.getElementById('recordValue').textContent = recordValue;
        // document.getElementById('m20FailCount').textContent = m20FailCount;

        // -------------------------

        const trace1 = {
            x: data.map(row => row['Date']),
            y: data.map(row => parseFloat(row['63d %'])),
            text: data.map(row => {
                return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
            }),
            type: 'scatter',
            mode: 'lines', // Use lines instead of markers
            line: {
                color: '#7a76ff', // Dull purple color
                width: 2
            },
            hoverinfo: 'text',
            name: '63d %'
        };

        const trace2 = {
            x: data.map(row => row['Date']),
            y: data.map(row => parseFloat(row['Close'])),
            text: data.map(row => {
                return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
            }),
            type: 'scatter',
            mode: 'lines', // Use lines instead of markers
            line: {
                color: '#7a76ff', // Dull purple color
                width: 2
            },
            hoverinfo: 'text',
            name: 'Price'
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
                color: '#6dd06f', // Choose a color that stands out
                size: 10 // Adjust the size as needed
            },
            name: 'M20 Pass'
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
                color: '#801618', // Choose a color that stands out
                size: 10 // Adjust the size as needed
            },
            name: 'M20 Fail'
        };

        const layout = {
            title: {
                text: '63d % vs. Date',
                font: {
                    color: '#868D98' // Setting title color
                }
            },
            paper_bgcolor: '#101010', // Dark background color
            plot_bgcolor: '#101010', // Dark plot area color
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
                    y0: -0.20,
                    x1: 1,
                    y1: -0.20,
                    xref: 'paper',
                    line: {
                        color: 'red',
                        width: 2
                    }
                }
            ]
        };

        const layout2 = {
            title: {
                text: 'Close vs. Date',
                font: {
                    color: '#868D98' // Setting title color
                }
            },
            paper_bgcolor: '#101010', // Dark background color
            plot_bgcolor: '#101010', // Dark plot area color
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
            title: {
                text: '63d % vs. Earnings Offset Closest',
                font: {
                    color: '#868D98' // Setting title color
                }
            },
            paper_bgcolor: '#101010', // Dark background color
            plot_bgcolor: '#101010', // Dark plot area color
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
                let markerStyle = getMarkerStyle(index, totalRows, 'red', 'red');
                zeroChances_debug.marker.color.push(markerStyle.color);
                zeroChances_debug.marker.line.color.push(markerStyle.line.color);
                zeroChances_debug.marker.line.width.push(markerStyle.line.width);
                zeroChances_debug.marker.size.push(markerStyle.size);
        
                // Custom hover text for last 63 rows
                if (index >= totalRows - 63) {
                    let daysAgo = totalRows - index;
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
                let markerStyle = getMarkerStyle(index, data.length, 'yellow', 'yellow');
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
                let markerStyle = getMarkerStyle(index, data.length, "green", "green");
                sixOrMoreChances.marker.color.push(markerStyle.color);
                sixOrMoreChances.marker.line.color.push(markerStyle.line.color);
                sixOrMoreChances.marker.line.width.push(markerStyle.line.width);
                sixOrMoreChances.marker.size.push(markerStyle.size);
            }
        });

        // zeroChances_debug.hoverinfo = 'none';
        oneToFiveChances.hoverinfo = 'none';
        sixOrMoreChances.hoverinfo = 'none';

        Plotly.newPlot('graphDiv', [trace1], layout);
        Plotly.newPlot('graphDiv2', [trace2, traceM20Pass, traceM20Fail], layout2);
        Plotly.newPlot('graphDiv3', [zeroChances_debug, oneToFiveChances, sixOrMoreChances], layout3);
        
        console.log(zeroChances_debug)
        console.log(oneToFiveChances)
        console.log(sixOrMoreChances)
         
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
        //     //     color: '#7a76ff', // Choose a color for the bars
        //     // }
        //     marker: {
        //         color: data.map(row => (row['m20 pass'] === null || row['m20 pass'] === "" || row['m20 fail'] === null || row['m20 fail'] === "") ? '#808080' : '#7a76ff')
        //     }


        // };
        
        // const barChartTrace = {
        //     x: data.map(row => row['Date']),
        //     y: data.map(row => parseFloat(row['63'])),
        //     type: 'bar',
        //     marker: {
        //         color: data.map(row => (row['m20 pass'] !== null && row['m20 pass'] !== "" || row['m20 fail'] !== null && row['m20 fail'] !== "") ? '#7a76ff' : '#808080') // Color #7a76ff if not null/empty, grey otherwise
        //     }
        // };
        
        const barChartTrace = {
            x: data.map(row => row['Date']),
            y: data.map(row => parseFloat(row['63'])),
            type: 'bar',
            marker: {
                color: data.map(row => {
                    if (row['m20 fail'] !== null && row['m20 fail'] !== "") {
                        return 'red'; // Red color for non-null and non-empty 'm20 fail'
                    } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                        return '#7a76ff'; // Default color if 'm20 pass' is not null/empty
                    }
                    return '#808080'; // Grey for other cases
                })
            }
        };
        

        const barChartLayout = {
            title: {
                text: 'Maximum Delta Foward 63 Days',
                font: {
                    color: '#868D98' // Setting title color
                }
            },
            paper_bgcolor: '#101010',
            plot_bgcolor: '#101010',
            xaxis: {
                color: '#868D98',
                gridcolor: '#444',
            },
            yaxis: {
                color: '#868D98',
                gridcolor: '#444',
            }
        };

        Plotly.newPlot('graphDiv4', [barChartTrace], barChartLayout);

        // for summary table
        tickerDataSummary[ticker] = {
            recordValue: recordValue,
            displayValue: displayValue,
            latestEarningsOffset: latestEarningsOffset
        };

    });
}

function populateTable() {
    // NOT BEING USED
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Create header row
    const headerRow = thead.insertRow();
    ['Ticker', 'Record', 'Minimum M20', 'Latest Earnings Offset'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    // Populate table body
    for (const [ticker, data] of Object.entries(tickerDataSummary)) {
        const row = tbody.insertRow();
        row.insertCell().textContent = ticker;
        row.insertCell().textContent = data.recordValue;
        row.insertCell().textContent = data.displayValue;
        row.insertCell().textContent = data.latestEarningsOffset;
    }

    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container'); // Add a class for styling
    tableContainer.appendChild(table);

    // Append the table to your DOM (e.g., inside a div with id 'data-table')
    document.getElementById('data-table').innerHTML = '';
    document.getElementById('data-table').appendChild(tableContainer);
}


function loadDataForTicker_old(ticker) {
    return fetch(`/api/chartdata/${ticker}.csv`)
        .then(response => {
            console.log('Fetch response:', response);
            return response.text();
        })
        .then(csvText => {
            console.log('CSV Text:', csvText);
            return csvToJSON(csvText);
        })
        .catch(error => {
            console.error('Error loading data:', error);
        });
}

function loadDataForTicker(ticker) {
    // added parsing for Last-Modified http header
    return fetch(`/api/chartdata/${ticker}.csv`)
        .then(response => {
            console.log('Fetch response:', response);

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

function loadRollbackDataForTicker(ticker) {
    // added parsing for Last-Modified http header
    // return fetch(`rollback_chartdata/${ticker}.csv`)
    // return fetch(`rollback_chartdata/${ticker}.csv/_=${new Date().getTime()}`)
    return fetch(`rollback_chartdata/${ticker}.csv`)
        .then(response => {
            console.log('Fetch response:', response);

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

function plotGraph_rollback(ticker) {
    return new Promise((resolve, reject) => {
        loadRollbackDataForTicker(ticker).then(data => {

            data = data.slice(63); // full data, ignores first 63 rows
            inplay_data = data.slice(-63); // in play data, last 63 rows
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
            Pwin =  (m20PassCount / (m20PassCount + m20FailCount) * 100).toFixed(2)
            recordValue = m20PassCount + " - " + m20FailCount + " (" + Pwin + "%)"
            document.getElementById('recordValue').textContent = recordValue;

            // > In-Play Team Record (last 63 rows)
            const m20PassCount_inplay = inplay_data.filter(row => row['m20 pass'] !== null && row['m20 pass'] !== "").length;
            const m20FailCount_inplay = inplay_data.filter(row => row['m20 fail'] !== null && row['m20 fail'] !== "").length;
            Pwin =  (m20PassCount_inplay / (m20PassCount_inplay + m20FailCount_inplay) * 100).toFixed(2)
            inPlayValue = m20PassCount_inplay + " - " + m20FailCount_inplay + " (" + Pwin + "%)"
            document.getElementById('inPlayValue').textContent = inPlayValue;

            // document.getElementById('m20FailCount').textContent = m20FailCount;

            // > In Play Record

            // -------------------------

            // PLOT: 1d % vs. Date (daily delta)

            const trace1d = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['daily delta'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines', // Use lines instead of markers
                line: {
                    color: '#7a76ff', // Dull purple color
                    width: 2
                },
                hoverinfo: 'text',
                name: '1d %'
            };

            const layout1d = {
                title: {
                    text: '1d % vs. Date',
                    font: {
                        color: '#868D98' // Setting title color
                    }
                },
                paper_bgcolor: '#101010', // Dark background color
                plot_bgcolor: '#101010', // Dark plot area color
                xaxis: {
                    color: '#868D98', // White axis and text color
                    gridcolor: '#444' // Darker grid lines
                },
                yaxis: {
                    color: '#868D98',
                    gridcolor: '#444'
                }
            };

            const trace1 = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['63d %'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines', // Use lines instead of markers
                line: {
                    color: '#7a76ff', // Dull purple color
                    width: 2
                },
                hoverinfo: 'text',
                name: '63d %'
            };

            const trace2 = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['Close'])),
                text: data.map(row => {
                    return `Date: ${row['Date']}<br>63d %: ${row['63d %']}<br>Close: ${row['Close']}<br>Chances: ${row['chance']}<br>Earnings Offset Closest: ${row['Earnings Offset Closest']}`;
                }),
                type: 'scatter',
                mode: 'lines', // Use lines instead of markers
                line: {
                    color: '#7a76ff', // Dull purple color
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
                    color: '#6dd06f', // Choose a color that stands out
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
                    color: '#801618', // Choose a color that stands out
                    size: 10 // Adjust the size as needed
                },
                name: 'M20 Fail',
                hoverinfo: 'text' // Specify to use the text field for hover information
            };

            const layout = {
                title: {
                    text: '63d % vs. Date',
                    font: {
                        color: '#868D98' // Setting title color
                    }
                },
                paper_bgcolor: '#101010', // Dark background color
                plot_bgcolor: '#101010', // Dark plot area color
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
                        y0: -0.20,
                        x1: 1,
                        y1: -0.20,
                        xref: 'paper',
                        line: {
                            color: 'red',
                            width: 2
                        }
                    }
                ]
            };

            const layout2 = {
                title: {
                    text: 'Close vs. Date',
                    font: {
                        color: '#868D98' // Setting title color
                    }
                },
                paper_bgcolor: '#101010', // Dark background color
                plot_bgcolor: '#101010', // Dark plot area color
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
                title: {
                    text: '63d % vs. Earnings Offset Closest',
                    font: {
                        color: '#868D98' // Setting title color
                    }
                },
                paper_bgcolor: '#101010', // Dark background color
                plot_bgcolor: '#101010', // Dark plot area color
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
            
            console.log('Data before processing for zeroChances_debug:', data);


            data.forEach((row, index) => {

                // if (index < 63) {
                    // return; // Skip processing this row
                // }

                if (isM20NonEmpty(row) && parseInt(row['chance'], 10) === 0) {

                    console.log(`Index: ${index}, Earnings Offset Closest: ${row['Earnings Offset Closest']}`);

                    zeroChances_debug.x.push(row['Earnings Offset Closest']);
                    zeroChances_debug.y.push(parseFloat(row['63d %']));
                    let markerStyle = getMarkerStyle(index, totalRows, 'red', 'red');
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
                    let markerStyle = getMarkerStyle(index, data.length, 'yellow', 'yellow');
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
                    let markerStyle = getMarkerStyle(index, data.length, "green", "green");
                    sixOrMoreChances.marker.color.push(markerStyle.color);
                    sixOrMoreChances.marker.line.color.push(markerStyle.line.color);
                    sixOrMoreChances.marker.line.width.push(markerStyle.line.width);
                    sixOrMoreChances.marker.size.push(markerStyle.size);
                }
            });

            // zeroChances_debug.hoverinfo = 'none';
            oneToFiveChances.hoverinfo = 'none';
            sixOrMoreChances.hoverinfo = 'none';

            Plotly.newPlot('graphDiv', [trace1], layout);
            // Plotly.newPlot('graphDiv2', [trace2, traceM20Pass, traceM20Fail], layout2);
            Plotly.newPlot('graphDiv2', [trace2, traceVerticalLines, traceM20Pass, traceM20Fail], layout2); // Earnings
            Plotly.newPlot('graphDiv3', [zeroChances_debug, oneToFiveChances, sixOrMoreChances], layout3);
            Plotly.newPlot('graphDiv5', [trace1d], layout1d); // 1d % vs. Date

            console.log(zeroChances_debug)
            console.log(oneToFiveChances)
            console.log(sixOrMoreChances)
            
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
            //     //     color: '#7a76ff', // Choose a color for the bars
            //     // }
            //     marker: {
            //         color: data.map(row => (row['m20 pass'] === null || row['m20 pass'] === "" || row['m20 fail'] === null || row['m20 fail'] === "") ? '#808080' : '#7a76ff')
            //     }


            // };
            
            // const barChartTrace = {
            //     x: data.map(row => row['Date']),
            //     y: data.map(row => parseFloat(row['63'])),
            //     type: 'bar',
            //     marker: {
            //         color: data.map(row => (row['m20 pass'] !== null && row['m20 pass'] !== "" || row['m20 fail'] !== null && row['m20 fail'] !== "") ? '#7a76ff' : '#808080') // Color #7a76ff if not null/empty, grey otherwise
            //     }
            // };
            
            const barChartTrace = {
                x: data.map(row => row['Date']),
                y: data.map(row => parseFloat(row['63'])),
                type: 'bar',
                marker: {
                    color: data.map(row => {
                        if (row['m20 fail'] !== null && row['m20 fail'] !== "") {
                            return 'red'; // Red color for non-null and non-empty 'm20 fail'
                        } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                            return '#7a76ff'; // Default color if 'm20 pass' is not null/empty
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
                            return 'red'; // Red color for non-null and non-empty 'm20 fail'
                        } else if (row['m20 pass'] !== null && row['m20 pass'] !== "") {
                            return '#7a76ff'; // Default color if 'm20 pass' is not null/empty
                        }
                        return '#808080'; // Grey for other cases
                    })
                },
                name: '63 day minimum delta'
            };

            const barChartLayout = {
                title: {
                    text: 'Maximum Delta Foward 63 Days',
                    font: {
                        color: '#868D98' // Setting title color
                    }
                },
                paper_bgcolor: '#101010',
                plot_bgcolor: '#101010',
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

            Plotly.newPlot('graphDiv4', [barChartTrace, barChartTrace_min63], barChartLayout);

            // for summary table
            tickerDataSummary[ticker] = {
                recordValue: recordValue,
                displayValue: displayValue,
                latestEarningsOffset: latestEarningsOffset
            };
            resolve();

        }).catch(error => {
            reject(error);
            console.log('failed to load rollback data')
        });
    });
}

function updateTaskStatus_old() {
    fetch('/task-status')
    .then(response => response.json())
    .then(data => {
        const dataTable = document.getElementById('data-table-pipelines');
        dataTable.innerHTML = '<ul>' +
            `<li>Yahoo Data Download: Last Updated - ${data.yfi.last_updated}, Tickers - ${data.yfi.ticker_count}</li>` +
            `<li>Earnings Download: Last Updated - ${data.earnings.last_updated}, File Exists - ${data.earnings.file_exists}, File Count - ${data.earnings.file_count}</li>` +
            '</ul>';
    })
    .catch(error => console.error('Error fetching task status:', error));
}

function updateTaskStatus() {
    fetch('/task-status')
    .then(response => response.json())
    .then(data => {
        const dataTable = document.getElementById('data-table-pipelines');
        let htmlContent = '<div class="card-container">';

        if(data.yfi) {
            htmlContent += `<div class="card"><strong>Yahoo Data Download:</strong><br>Last Updated - ${data.yfi.last_updated}<br>Tickers - ${data.yfi.ticker_count}</div>`;
        }

        if(data.earnings) {
            htmlContent += `<div class="card"><strong>Earnings Download:</strong><br>Last Updated - ${data.earnings.last_updated}<br>File Count - ${data.earnings.file_count || 'N/A'}</div>`;
        }

        if(data.chartData) {
            htmlContent += `<div class="card"><strong>Chart Data:</strong><br>Last Updated - ${data.chartData.last_updated}<br>File Count - ${data.chartData.file_count}</div>`;
        }

        htmlContent += '</div>';
        dataTable.innerHTML = htmlContent;
    })
    .catch(error => console.error('Error fetching task status:', error));
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
    console.log('Number of lines:', lines.length); // Log the number of lines
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
    console.log('Final JSON:', result); // Log the final JSON
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
            } else if (tickerlist && tickerlist.length > 0) {
                clearInterval(checkTickerList);  // Stop polling

                console.log('updating page content for: ', path); // This will log 'aapl' if the URL is https://marketmeteor.org/aapl
                // Call a function to handle the path, like updating the page content
                var capitalizedPath = path.toUpperCase();

                console.log('indexing ', capitalizedPath, ' in tickerlist ...')

                console.log(tickerlist)

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
            console.log('Plotting graph for:', tickerlist[0]);
        }

    }, 100); // Check every 100 milliseconds
}

// Call this function on initial load and on window resize
window.onload = adjustGraphHeights;
window.onresize = adjustGraphHeights;

window.onload = handlePath;