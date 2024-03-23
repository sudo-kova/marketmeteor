import yfinance as yf
import csv
import os
import sys
import platform

# Determine the operating system
operating_system = platform.system()

# Set base paths and files depending on the operating system
if operating_system == "Windows":
    base_path = "X:\\Stockland"
    validated_tickers_file = "../../data/tickerlists/tickerlist_validated.txt"
    base_path2 = "X:\\repositories"
    csv_filename = os.path.join(base_path2, 'marketmeteor', 'web_server', 'stock_prices.csv')
else:
    base_path = "/media/share/Stockland"
    validated_tickers_file = "../../data/tickerlists/tickerlist_validated.txt"
    csv_filename = "../../data/sectors/locations.csv"

# Adjust the number of subprocesses if needed
NRSUBPROCESSES = 1
if len(sys.argv) > 1 and int(sys.argv[1]) == 0:
    NRSUBPROCESSES = 12

# Read tickers from the file
with open(validated_tickers_file, 'r') as f:
    tickers = f.read().splitlines()

# Function to fetch data for a ticker
def fetch_data(ticker):
    try:
        info = yf.Ticker(ticker).info
        return [
            ticker,
            info.get('address1', ''),
            info.get('city', ''),
            info.get('state', ''),
            info.get('country', ''),
            info.get('website', ''),
            info.get('sector', ''),
            info.get('industry', ''),
            info.get('longBusinessSummary', '')
        ]
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return None

# Write data to CSV
with open(csv_filename, 'w', newline='') as file:
    writer = csv.writer(file)
    for ticker in tickers:
        data = fetch_data(ticker)
        if data:
            writer.writerow(data)

print("Data extraction completed.")
