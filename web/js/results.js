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

    fetch('/api/get-portfolio-simulations', {
    cache: 'no-cache', // or 'reload'
    })
    .then(response => response.json())
    .then(data => {

        const tableBody = document.getElementById('portsimsummary-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Clear existing rows

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.Start}</td>
                <td>${row['Total Return']}</td>
                <td>${row.Beta}</td>
                <td>${row.Alpha}</td>
                <td>${row['Standard Deviation']}</td>
                <td>${row['Sharpe Ratio']}</td>
                <td>${row['Information Ratio']}</td>
                <td>${row.average_risk_free_rate}</td>
                <td>${row.GSPC}</td>
                <td>${row.CD}</td>
                <td>${row.Sinkhole}</td>
                <td>${row['Buy Count']}</td>
            `;
            tableBody.appendChild(tr);
        });

    })
    .catch(error => console.error('Error fetching data:', error));
}