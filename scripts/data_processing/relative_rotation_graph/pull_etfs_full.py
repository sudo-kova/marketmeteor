import yfinance as yf

# Define the tickers
tickers = [
    "XLC", "XLY", "XLP", "XLE", "XLF", "XLV",
    "XLI", "XLB", "XLRE", "XLK", "XLU", "SPY"
]

# Loop through the tickers, download the data, and save to CSV
for ticker in tickers:
    # Download the data
    data = yf.download(ticker)
    
    # Save to CSV
    data.to_csv(f"{ticker}.csv")