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

        data.forEach(row => {
            let row = tableBody.insertRow();
            row.insertCell().textContent = item['Start'];
            row.insertCell().textContent = item['Total Return'];
            row.insertCell().textContent = item['Beta'];
            row.insertCell().textContent = item['Alpha'];
            row.insertCell().textContent = item['Standard Deviation'];
            row.insertCell().textContent = item['Sharpe Ratio'];
            row.insertCell().textContent = item['Information Ratio'];
            row.insertCell().textContent = item['average_risk_free_rate'];
            row.insertCell().textContent = item['GSPC'];
            row.insertCell().textContent = item['CD'];
            row.insertCell().textContent = item['Sinkhole'];
            row.insertCell().textContent = item['Buy Count'];
        });

    })
    .catch(error => console.error('Error fetching data:', error));
}