export function create_heatmap(){

    fetch('/api/get-heatmap-data', {
        cache: 'no-cache', // or 'reload'
    })
    .then(response => response.json())
    .then(data => {


}