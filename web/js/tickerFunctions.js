export function setActiveTicker(index) {

    // assumes that it is called when all dependencies are avaialble in scope of script_parallax.js

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