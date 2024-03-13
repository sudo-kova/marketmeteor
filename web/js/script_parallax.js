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

// auth0.createAuth0Client({
//     domain: "dev-ls0yufjhxj01r8uw.us.auth0.com",
//     clientId: "h3ExHdMvqjRSlEi16l35zKPlxtBxee5F",
//     authorizationParams: {
//       redirect_uri: window.location.origin
//     }
//   }).then(async (auth0Client) => {
//     // Assumes a button with id "login" in the DOM
//     const loginButton = document.getElementById("login");
  
//     loginButton.addEventListener("click", (e) => {
//       e.preventDefault();
//       auth0Client.loginWithRedirect();
//     });
  
//     if (location.search.includes("state=") && 
//         (location.search.includes("code=") || 
//         location.search.includes("error="))) {
//       await auth0Client.handleRedirectCallback();
//       window.history.replaceState({}, document.title, "/");
//     }
  
//     // Assumes a button with id "logout" in the DOM
//     const logoutButton = document.getElementById("logout");
  
//     logoutButton.addEventListener("click", (e) => {
//       e.preventDefault();
//       auth0Client.logout();
//     });
  
//     const isAuthenticated = await auth0Client.isAuthenticated();
//     const userProfile = await auth0Client.getUser();
  
//     // Assumes an element with id "profile" in the DOM
//     const profileElement = document.getElementById("profile");
  
//     if (isAuthenticated) {
//       profileElement.style.display = "block";

//       loginButton.style.display = "none";
//       logoutButton.style.display = "block";
//     //   profileElement.innerHTML = `
//     //           <p>${userProfile.name}</p>
//     //           <img src="${userProfile.picture}" />
//     //         `;
//     } else {
//       profileElement.style.display = "none";

//     }
//   });

function setActiveTicker(index) {
    currentTicker = tickerItems[index].textContent.trim()
    // console.log(currentTicker)
    tickerItems[currentTickerIndex].classList.remove('active');
    tickerItems[index].classList.add('active');
    tickerItems[index].scrollIntoView({ inline: 'center', block: 'nearest' });
    // showImagesForTicker(tickerItems[index].textContent.trim());  // Update the images based on the active ticker
    plotGraph(tickerItems[index].textContent.trim())
    turnCalendarIconWhite() // if a ticker was set active from the ticker tape, it will not be in rollback mode
    currentTickerIndex = index;

    processSectorData()
}

// Create Ticker Tape

fetch('/api/tickers.json', {
    cache: 'no-cache', // or 'reload'
})
.then(response => response.json())
.then(tickers => {
    tickerlist = tickers; // Save the tickers to the global variable
    const tickerTapeDiv = document.querySelector('.ticker-tape');
    tickers.forEach((ticker, index) => {
        
        const tickerSpan = document.createElement('span');
        tickerSpan.textContent = ticker;
        tickerSpan.classList.add('ticker-item');
        // if (index === 0) {
            // console.log('used to set first ticker as active')
            // tickerSpan.classList.add('active');  // Set the first ticker as active initially
        // }
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

document.querySelector('.calendar-icon').addEventListener('click', function() {

    console.log('clicked calendar')

    const overlay_rb = document.getElementById('rollback-overlay');
    const searchBox_rb = document.getElementById('rollback-box');

    accumulatedString = '';
    searchBox_rb.value = '';

    overlay_rb.style.display = 'flex'; // Display the overlay

    isCalendarActive = true;
    isSearchActive = false;

});

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

document.addEventListener('keydown', function(event) {

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
        // Handle backspace key
        if (event.key === 'Backspace') {
            accumulatedString = accumulatedString.slice(0, -1).toUpperCase(); // Remove the last character
            searchBox.value = accumulatedString; // Display in uppercase
            return; // Exit the function here since we don't want to continue with the other logic
        }

        // If the current value is the placeholder text, reset the accumulated string
        if (searchBox.value === '') {
            accumulatedString = '';
        }

        if (event.key === 'Enter') {
            if (accumulatedString) {
                // Show images for the searched ticker
                // showImagesForTicker(accumulatedString);
                plotGraph(accumulatedString.toUpperCase())
        
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
            accumulatedString += event.key;
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
                fetch('/api/process-date', {
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

function plotGraph_rollback(ticker) {
    return new Promise((resolve, reject) => {
        loadRollbackDataForTicker(ticker).then(data => {


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
// Event listener for window resize
window.addEventListener('resize', function() {
    resizePlotlyGraphs();
});

function fetchAndDisplayData() {

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

function createPortfolio_row() {
    // Get the table element
    const table = document.getElementById('port-table');

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
    table.appendChild(newRow);
}

// Function to validate the required cells
function validateTable() {
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


function savePortfolio(){

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

const updateDropdown = (watchlists) => {
    const dropdown = document.getElementById('optionsDropdown');
    dropdown.innerHTML = ''; // Clear existing options

    watchlists.forEach(watchlist => {
        const option = document.createElement('option');
        option.value = watchlist;
        option.text = watchlist;
        dropdown.appendChild(option);
    });
};

function editPortfolio() {
    // Get all the cells in the tbody of the port-table
    const cells = document.querySelectorAll('#port-table tbody td');

    // Toggle the edit mode
    cells.forEach(cell => {
        if (cell.isContentEditable) {
            // If already editable, make it non-editable
            cell.contentEditable = 'false';
            cell.classList.remove('editable-cell'); // Assuming 'editable-cell' is your class
        } else {
            // If not editable, make it editable
            cell.contentEditable = 'true';
            cell.classList.add('editable-cell'); // Add a class for styling
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

                    minute_data_shown = true;
            
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
        // holdingsDiv6.classList.remove('tab_button_active');
        // graphDiv5.classList.add('tab_button_active');

        graphDiv5.classList.add('showdiv');
        graphDiv5.classList.remove('hidediv');
        holdingsDiv6.classList.add('hidediv');
        holdingsDiv6.classList.remove('showdiv');
        // console.log("Showing Incoming Meteors");

        document.getElementById('refreshholdings').classList.add('button-disabled');
        document.getElementById('refresh m20').classList.remove('button-disabled');
        document.getElementById('applyfilter_m20').classList.remove('button-disabled');

        let holdingsSettingsMenu = document.querySelector('.holdingsettingsmenu');
        holdingsSettingsMenu.classList.add('button-disabled');

        let meteorssettingsmenu = document.querySelector('.meteorssettingsmenu');
        meteorssettingsmenu.classList.remove('button-disabled');

    });

    holdingsDiv6Button.addEventListener("click", function() {
        // graphDiv5.classList.remove('tab_button_active');
        // holdingsDiv6.classList.add('tab_button_active');

        holdingsDiv6.classList.add('showdiv');
        holdingsDiv6.classList.remove('hidediv');
        graphDiv5.classList.add('hidediv');
        graphDiv5.classList.remove('showdiv');
        // console.log("Showing Holdings");

        document.getElementById('refreshholdings').classList.remove('button-disabled');
        document.getElementById('refresh m20').classList.add('button-disabled');
        document.getElementById('applyfilter_m20').classList.add('button-disabled');

        let holdingsSettingsMenu = document.querySelector('.holdingsettingsmenu');
        holdingsSettingsMenu.classList.remove('button-disabled');

        let meteorssettingsmenu = document.querySelector('.meteorssettingsmenu');
        meteorssettingsmenu.classList.add('button-disabled');

    });
}

function setupWalkaround(){

    // WALKTHROUGH PROGRESSION

    // ---- [1] WELCOME SCREEN ---- dialog only
    document.getElementById('walkthroughLink').addEventListener('click', function() {
        var tutorialDiv = document.querySelector('.tutorial_div');
        tutorialDiv.classList.add('showwalkthrough');
        // CONTINUE once close_btn is pressed
        document.querySelector('.close_btn').addEventListener('click', function() {
            var tutorialDiv = document.querySelector('.tutorial_div');
            tutorialDiv.classList.remove('showwalkthrough');

            // ---- [2] TICKER TAPE ---- dialog and circle
            var tutorialDivTape = document.querySelector('.tutorial_div_ticker_tape');
            tutorialDivTape.classList.add('showwalkthrough');
            var element = document.getElementById("ticker_tape_circle");
            if (element) {
                element.classList.remove("hidediv");
            }
            // CONTINUE once close_btn_ticker_tape is pressed
            document.querySelector('.close_btn_tickertape').addEventListener('click', function() {
                var tutorialDivTape = document.querySelector('.tutorial_div_ticker_tape');
                tutorialDivTape.classList.remove('showwalkthrough');
                var element = document.getElementById("ticker_tape_circle");
                if (element) {
                    element.classList.add("hidediv");
                }
                // ---- [3] SUMMARY INFO ---- dialog and circle
                var tutorialDivSummary = document.querySelector('.tutorial_div_summary_info');
                tutorialDivSummary.classList.add('showwalkthrough');
                var element = document.getElementById("summary_circle");
                if (element) {
                    element.classList.remove("hidediv");
                }
                // CONTINUE once close_btn_summary_info is pressed
                document.querySelector('.close_btn_summary_info').addEventListener('click', function() {
                    var tutorialDivTape = document.querySelector('.tutorial_div_summary_info');
                    tutorialDivTape.classList.remove('showwalkthrough');
                    var element = document.getElementById("summary_circle");
                    if (element) {
                        element.classList.add("hidediv");
                    }
                    // ---- [4] DOUBLE CLICK TITLE BAR ---- dialog and circle
                    var tutorialDivSummary = document.querySelector('.tutorial_div_title_bar_dbl');
                    tutorialDivSummary.classList.add('showwalkthrough');
                    var element = document.getElementById("title_bar_dbl_circle");
                    if (element) {
                        element.classList.remove("hidediv");
                    }
                    // CONTINUE once close_btn_title_bar_dbl is pressed
                    document.querySelector('.close_btn_title_bar_dbl').addEventListener('click', function() {
                        var tutorialDivTape = document.querySelector('.tutorial_div_title_bar_dbl');
                        tutorialDivTape.classList.remove('showwalkthrough');
                        var element = document.getElementById("title_bar_dbl_circle");
                        if (element) {
                            element.classList.add("hidediv");
                        }
                        // ---- [5] CLOSE VS. DATE OVERVIEW ---- dialog
                        var tutorialDivSummary = document.querySelector('.tutorial_div_close_v_date');
                        tutorialDivSummary.classList.add('showwalkthrough');
                        // CONTINUE once close_btn_close_v_date is pressed
                        document.querySelector('.close_btn_close_v_date').addEventListener('click', function(){
                            var tutorialDivTape = document.querySelector('.tutorial_div_close_v_date');
                            tutorialDivTape.classList.remove('showwalkthrough');

                            simulateDoubleClick('#rd_closeseries');

                            // ---- [6] 63d% VS. DATE OVERVIEW ---- dialog
                            simulateDoubleClick('#rd_63d');
                            var tutorialDivSummary = document.querySelector('.tutorial_div_63d_v_date');
                            tutorialDivSummary.classList.add('showwalkthrough');
                            // CONTINUE once close_btn_63d_v_date is pressed
                            document.querySelector('.close_btn_63d_v_date').addEventListener('click', function() {
                                var tutorialDivTape = document.querySelector('.tutorial_div_63d_v_date');
                                tutorialDivTape.classList.remove('showwalkthrough');

                                simulateDoubleClick('#rd_63d');

                                // ---- [7] 63d% VS. Earnings offset closest ---- dialog
                                simulateDoubleClick('#rd_63dearnings');
                                var tutorialDivSummary = document.querySelector('.tutorial_div_63d_v_earnings');
                                tutorialDivSummary.classList.add('showwalkthrough');
                                // CONTINUE once close_btn_63d_v_earnings is pressed
                                document.querySelector('.close_btn_63d_v_earnings').addEventListener('click', function() {
                                    var tutorialDivTape = document.querySelector('.tutorial_div_63d_v_earnings');
                                    tutorialDivTape.classList.remove('showwalkthrough');

                                    simulateDoubleClick('#rd_63dearnings');

                                    // ---- [7] Maximum Delta Forward 63 Days Overview ---- dialog
                                    simulateDoubleClick('#rd_maxfwd');
                                    var tutorialDivSummary = document.querySelector('.tutorial_div_63d_v_fwd');
                                    tutorialDivSummary.classList.add('showwalkthrough');
                                    // CONTINUE once close_btn_63d_v_fwd is pressed
                                    document.querySelector('.close_btn_63d_v_fwd').addEventListener('click', function(){
                                        var tutorialDivTape = document.querySelector('.tutorial_div_63d_v_fwd');
                                        tutorialDivTape.classList.remove('showwalkthrough');

                                        simulateDoubleClick('#rd_maxfwd');

                                        // ---- [8] Watchlist Overview ---- dialog and circle
                                        simulateDoubleClick('#watchlist');
                                        var tutorialDivSummary = document.querySelector('.tutorial_div_watchlist_ovr');
                                        tutorialDivSummary.classList.add('showwalkthrough');
                                        var element = document.getElementById("watchlist_ovr_circle");
                                        if (element) {
                                            element.classList.remove("hidediv");
                                        }

                                        // CONTINUE once close_btn_watchlist_ovr is pressed
                                        document.querySelector('.close_btn_watchlist_ovr').addEventListener('click', function(){
                                            var tutorialDivTape = document.querySelector('.tutorial_div_watchlist_ovr');
                                            tutorialDivTape.classList.remove('showwalkthrough');
                                            var element = document.getElementById("watchlist_ovr_circle");
                                            if (element) {
                                                element.classList.add("hidediv");
                                            }
                                                
                                            // ---- [8] Watchlist Columns ---- dialog and circle
                                            var tutorialDivSummary = document.querySelector('.tutorial_div_watchlist_cols');
                                            tutorialDivSummary.classList.add('showwalkthrough');

                                            // CONTINUE once close_btn_watchlist_ovr is pressed
                                            document.querySelector('.close_btn_watchlist_cols').addEventListener('click', function(){
                                                var tutorialDivTape = document.querySelector('.tutorial_div_watchlist_cols');
                                                tutorialDivTape.classList.remove('showwalkthrough');

                                                // ---- [9] Holdings Columns ---- dialog
                                                var tutorialDivSummary = document.querySelector('.tutorial_div_holdings');
                                                tutorialDivSummary.classList.add('showwalkthrough');

                                                document.querySelector('.close_btn_holdings').addEventListener('click', function(){
                                                    var tutorialDivTape = document.querySelector('.tutorial_div_holdings');
                                                    tutorialDivTape.classList.remove('showwalkthrough');
                                                    simulateDoubleClick('#watchlist');
                                                });


                                                
                                            });

                                           

                                        });

                                        // ensure that the 5 grids are showing

                                        // const divIdsToShow = ['rd_closeseries', 'rd_63d', 'rd_63dearnings', 'watchlist', 'rd_maxfwd'];
                                        // divIdsToShow.forEach(divId => {
                                        //     const div = document.getElementById(divId);
                                        //     if (div) {
                                        //         div.classList.remove('hidediv');
                                        //         div.classList.add('showdiv');
                                        //     }
                                        // });


                                    });

                                });
                            });


                        });


                    });

                });


            });


        });
    });

}

function loadDataForTicker(ticker) {
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

function loadRollbackDataForTicker(ticker) {
    // added parsing for Last-Modified http header
    // return fetch(`rollback_chartdata/${ticker}.csv`)
    return fetch(`/api/rollback_chartdata/${ticker}.csv`, {
        cache: 'no-cache', // or 'reload'
        })
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

    fetchAndDisplayData();
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
    handlePath();

    setUpEventListeners();

    // fetchPortData();
    const dropdown = document.getElementById('optionsDropdown');

    dropdown.addEventListener('change', function() {
        fetchPortData();
    });

    setupTitlesInteraction();

    setupWalkaround();

    // resizePlotlyGraphs();

};

// window.onload = handlePath;

// window.onload = function() {
//     setTimeout(function() {
//         fetchAndDisplayData();
//     }, 3000); // 3000 milliseconds = 3 seconds
// };