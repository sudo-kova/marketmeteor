import yfinance as yf
import os
import sys
import time

# adapted live_1m_data.py for indicies.txt

from Farm import Farm 
# Farm = Farm() # Window and Linux paths to all things on the Farm!

def fetch1m(underlying_symbol):
    stock = yf.Ticker(underlying_symbol)

    data = stock.history(period="1d", interval="1m")

    # Convert the DateTime index to a column and format it
    data.reset_index(inplace=True)
    # data['Datetime'] = data['Datetime'].dt.strftime('%m/%d/%Y')

    # Select only the 'Date' and 'Close' columns
    data = data[['Datetime', 'Close']]

    data.to_csv(os.path.join(Farm.one_minute_directory, f'{underlying_symbol}.csv'), index = False)

start_time = time.time()


if __name__ == "__main__":

    Farm = Farm()  # Initialize Farm

    validated_tickers_file = "../../data/tickerlists/indicies.txt"

    with open(validated_tickers_file, 'r') as f:
        tickers = f.read().splitlines()

    for ticker in tickers:

        # Start timing
        start_time = time.time()

        fetch1m(ticker)  # Call function with ticker

        # End timing
        end_time = time.time()
        execution_time = end_time - start_time

    print(f"The script took {execution_time} seconds to execute.")
