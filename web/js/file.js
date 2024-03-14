export function csvToJSON(csv) {
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