import yfinance as yf
import time
import csv
from datetime import datetime
import os
import platform
import threading
import sys

# adapted from live_data_single.py for sector spdr funds (spdr.txt)

operating_system = platform.system()

if operating_system == "Windows":
    # running on droplet only so this code is not used in this case
    base_path = "X:\\Stockland"
    NRSUBPROCESSES = 10

    validated_tickers_file = os.path.join(base_path, 'raw_stock_data', 'tickerlists', 'tickerlist_validated.txt')
    # csv_filename = os.path.join(base_path, 'live', 'stock_prices.csv')

    base_path2 = "X:\\repositories"
    csv_filename = os.path.join(base_path2, 'marketmeteor', 'web_server', 'stock_prices.csv')
else:
    base_path = "/media/share/Stockland"
    
    if int(sys.argv[1]) == 0:
        NRSUBPROCESSES = 6
        # full list
        validated_tickers_file = "../../data/tickerlists/tickerlist_validated.txt"
    else:
        # command line argument 1

        NRSUBPROCESSES = 1
        # when the site runs live, it reads from here because the full list is too much to update live
        validated_tickers_file = "../../data/tickerlists/spdr.txt"
        
    csv_filename = "../../data/marketmeteors/spdr_prices.csv"

# watchlist.txt

with open(validated_tickers_file, 'r') as f:
    tickers = f.read().splitlines()
# tickers = ['AAPL', 'GOOGL', 'MSFT']
# tickers = tickers[:30]
print(tickers)

# 7 seconds delay

def get_last_price(ticker, prices):
    try:
        timestamp = datetime.now().strftime("%H:%M:%S")
        last_price = yf.Ticker(ticker).info['currentPrice']
        prices[ticker] = (last_price, timestamp)
    except Exception as e:
        pass
        # print(f"Failed to get data for {ticker}: {e}")

# pull prices for all tickers
def pull_prices(tickers):
    threads = []
    prices = {}
    for ticker in tickers:
        thread = threading.Thread(target=get_last_price, args=(ticker, prices))
        thread.start()
        threads.append(thread)

    for thread in threads:
        thread.join()

    return prices

# CSV file setup


# csv_filename = 'stock_prices.csv'
with open(csv_filename, mode='w', newline='') as file:
    writer = csv.writer(file)
    # Write the header
    writer.writerow(["Ticker", "Current Price", "Pulled At"])

# pull prices every 30 seconds for 15 minutes
start_time = time.time()
end_time = start_time + 30*60  # 15 minutes

prices = pull_prices(tickers)

with open(csv_filename, mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(["Ticker", "Current Price", "Pulled At"])  # Write the header each time
    for ticker, (price, timestamp) in prices.items():
        writer.writerow([ticker, price, timestamp])  # Write stock, current price, and the timestamp of the pull
print(time.time())