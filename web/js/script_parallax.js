// GET AND SET FUNCTIONS
let currentTicker;
export function setCurrentTicker(newTicker) {
    currentTicker = newTicker;
}
export function getCurrentTicker() {
    return currentTicker;
}

let currentTickerIndex;  //  // keep track of active ticker in ticker-tape
export function setCurrentTickerIndex(newIndex) {
    currentTickerIndex = newIndex;
}
export function getCurrentTickerIndex() {
    return currentTickerIndex;
}

export let sectorDataCache = null;  // Initially null or set to some default value
export function setSectorDataCache(newCache) {
    sectorDataCache = newCache;
}
export function getSectorDataCache() {
    return sectorDataCache;
}

let globalData = [];
export function setglobalData(data_input) {
    globalData = data_input;
}
export function getglobalData() {
    return globalData;
}

let globalData_gainers = [];
export function setglobalData_gainers(data_input) {
    globalData_gainers = data_input;
}
export function getglobalData_gainers() {
    return globalData_gainers;
}

let minuteDataShown = false;
export function getMinuteDataShown() {
    return minuteDataShown;
}
export function setMinuteDataShown(value) {
    minuteDataShown = value;
}

export let tickerItems;

let tickerlist;
let tickerDataSummary = {};
let initialTableData = {}; // save summary data once saved
let currentTableData = {}; // to maintaine state of currently filtered data
let isSummaryFetched = false;
let isFilterModalOpen = false;
const columnNames = ['Ticker', 'Record', 'Minimum M20', 'Latest Earnings Offset'];
let sortDirection = 'ascending'; // default direction of rows

// CREATE TICKER TAPE

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
    // currentTickerIndex = 0;
    setCurrentTickerIndex(0)

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

// IMPORT DEPENDENCIES

import { turnCalendarIconWhite } from './commonFunctions.js';
import { csvToJSON } from './file.js';
import { palette_purple, palette_red, palette_yellow, palette_green } from './colors.js';
import { plotGraph, plotGraph_rollback } from './plotting.js';
import { setActiveTicker } from './tickerFunctions.js';
import { fetchPortData } from './holdings.js';
import { applyFilter_m20data, fetchAndDisplayData } from './meteors.js';
import { setupTitlesInteraction, setupWalkaround } from './tutorial.js';
import { fetch_portfolio_simulations } from './results.js';
import { plot_indicies, fill_gainers_table, apply_filter_to_gainers_table} from './overview.js';
import { fill_spdr_table } from './overview_spdr.js'
import { create_heatmap } from './overview_heatmap.js'

// SETUP MAIN BUTTONS (CALENDAR AND SEARCH)

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

// SETUP FOR TYPE ANYWHERE SEARCH

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



// SETUP FOR PLOT RESIZE WHEN WINDOW CHANGES SIZE

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

// TOGGLE SETTINGS OF MARKETMETORS/HOLDINGS TABLE

function toggleHiddenTableMenu() {
    // toggle the 'hidediv' class
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


// SETUP EVENT LISTENERS FOR EACH OF THE FIVE GRIDS FOR FULL SCREEN
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

document.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('refresh_m20');
    if (refreshButton) {
        refreshButton.addEventListener('click', fetchAndDisplayData);
    }

    const applyFilterButton = document.getElementById('applyfilter_m20');
    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', applyFilter_m20data);
    }

    const refreshholdings = document.getElementById('refreshholdings');
    if (refreshholdings) {
        refreshholdings.addEventListener('click', fetchPortData);
    }

    // ---- Background image swap ----
    function changeBackgroundImage(imageName) {
        const overflowElement = document.querySelector('.overflow');
        const imageUrl = `url('../img/${imageName}.png')`;
        overflowElement.style.backgroundImage = `linear-gradient(360deg, #7a76ff7d 0%, #2a2b2e 50%, #414345 100%), ${imageUrl}`;
    }

    const gainers_applyfilter_m20 = document.getElementById('gainers_applyfilter_m20');
    if (gainers_applyfilter_m20) {
        gainers_applyfilter_m20.addEventListener('click', apply_filter_to_gainers_table);
    }

    // ---- FOR NAVIGATION ----

    const navLinks = document.querySelectorAll('.nav-link');
    const rowElements = document.querySelectorAll('.row');
    const footerElements = document.querySelectorAll('.footer');

    navLinks.forEach((link, index) => {
        link.addEventListener('click', function() {
            // Remove 'active' class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add 'active' class to the clicked link
            this.classList.add('active');

            // for Results add display: none to .row and .footer

            if (index === 0) { // First nav link clicked (Overview)
                // hide row and footer elements
                rowElements.forEach(el => el.style.display = 'none');
                footerElements.forEach(el => el.style.display = 'none');
                // show results-wrapper (display: flex)
            } else if (index === 1) { // First nav link clicked (SWING)
                rowElements.forEach(el => el.style.display = 'flex');
                footerElements.forEach(el => el.style.display = 'flex');
                // hide results-wrapper
            } else if (index === 2) { // Second nav link clicked (RESULTS)
                // hide row and footer elements
                rowElements.forEach(el => el.style.display = 'none');
                footerElements.forEach(el => el.style.display = 'none');
                // show results-wrapper (display: flex)
            }
        });
    });

    const navLink0 = document.getElementById('nav-link-overview');
    const navLink1 = document.getElementById('nav-link-swing');
    const navLink2 = document.getElementById('nav-link-results');
    const activateSearch = document.getElementById('nav-link-activate');
    const contentWrapper = document.querySelector('.results-wrapper');
    const overviewWrapper = document.querySelector('.overview-wrapper');

    navLink0.addEventListener('click', async () => {
        contentWrapper.style.display = 'none'; // Hide results-wrapper
        overviewWrapper.style.display = 'flex'; // show overview-wrapper
        changeBackgroundImage('wallstreet');

        // left sidebar first
        await create_heatmap();
        await fill_spdr_table();
        
        // main content
        plot_indicies();
        // fill_gainers_table();
    });

    navLink1.addEventListener('click', () => {
        contentWrapper.style.display = 'none'; // Hide results-wrapper
        overviewWrapper.style.display = 'none'; // Hide overview-wrapper
        changeBackgroundImage('lab');
    });

    navLink2.addEventListener('click', () => {
        contentWrapper.style.display = 'flex'; // Show results-wrapper
        overviewWrapper.style.display = 'none'; // Hide overview-wrapper
        fetch_portfolio_simulations();
        changeBackgroundImage('analyst');
        
    });

    activateSearch.addEventListener('click', () => {
        var searchInput = document.getElementById('search-input');
        var navLink = document.getElementById('nav-link-activate').querySelector('.nav-link');
    
        if (searchInput.style.display === 'none' || searchInput.style.display === '') {
            searchInput.style.display = 'flex';
            navLink.textContent = 'Close Search'; // change text to say "Close Search"
        } else {
            searchInput.style.display = 'none';
            navLink.textContent = 'Enter a Ticker'; // change text back to "Enter a Ticker"
        }
    });
    

    // ---- END of NAVIGATION ----

});
