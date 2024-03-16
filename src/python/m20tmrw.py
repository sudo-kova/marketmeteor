"""
RUN THIS SCRIPT ON WINDOWS

GIT PUSH: X:\repositories\marketmeteor\web_server
"""


# calculate m20tmrw price
# for each ticker in tickers, open the tickername.csv located in daily_data_directory
# find the maximum price in the last 63 rows for the 'Close' column
# take 80% of the maximum price as save that as "m20tmrw"
# create a two column csv: Ticker, m20tmrw

# from chartdata2 folder, also extract values from last row of each ticker:
# Close, 63d %, daily delta, chance, Earnings Offset Closest

import yfinance as yf
import time
import csv
from datetime import datetime
import os
import platform
import threading
import pandas as pd
import math
import decimal
import numpy as np
import sys

operating_system = platform.system()

if operating_system == "Windows":
    base_path = "X:\\Stockland"
    NRSUBPROCESSES = 1
else:
    base_path = "/media/share/Stockland"
    NRSUBPROCESSES = 16

if int(sys.argv[1]) == 0:
    # validated_tickers_file = os.path.join(base_path, 'raw_stock_data', 'tickerlists', 'tickerlist_validated.txt')
    validated_tickers_file = "../../data/tickerlists/tickerlist_validated.txt"
else:
    # don't worry about this we won't call this
    validated_tickers_file = os.path.join(base_path, 'raw_stock_data', 'tickerlists', 'watchlist.txt')

daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data')
# chart_data_directory = os.path.join(base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata2')
chart_data_directory = os.path.join(base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata2_filter6')

print(f'tickers: {validated_tickers_file}')

class IndividualTicker:
    def custom_rounding(self, number):
        int_orig = int(number)
        onehund_frac = 100 * (number - int_orig)
        int_onehund = int(onehund_frac)
        onehund_frac2 = 100 * (onehund_frac - int_onehund)
        int_onehund_frac2 = self.cpp_round(onehund_frac2)

        if int_onehund_frac2 >= 50:
            int_onehund += 1

        new_value = int_orig + int_onehund / 100.0

        return new_value

    def cpp_round(self, number):
        if number >= 0.0:
            return math.floor(number + 0.5)
        else:
            return math.ceil(number - 0.5)
        
    def custom_rounding_c(self, timeseries):
    # uses vectorized NumPy, which is essentially C/C++
        # start_time = time.time()
        int_orig = np.floor(timeseries).astype(int)
        onehund_frac = 100 * (timeseries - int_orig)
        int_onehund = np.floor(onehund_frac).astype(int)
        onehund_frac2 = 100 * (onehund_frac - int_onehund)
        int_onehund_frac2 = np.where(onehund_frac2 >= 0.0, np.floor(onehund_frac2 + 0.5), np.ceil(onehund_frac2 - 0.5)).astype(int)

        int_onehund[int_onehund_frac2 >= 50] += 1
        new_values = int_orig + int_onehund / 100.0

        # end_time = time.time()
        # print(f"Time: {end_time - start_time} seconds")

        return new_values

    def excel_like_round_v4(self, series):
        """
        Custom rounding function to match Excel's rounding behavior, applied to a pandas Series.

        :param series: Pandas Series containing float values to be rounded.
        :return: Pandas Series with values rounded according to Excel's rounding rules.
        """
        def round_individual_value(value):
            value_decimal = decimal.Decimal(str(value))
            return float(value_decimal.quantize(decimal.Decimal('0.0001'), rounding=decimal.ROUND_HALF_UP))

        return series.apply(round_individual_value)


    def get_additional_details(self, ticker, chart_data_directory):
        """
        Fetch additional details from the chart_data_directory for the given ticker.

        :param ticker: The ticker symbol.
        :param chart_data_directory: The directory containing chart data CSVs.
        :return: A dictionary containing the additional details.
        """
        try:
            file_path = os.path.join(chart_data_directory, f"{ticker}.csv")
            datafull = pd.read_csv(file_path)
            datafull = datafull.iloc[63:] # remove first 63 rows
            data = datafull.tail(1)  # Read only the last row

            previous_daily_delta = datafull.iloc[-2]['daily delta'] if len(datafull) >= 2 else None

            peak_63d = datafull['Close'].tail(63).max()

            m20_pass_count = datafull['m20 pass'].apply(lambda x: isinstance(x, float) and not pd.isna(x)).sum()
            m20_fail_count = datafull['m20 fail'].apply(lambda x: isinstance(x, float) and not pd.isna(x)).sum()

            if m20_pass_count + m20_fail_count > 0:
                p_win = (m20_pass_count / (m20_pass_count + m20_fail_count)) * 100
                record_value = f"{m20_pass_count} - {m20_fail_count} ({p_win:.2f}%)"
            else:
                record_value = "N/A"

            return {
                'Close': data['Close'].values[0],
                '63d %': data['63d %'].values[0],
                'daily delta': data['daily delta'].values[0],
                'previous daily delta': previous_daily_delta,
                '63d peak': peak_63d,
                'chance': data['chance'].values[0],
                'Earnings Offset Closest': data['Earnings Offset Closest'].values[0],
                'Overall Record': record_value,
                'average_duration': data['average_duration'].values[0],
                'total_days_below_threshold': data['total_days_below_threshold'].values[0],
            }
        except Exception as e:
            print(f"Failed to get additional details for {ticker}: {e}")
            return None


tickerclass = IndividualTicker()

def calculate_overall_record(data):
    m20_pass_count = sum(1 for row in data if row.get('m20 pass') not in [None, ""])
    m20_fail_count = sum(1 for row in data if row.get('m20 fail') not in [None, ""])
    
    if m20_pass_count + m20_fail_count > 0:
        p_win = (m20_pass_count / (m20_pass_count + m20_fail_count)) * 100
        record_value = f"{m20_pass_count} - {m20_fail_count} ({p_win:.2f}%)"
    else:
        record_value = "N/A"
    
    return record_value

# Function to calculate m20tmrw for a single ticker
def calculate_m20tmrw(ticker, daily_data_directory, chart_data_directory, results):
    try:
        # Construct the file path for the ticker's daily data CSV
        daily_file_path = os.path.join(daily_data_directory, f"{ticker}.csv")
        
        # Read the last 63 rows of the 'Close' column for daily data
        daily_data = pd.read_csv(daily_file_path)
        daily_data['Close'] = tickerclass.excel_like_round_v4(daily_data['Close'].astype(float))
        last_63_closes = daily_data['Close'].tail(63)
        
        # Find the maximum closing price and calculate m20tmrw
        max_close = last_63_closes.max()
        m20tmrw = 0.8 * max_close
        
        # Initialize the results dictionary for this ticker
        results[ticker] = {'m20tmrw': m20tmrw}
        
        # Fetch additional details from the chart data directory
        additional_details = tickerclass.get_additional_details(ticker, chart_data_directory)
        
        # Update the results dictionary with the additional details
        if additional_details:
            results[ticker].update(additional_details)
        else:
            # In case additional details couldn't be fetched, populate with None
            for col in ['Close', '63d %', 'daily delta', 'previous daily delta', '63d peak', 'chance', 'Earnings Offset Closest', 'average_duration', 'total_days_below_threshold']:
                results[ticker][col] = None

        # Assume additional_details is a list of dictionaries, each representing a day's data for the ticker
        # record_value = calculate_overall_record(additional_details)
        # Add 'Overall Record' to results
        # results[ticker]['Overall Record'] = record_value

    except Exception as e:
        print(f"Failed to calculate m20tmrw for {ticker}: {e}")
        # Populate all fields with None in case of any failure
        results[ticker] = {
            'm20tmrw': None,
            'Close': None,
            '63d %': None,
            'daily delta': None,
            'previous daily delta': None,
            '63d peak': None,
            'chance': None,
            'Earnings Offset Closest': None,
            'average_duration': None,
            'total_days_below_threshold': None
        }

        results[ticker]['Overall Record'] = "N/A"


# Function to calculate m20tmrw for all tickers using threading
def calculate_all_m20tmrw(tickers, daily_data_directory, chart_data_directory):
    threads = []
    results = {}
    for ticker in tickers:
        # Include the chart_data_directory and results in the thread arguments
        thread = threading.Thread(target=calculate_m20tmrw, args=(ticker, daily_data_directory, chart_data_directory, results))
        thread.start()
        threads.append(thread)

    for thread in threads:
        thread.join()

    return results


# Load tickers from file
with open(validated_tickers_file, 'r') as f:
    tickers = f.read().splitlines()

# Calculate m20tmrw for all tickers
m20tmrw_results = calculate_all_m20tmrw(tickers, daily_data_directory, chart_data_directory)


# Write results to CSV
# tld_base_path = "X:\\repositories"
csv_filename = "../../data/marketmeteors/m20tmrw_prices.csv"
# csv_filename = 'm20tmrw_prices.csv'

with open(csv_filename, mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(["Ticker", "m20tmrw", "Close", "63d %", "daily delta", "previous daily delta", "63d peak", "chance", "Earnings Offset Closest", "Overall Record", "average_duration", "total_days_below_threshold"])

    for ticker, details in m20tmrw_results.items():
        writer.writerow([
            ticker,
            details.get('m20tmrw'),
            details.get('Close'),
            details.get('63d %'),
            details.get('daily delta'),
            details.get('previous daily delta'),
            details.get('63d peak'),
            details.get('chance'),
            details.get('Earnings Offset Closest'),
            details.get('Overall Record'),  # Add 'Overall Record' to the output
            details.get('average_duration'),
            details.get('total_days_below_threshold')
        ])