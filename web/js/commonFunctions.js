// import { minute_data_shown } from './script_parallax.js';
// import { setMinuteDataShown, getMinuteDataShown } from './script_parallax.js';
// import { csvToJSON} from './file.js';
// import { loadSectorData, processSectorData } from './sectors.js';

export function isM20NonEmpty(row) {
    // Check if 'm20 pass' or 'm20 fail' is not an empty string
    let nonEmpty = row['m20 pass'] !== "" || row['m20 fail'] !== "";
    // console.log("row:", row);
    // console.log("isM20NonEmpty:", nonEmpty);
    return nonEmpty;
}

export function turnCalendarIconWhite() {
    // Get the calendar icon div
    var calendarIcon = document.querySelector('.calendar-icon');

    // Get all SVG elements that have a stroke attribute
    var svgElements = calendarIcon.querySelectorAll('svg [stroke]');

    // Change the stroke color to white
    svgElements.forEach(function(element) {
        element.setAttribute('stroke', 'white');
    });
}