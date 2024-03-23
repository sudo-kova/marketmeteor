export function fill_spdr_table(){

    fetch('/api/get-spdr-data', {
        cache: 'no-cache', // or 'reload'
    })
    .then(response => response.json())
    .then(data => {

        const tableBody = document.getElementById('spdr-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Clear existing rows

        // Skip the first element as it is the header
        data.slice(1).forEach(item => {
            const row = tableBody.insertRow(); // Insert a row in the table

            const ticker = item[0];
            const currentPrice = parseFloat(item[1]).toFixed(2) || 'N/A';
            const closePrice = parseFloat(item[2]).toFixed(2) || 'N/A';
            const pulledAt = item[3].trim(); // Trim the new line character

            const live_1d = (item[1] && item[2]) ? 
                (((currentPrice - closePrice) / closePrice) * 100).toFixed(2) + '%' : 
                'N/A';

            row.insertCell().textContent = ticker;  
            row.insertCell().textContent = currentPrice;
            row.insertCell().textContent = live_1d; 
            row.insertCell().textContent = closePrice;
            row.insertCell().textContent = pulledAt;   
        });

        // Once data is fetched, apply the flash animation
        const tbodyElement = document.querySelector('#spdr-table tbody');
        tbodyElement.classList.add('flash');
    
        // Remove the class after the animation is complete to reset the state
        setTimeout(() => {
            tbodyElement.classList.remove('flash');
        }, 1000); // Should match the duration of the animation

    })
    .catch(error => console.error('Error fetching data:', error));
}