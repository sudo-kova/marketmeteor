# adapted live_1m_data.py for indicies.txt

from Farm import Farm 
# Farm = Farm() # Window and Linux paths to all things on the Farm!

import yfinance as yf
import pandas as pd
import os
import time
from Farm import Farm 

def fetch1m(underlying_symbol):
    stock = yf.Ticker(underlying_symbol)
    data = stock.history(period="1d", interval="1m")
    data.reset_index(inplace=True)
    data = data[['Datetime', 'Close']]
    data.rename(columns={'Close': underlying_symbol}, inplace=True)  # Rename 'Close' to the ticker symbol
    return data

if __name__ == "__main__":
    Farm = Farm()  # Initialize Farm
    validated_tickers_file = "../../data/tickerlists/indicies.txt"

    combined_df = None

    with open(validated_tickers_file, 'r') as f:
        tickers = f.read().splitlines()

    for ticker in tickers:
        start_time = time.time()
        data = fetch1m(ticker)

        if combined_df is None:
            combined_df = data
        else:
            combined_df = combined_df.merge(data, on='Datetime', how='outer')

        end_time = time.time()
        print(f"Fetching {ticker} took {end_time - start_time} seconds.")

    # Sort combined DataFrame by 'Datetime' and fill missing values
    combined_df.sort_values(by='Datetime', inplace=True)
    combined_df.fillna(method='ffill', inplace=True)  # Forward fill missing values

    # Save the combined DataFrame to a CSV
    combined_df.to_csv(os.path.join(Farm.one_minute_directory, 'combined_tickers.csv'), index=False)

    print("Combined time series saved.")
