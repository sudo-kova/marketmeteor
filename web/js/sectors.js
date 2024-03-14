export function loadSectorData() {
    // Check if data is already fetched and stored in cache
    if (getSectorDataCache()) {
        processSectorData();
    } else {
        fetch('/api/sectors-data')
            .then(response => response.json())
            .then(data => {
                // sectorDataCache = data; // Store data in cache
                setSectorDataCache(data)
                processSectorData();
            })
            .catch(error => {
                console.error('Error fetching sector data:', error);
                document.getElementById('sectormerrill').textContent = 'Error loading data';
            });
    }
}

export function processSectorData() {
    // Assuming 'currentTicker' is defined and accessible
    // const tickerData = sectorDataCache.find(row => row.Symbol === currentTicker);
    let tickerData = getSectorDataCache().find(row => row["\uFEFFSymbol"] === getCurrentTicker());
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