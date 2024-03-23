function updateNYClock() {
    var nyTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    var formattedTime = new Date(nyTime).toLocaleTimeString();
    document.getElementById('nyClock').innerHTML = formattedTime;
}

setInterval(updateNYClock, 1000);  // Update the clock every second
