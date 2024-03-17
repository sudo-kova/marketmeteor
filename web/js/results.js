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
            rowData.forEach(cellData => {
                let cell = row.insertCell();
                cell.textContent = cellData;
            });
        }

    })
    .catch(error => console.error('Error fetching data:', error));
}