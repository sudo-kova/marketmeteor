import yfinance as yf
import time
import csv
from datetime import datetime
import os
import platform
import threading
import pandas as pd
import sys

from Farm import Farm 

operating_system = platform.system()
Farm = Farm() # Window and Linux paths to all things on the Farm!

"""
Runs on the droplet
takes the template and stitches historic columns
"""

# Function to find the closest date in GSPC data after the buy date
def find_closest_date_gspc(buy_date, gspc_data):
    gspc_data_after_buy = gspc_data[gspc_data['Date'] >= buy_date]
    if not gspc_data_after_buy.empty:
        return gspc_data_after_buy.iloc[0]['Close']
    return None

def get_last_price(ticker):
    try:
        last_price = yf.Ticker(ticker).info['currentPrice']
        return last_price
    except KeyError:
        print(f"Data not found for ticker: {ticker}")
        return None
    except Exception as e:
        print(f"An error occurred for ticker: {ticker}. Error: {e}")
        return None

def main(account):   

    runtype = "not_live"

    """
    add values to columns: 1d%, 63d%, RTD, RTD (GSPC), Earnings
    """

    # Read the portfolio data and the GSPC data
    # portfolio_df = pd.read_csv(Farm.portfolio_template_csv)
    portfolio_df = pd.read_csv(os.path.join(Farm.web_server_port_folio_directory, f'{account}_template.csv'))

    GSPC_df = pd.read_csv(Farm.GSPC_data_csv_droplet)
    GSPC_last_close = GSPC_df.iloc[-1]['Close']
    GSPC_df['Date'] = pd.to_datetime(GSPC_df['Date'])

    # Iterate through the DataFrame rows
    for index, row in portfolio_df.iterrows():

        # files might either have the header "symbol" or "Ticker"
        try:
            # Try accessing the 'symbol' column
            ticker = row['symbol']
        except KeyError:
            # If 'symbol' column does not exist, try 'Ticker' column
            try:
                ticker = row['Ticker']
            except KeyError:
                # Handle the case where neither column exists
                print("Neither 'symbol' nor 'Ticker' columns are present.")
                continue  # Skip to the next iteration

        buy_price = row['Buy Price']
        buy_date_str = row['Buy Date']
        buy_date = datetime.strptime(buy_date_str, '%m/%d/%Y')
        
        # sell_date_str = row.get('Sell Date')
        # sell_price = row.get('Sell Price')

        sell_date_str = row['Sell Date'] if pd.notna(row['Sell Date']) else None
        sell_price = row['Sell Price'] if pd.notna(row['Sell Price']) else None

        # print(sell_date_str)
        # print(type(sell_date_str))

        ticker_csv_path = os.path.join(Farm.chart_data_directory_droplet, f"{ticker}.csv")
        
        # Check if the ticker CSV file exists
        if os.path.isfile(ticker_csv_path):
            # Read the last row of the ticker CSV
            ticker_df = pd.read_csv(ticker_csv_path)
            last_row = ticker_df.iloc[-1]
            last_close_price = last_row['Close']

            # Update the portfolio DataFrame with the values from the ticker CSV
            portfolio_df.at[index, '1d%'] = round(last_row['daily delta']*100,2)
            portfolio_df.at[index, '63d%'] = round(last_row['63d %']*100,2)

            if 'Earnings Offset Closest' in ticker_df.columns:
                portfolio_df.at[index, 'Earnings'] = last_row['Earnings Offset Closest']
            else:
                portfolio_df.at[index, 'Earnings'] = None  # or a default value

            # Calculate RTD
            final_price = sell_price if sell_price else last_row['Close']
            RTD = round(((final_price / buy_price) - 1)*100, 2)
            portfolio_df.at[index, 'RTD'] = RTD

        # even if ticker does't exist (eventually if it falls out of range there is no GSPC_last_close, but it should be sold by then)

        if sell_price:
            final_price = sell_price
            RTD = round(((final_price / buy_price) - 1)*100, 2)
            portfolio_df.at[index, 'RTD'] = RTD

        # Calculate RTD (GSPC)
        if sell_date_str:
            sell_date = datetime.strptime(sell_date_str, '%m/%d/%Y')
            GSPC_close_on_sell = find_closest_date_gspc(sell_date, GSPC_df)
            GSPC_close_on_buy = find_closest_date_gspc(buy_date, GSPC_df)
            if GSPC_close_on_sell is not None and GSPC_close_on_buy is not None:
                RTD_GSPC = round(((GSPC_close_on_sell / GSPC_close_on_buy) - 1)*100, 2)
                portfolio_df.at[index, 'RTD (GSPC)'] = RTD_GSPC
        else:
            GSPC_close_on_buy = find_closest_date_gspc(buy_date, GSPC_df)
            if GSPC_close_on_buy is not None:
                RTD_GSPC = round(((GSPC_last_close / GSPC_close_on_buy) - 1)*100, 2)
                portfolio_df.at[index, 'RTD (GSPC)'] = RTD_GSPC

    # portfolio_df.to_csv(Farm.portfolio_csv, index=False)
    portfolio_df.to_csv(os.path.join(Farm.web_server_port_folio_directory, f'{account}.csv'), index=False)
    
    print(portfolio_df)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        print("No account parameter provided.")
        # Handle the error or use a default account value