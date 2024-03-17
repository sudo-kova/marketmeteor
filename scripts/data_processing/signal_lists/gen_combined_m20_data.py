"""
(previously get_m20_hist.py) 
    runtime: insignificant
    input: 
        chartdata/
    output: 
        combined_m20_data.csv, rows with m20 pass or m20 pass
"""

import pandas as pd
import numpy as np
from tqdm import tqdm
# from concurrent.futures import ThreadPoolExecutor, as_completed
from concurrent.futures import ProcessPoolExecutor
import pandas_market_calendars as mcal
import cProfile
import pandas as pd
import os
import platform

operating_system = platform.system()
print(operating_system)

if operating_system == "Windows":
    base_path = "X:\\Stockland"
    NRSUBPROCESSES = 10
else:
    base_path = "/media/share/Stockland"
    NRSUBPROCESSES = 16

# chartdata_path = r'X://Stockland//m20perf_L2016//charts//repo//m20//R06//chartdata2//'
# validated_tickers_file = os.path.join(base_path, 'raw_stock_data', 'tickerlists', 'tickerlist_validated.txt')
# validated_tickers_file = '../../../data/tickerlists/0301/tickerlist_validated.txt'
validated_tickers_file = '../../../data/tickerlists/tickerlist_validated.txt'
# daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data')
# m20_data_directory = os.path.join(base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata_forks')
# m20_data_directory = '../../../data/chartdata/historic/0301'
m20_data_directory = os.path.join(base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata2_filter6')
# output_file = '../../../data/signal_lists/combined_m20_data.csv'
output_file = '../../../data/signal_lists/combined_m252_data.csv'

def get_m20_history(ticker, csv_file):

    df = pd.read_csv(csv_file)

    # Filter rows where 'm20 pass' or 'm20 fail' columns have a value
    filtered_df = df[df['m20 pass'].notnull() | df['m20 fail'].notnull()].copy()
    filtered_df['Ticker'] = ticker

    return filtered_df


def process_ticker(args):
    ticker, csv_file, justticker = args 
    try:
        return get_m20_history(justticker, csv_file)
    except Exception as e:
        return pd.DataFrame()
    # return f"Processed {ticker} successfully"

def main():

    # with open('X:/Stockland/raw_stock_data/tickerlists/tickerlist_validated.txt', 'r') as f:
    #     validated_tickers = f.read().splitlines()
    # csv_files = [f'../../../../../raw_stock_data/daily_data/{file_name}.csv' for file_name in validated_tickers]

    with open(validated_tickers_file, 'r') as f:
        validated_tickers = f.read().splitlines()
    csv_files = [os.path.join(m20_data_directory, f'{file_name}.csv') for file_name in validated_tickers]

    # csv_files = csv_files[:20]

    all_dataframes = []
    with ProcessPoolExecutor(max_workers=NRSUBPROCESSES) as executor:
        futures = executor.map(process_ticker, zip(validated_tickers, csv_files, validated_tickers))
        for future in tqdm(futures, total=len(validated_tickers), desc="Processing tickers"):
            all_dataframes.append(future)

    combined_df = pd.concat(all_dataframes, ignore_index=True)
    combined_df.to_csv(output_file, index=False)

    # ---- SINGLE TICKER ----
    # single_ticker = 'NVDA' 
    # single_csv_file = os.path.join(m20_data_directory, f'{single_ticker}.csv')
    # result = process_ticker((single_ticker, single_csv_file, single_ticker))
    # print(result)
    # ----------------------

    # Using ProcessPoolExecutor to process tickers in parallel
    # with ProcessPoolExecutor(max_workers=10) as executor:  # Adjust max_workers as needed
        # futures = list(tqdm(executor.map(process_ticker, zip(validated_tickers, csv_files, validated_tickers)), total=len(validated_tickers), desc="Processing tickers"))

if __name__ == "__main__":
    # profiler = cProfile.Profile()
    # profiler.enable()

    main()

    # profiler.disable()

    # import pstats

    # # Save the stats to a file
    # with open("profile_output.txt", "w") as f:
    #     ps = pstats.Stats(profiler, stream=f)
    #     ps.sort_stats('cumulative').print_stats()

    # # Print a confirmation message
    # print("Profile saved to profile_output.txt")