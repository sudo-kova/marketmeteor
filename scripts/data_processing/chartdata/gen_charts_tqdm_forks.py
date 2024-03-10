"""    
runtime: 9.5 min
    input:
        !> FOLLOWING INPUTS CHANGE DAILY
        validated_tickers_file = os.path.join(base_path, 'raw_stock_data', 'tickerlists', 'tickerlist_validated.txt')
        daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data')
        earnings_directory = os.path.join(base_path, 'earnings', 'splice')
        earnings_file = os.path.join(base_path, 'earnings', 'earnings_parsed_full.csv')
    output: 
        files in chartdata_forks/
"""

import pandas as pd
import numpy as np
from tqdm import tqdm
# from concurrent.futures import ThreadPoolExecutor, as_completed
from concurrent.futures import ProcessPoolExecutor
import pandas_market_calendars as mcal
import cProfile
import math
import decimal

import os
import platform
import traceback

# determine the operating system
operating_system = platform.system()

if operating_system == "Windows":
    base_path = "X:\\Stockland"
    NRSUBPROCESSES = 10
else:
    base_path = "/media/share/Stockland"
    NRSUBPROCESSES = 16

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


# validated_tickers_file = os.path.join(base_path, 'raw_stock_data', 'tickerlists', '0301', 'tickerlist_validated.txt')
validated_tickers_file = '../../../data/tickerlists/0301/tickerlist_validated.txt'

daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data_03_01')

# output_directory = os.path.join('..', 'chartdata2')  # Relative path
# output_directory = os.path.join(base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata_forks') # absolute path
output_directory = '../../../data/chartdata/historic/0301'

earnings_directory = os.path.join(base_path, 'earnings', 'splice_03_01')
earnings_file = os.path.join(base_path, 'earnings', '0301', 'earnings_parsed_full.csv')

# output_directory = '..\\chartdata'
# earnings_directory = 'X:\\Stockland\\earnings\\splice'
# earnings_file = 'X:\\Stockland\\earnings\\earnings_parsed_full.csv'

# file_path = os.path.join(base_path, "your_subdirectory", "your_file.txt")


# get earnings data
# earnings_df = pd.read_csv(earnings_file)
# earnings_df['Earning Date'] = pd.to_datetime(earnings_df['Earning Date'], format='mixed')

# get trading calendar for earnings offset calculation
nyse_calendar = mcal.get_calendar('NYSE')
trading_days = nyse_calendar.schedule(start_date='2015-01-01', end_date='2024-12-31')
trading_days_list = trading_days.index.date.tolist()
trading_days_list2 = trading_days.index.to_pydatetime().tolist()

# Convert trading_days_list to a pandas DatetimeIndex for efficient lookup
trading_days_index = pd.DatetimeIndex(trading_days_list)

def calculate_trading_days_offset_original(start_date, end_date, trading_days_list):
    """
    Calculate the number of trading days between two dates, given a list of trading days.
    
    Parameters:
    start_date (datetime): The start date to calculate from.
    end_date (datetime): The end date to calculate to.
    trading_days_list (list): A list of trading days as datetime objects.
    
    Returns:
    int: The number of trading days between the start and end dates.
    """
    # Filter the trading days within the start and end dates
    if start_date > end_date:
        # If the start date is after the end date, we swap them to get the offset correctly
        start_date, end_date = end_date, start_date
    trading_days = [day for day in trading_days_list if start_date <= day <= end_date]
    # Return the number of trading days
    return len(trading_days)

from bisect import bisect_left, bisect_right

def calculate_trading_days_offset(start_date, end_date, trading_days_list):
    """
    Calculate the number of trading days between two dates, given a sorted list of trading days.
    
    Parameters:
    start_date (datetime): The start date to calculate from.
    end_date (datetime): The end date to calculate to.
    trading_days_list (list): A sorted list of trading days as datetime objects.
    
    Returns:
    int: The number of trading days between the start and end dates.
    """
    if start_date > end_date:
        start_date, end_date = end_date, start_date

    # Find the positions of start_date and end_date in trading_days_list using binary search
    start_index = bisect_left(trading_days_list, start_date)
    end_index = bisect_right(trading_days_list, end_date)

    # Calculate the number of trading days
    return max(0, end_index - start_index)


def calculate_trading_days_offset_vectorized(dates, earnings_dates, trading_days_index):
    # Convert dates to numpy arrays for broadcasting
    dates_np = np.array(dates.to_list())
    earnings_dates_np = np.array(earnings_dates.to_list())

    # Broadcasting to create a matrix of differences
    date_diffs_matrix = dates_np[:, None] - earnings_dates_np

    # Vectorize the trading day calculation
    # Assuming calculate_trading_days_offset_vectorized_helper is correctly implemented
    # The helper function should accept scalar values and return the trading day offset
    trading_day_diffs = np.vectorize(calculate_trading_days_offset_vectorized_helper)(date_diffs_matrix, trading_days_index)

    return trading_day_diffs

def calculate_trading_days_offset_vectorized_helper(date_diff, trading_days_index):
    """
    Calculate the number of trading days between two dates.
    
    Parameters:
    date_diff (np.timedelta64): The difference between two dates.
    trading_days_index (np.array): An array of trading days.

    Returns:
    int: The number of trading days between the two dates.
    """
    # Convert date_diff to a pandas Timedelta if it's not already
    if not isinstance(date_diff, pd.Timedelta):
        date_diff = pd.Timedelta(date_diff)

    # Calculate the end date from the start date and date_diff
    start_date = pd.Timestamp('today')  # or any other reference date
    end_date = start_date + date_diff

    # Ensure start_date is always the earlier date
    if start_date > end_date:
        start_date, end_date = end_date, start_date

    # Filter trading days within the start and end dates
    trading_days_within_range = trading_days_index[(trading_days_index >= start_date) & (trading_days_index <= end_date)]

    # Return the number of trading days
    return len(trading_days_within_range)

def calculate_earnings_offset(df, ticker):
    # Read the earnings data
    
    df['Date'] = pd.to_datetime(df['Date'])

    # Initialize the 'Earnings Offset' column
    # df['Earnings Offset'] = 0

    # ticker_earnings = earnings_df[earnings_df['Ticker'] == ticker]
    # ticker_earnings = pd.read_csv(earnings_directory + f'\\{ticker}.csv')
    ticker_earnings = pd.read_csv(os.path.join(earnings_directory, f'{ticker}.csv'))

    ticker_earnings['Earning Date'] = pd.to_datetime(ticker_earnings['Earning Date'], format='mixed')

    # df['Earnings Offset Closest'] = np.nan
    df['Closest Date'] = pd.NaT

    for index, row in df.iterrows():

        # Calculate the difference in trading days for all earnings dates
        trading_day_diffs = ticker_earnings['Earning Date'].apply(
            lambda x: calculate_trading_days_offset(row['Date'], x, trading_days_index))

        # In your main function
        # trading_day_diffs_matrix = calculate_trading_days_offset_vectorized(df['Date'], ticker_earnings['Earning Date'], trading_days_index)

        # Determine if the earnings date is before or after and adjust the sign accordingly
        trading_day_diffs = trading_day_diffs * np.where(
            ticker_earnings['Earning Date'] > row['Date'], -1, 1)

        # Find the closest earnings date based on trading days
        closest_date_diff = trading_day_diffs.abs().idxmin()
        closest_date = ticker_earnings.loc[closest_date_diff, 'Earning Date']
        # offset_closest = trading_day_diffs.loc[closest_date_diff] # original, incorrect
        # offset_closest = calculate_trading_days_offset(row['Date'], closest_date, trading_days_list) # new, even worse
        # offset_closest = calculate_trading_days_offset2(row['Date'], closest_date, trading_days_list) # 2

        # Assign the closest date and its offset to the DataFrame
        # df.at[index, 'Earnings Offset Closest'] = offset_closest
        df.at[index, 'Closest Date'] = closest_date

    return df

def calculate_trading_days(date1, date2, trading_days):
    """
    Calculate the number of trading days between two dates.
    """

    # no sign convention but works

    # if date1 > date2:
    #     # If date1 is after date2, swap them
    #     date1, date2 = date2, date1
    
    # # Count the number of trading days between the two dates
    # trading_days_count = sum(date1 <= d <= date2 for d in trading_days)

    # return trading_days_count - 1  # Subtract 1 to exclude the start date

    if date1 > date2:
        # If date1 is after date2, calculate as usual and return a negative value
        trading_days_count = sum(date2 <= d <= date1 for d in trading_days)
        return trading_days_count - 1
    else:
        # If date1 is before date2, calculate as usual and return a positive value
        trading_days_count = sum(date1 <= d <= date2 for d in trading_days)
        return -(trading_days_count - 1)

def calculate_trading_days_vectorized(date1_series, date2_series, trading_days_np):
    """
    Vectorized function to calculate the number of trading days between two dates.

    Parameters:
    date1_series (pd.Series): Series of start dates.
    date2_series (pd.Series): Series of end dates.
    trading_days_np (np.array): Numpy array of trading days.

    Returns:
    pd.Series: Series of the number of trading days between date1_series and date2_series.
    """
    start_indices = np.searchsorted(trading_days_np, date1_series, side='left')
    end_indices = np.searchsorted(trading_days_np, date2_series, side='right')

    trading_days_counts = end_indices - start_indices
    # return trading_days_counts - 1  # Subtract 1 to exclude the start date
    return -(trading_days_counts - 1) # reverse sign convention

def earnings_offset_correct(data, trading_days_list):
    """
    Vectorized calculation of earnings offset.

    Parameters:
    data (pd.DataFrame): Data with 'Date' and 'Closest Date' columns.
    trading_days_list (list): List of trading days.

    Returns:
    pd.DataFrame: Updated data with 'Earnings Offset Closest' column.
    """
    # Convert trading_days_list to numpy array for efficient lookups
    trading_days_np = np.array(trading_days_list)

    # Convert dates to pandas datetime if not already
    data['Date'] = pd.to_datetime(data['Date'])
    data['Closest Date'] = pd.to_datetime(data['Closest Date'])

    # Calculate earnings offset for all rows
    data['Earnings Offset Closest'] = calculate_trading_days_vectorized(data['Date'], data['Closest Date'], trading_days_np)

    return data


def earnings_offset_correct_old(data):

    # data['Date'] = pd.to_datetime(data['Date']) # might already be in this format
    # data['Closest Date'] = pd.to_datetime(data['Closest Date'])
    
    data['Earnings Offset Closest'] = data.apply(lambda row: calculate_trading_days(row['Date'], row['Closest Date'], trading_days_list2), axis=1)

    return data

# ---- MAIN RUN FUNCTION ----

# Creates data needed to make charts

def max63d(file_path, justticker):

    df = pd.read_csv(file_path)

    # Truncate the dataframe to the last 2016 rows if it has more than 2016 rows
    if len(df) > 2016:
        df = df.tail(2016).reset_index(drop=True)

    ticker = IndividualTicker()
    # df['Close'] = ticker.custom_rounding_c(df['Close'].astype(float))
    df['Close'] = ticker.excel_like_round_v4(df['Close'].astype(float))

    # Calculate the maximum percentage change after 63 days for each row
    # This is a vectorized approach that should be much faster than row-wise apply
    rolling_max = df['Close'].rolling(window=63, min_periods=1).max().shift(1)
    df['63d %'] = (df['Close'] / rolling_max) - 1 
    # causes rounding error, .1999999 instead of 0.2

    # Calculate the 63-day delta
    # The rolling_max now uses shift(-63) instead of shift(1). 
    # This change looks 63 days ahead (not including the current day) to find the maximum closing price in that period.
    # rolling_max = df['Close'].rolling(window=63, min_periods=1).max().shift(-63)
    # df['63'] = rolling_max / df['Close'] - 1
    vectorized = True

    if (vectorized):
        # (vectorized)

        # Assuming df is your existing DataFrame with the 'Close' column

        # Create a DataFrame for forward-looking rolling windows
        shifted_df = pd.DataFrame(index=df.index)

        # Populate the DataFrame with shifted 'Close' values
        for i in range(1, 64):  # 63 days forward
            shifted_df[f'shift_{i}'] = df['Close'].shift(-i)

        # Calculate the rolling maximum across each row
        rolling_max = shifted_df.max(axis=1)

        # Calculate the '63' values
        df['63'] = (rolling_max / df['Close']) - 1

        # Fill NaN values with 0.0 if necessary
        df['63'] = df['63'].fillna(0.0)
    else:
        # Calculate the 63-day MAXIMUM delta with a dynamic window
        for i in range(len(df)):
            remaining_rows = len(df) - i - 1
            window_size = min(63, remaining_rows)
            if window_size > 0:
                rolling_max_future = df['Close'][i+1:i+1+window_size].max()
                df.at[i, '63'] = (rolling_max_future / df.at[i, 'Close']) - 1
            else:
                df.at[i, '63'] = 0.0 # np.nan

    # Initialize column for the new plan
    df['closest_above'] = -1000000  # default value

    # Iterate through the DataFrame
    for current_index in range(len(df)):
        target_value = df.at[current_index, 'Close'] / 0.8
        # Find the closest row above the current one where 'Close' is >= target value
        above_indices = df.index[df['Close'] >= target_value]
        above_indices = above_indices[above_indices < current_index]
        if not above_indices.empty:
            closest_index = above_indices.max()
            df.at[current_index, 'closest_above'] = -(current_index - closest_index)
        else:
            df.at[current_index, 'closest_above'] = -1000000

    # Calculate the 63-day MINIMUM delta with a dynamic window
    for i in range(len(df)):
        remaining_rows = len(df) - i - 1
        window_size = min(63, remaining_rows)
        if window_size > 0:
            rolling_max_future = df['Close'][i+1:i+1+window_size].min()
            df.at[i, '63min'] = (rolling_max_future / df.at[i, 'Close']) - 1
        else:
            df.at[i, '63min'] = 0.0 # np.nan

    # Calculate the daily delta
    df['daily delta'] = df['Close'] / df['Close'].shift(1) - 1
    df['prev daily delta'] = df['daily delta'].shift(1)

    # Adding a new column 'm20 pass' based on the specified conditions
    # df['m20 pass'] = df.apply(
    #     lambda row: row['Close'] if (row['63d %'] <= -0.20 and 
    #                                 row['daily delta'] < 0 and 
    #                                 df['daily delta'].shift(1).loc[row.name] < 0 and 
    #                                 row['63'] >= 0.05) else np.nan,
    #     axis=1
    # )

    condition = (
        (df['63d %'] <= -0.20) & 
        (df['daily delta'] < 0) & 
        (df['daily delta'].shift(1) < 0) & 
        (df['63'] >= 0.05)
    )
    df['m20 pass'] = np.where(condition, df['Close'], np.nan)


    df['m20 fail'] = df.apply(
        lambda row: row['Close'] if (row['63d %'] <= -0.20 and 
                                    row['daily delta'] < 0 and 
                                    df['daily delta'].shift(1).loc[row.name] < 0 and 
                                    row['63'] < 0.05) else np.nan,
        axis=1
    )

    # ---- Calculating 'chance' ----
    chance_values = []
    for i in range(len(df)):
        # Define the end index for the 63-day window, ensuring it does not exceed the DataFrame's length
        end_index = min(i + 64, len(df))

        # Select the next 62 days' worth of 'Close' prices (or fewer if near the end of the DataFrame)
        next_close_prices = df['Close'][i+1:end_index]

        # Count how many of these prices are at least 5% higher than the current day's 'Close' price
        count_higher_prices = (next_close_prices >= df.at[i, 'Close'] * 1.05).sum()

        # Append this count to the list
        chance_values.append(count_higher_prices)

    # Assign the 'chance' column to the DataFrame
    df['chance'] = chance_values

    # ---- sell price and sell date ----
    sell_prices = []
    sell_dates = []

    for i in range(len(df)):
        # Define the end index for the window, allowing it to go to the end of the DataFrame
        end_index = len(df)

        # Select the 'Close' prices starting from the next day up to the end of the DataFrame
        next_close_prices = df['Close'][i+1:end_index]

        # Find the index of the first 'Close' price that is at least 5% higher than the current day's 'Close' price
        first_higher_index = next_close_prices[next_close_prices >= df.at[i, 'Close'] * 1.05].first_valid_index()

        # If such an index is found, append the corresponding 'Close' price and date to the lists
        if first_higher_index is not None:
            sell_price = df.at[first_higher_index, 'Close']
            sell_date = df.at[first_higher_index, 'Date']  # Assuming the index of df is the date
            sell_prices.append(sell_price)
            sell_dates.append(sell_date)
        else:
            # If no such index is found, append NaN for both price and date
            sell_prices.append(np.nan)
            sell_dates.append(np.nan)

    # Assign the 'sell price' and 'sell date' columns to the DataFrame
    df['sell price'] = sell_prices
    df['sell date'] = sell_dates



    # ---- earnings offset ----

    # negative value means the closest earnings date is in the future
    # positive value means the closest earnings date is in the past
    # from current date, locate the closest earnings date.
    # refer to trading calendar to calculate number of trading days in the past or in advance
    # refer to known earnings dates
    
    # df_with_earnings_offset = earnings_offset_correct(df_with_earnings_offset)

    # if earnings failed, still write the file
    try:
        df_with_earnings_offset = calculate_earnings_offset(df, justticker)
        df_with_earnings_offset = earnings_offset_correct(df_with_earnings_offset, trading_days_list2)
        # df_with_earnings_offset.to_csv(f"{output_directory}\\{justticker}.csv", index=False)
        df_with_earnings_offset.to_csv(os.path.join(output_directory, f"{justticker}.csv"), index=False)
    except:
    # except Exception as e:
        # print(f'error: ({justticker})', e)
        # traceback.print_exc()
        # df.to_csv(f"{output_directory}\\{justticker}.csv", index=False)
        df.to_csv(os.path.join(output_directory, f"{justticker}.csv"), index=False)
    # first 63 rows are ignored, (not including header), so toss them out as they are irrelevant // the site does this

    # Save the dataframe to a CSV file
    # df.to_csv(f"{output_directory}\\{justticker}.csv", index=False)
    # df_with_earnings_offset.to_csv(f"{output_directory}\\{justticker}.csv", index=False)

# create columns needed for charts in quicklook_perf_template_chart3.xlsm

# def process_ticker(ticker, csv_file, justticker):
#     try:
#         max63d(csv_file, justticker)
#         # return f"Processed {ticker} successfully"
#     except Exception as e:
#         return f"Error processing ticker {ticker}: {e}"

def process_ticker(args):
    ticker, csv_file, justticker = args
    # max63d(csv_file, justticker)
    try:
        max63d(csv_file, justticker)
    except Exception as e:
        return f"Error processing ticker {ticker}: {e}"
    # return f"Processed {ticker} successfully"

# with open('../../../../../raw_stock_data/tickerlists/tickerlist_validated.txt', 'r') as f:
#     validated_tickers = f.read().splitlines()
# csv_files = [f'../../../../../raw_stock_data/daily_data/{file_name}.csv' for file_name in validated_tickers]

# ---- SINGLE TEST ----
# csv_files = [f'../../../../../raw_stock_data/daily_data/^GSPC.csv']
# validated_tickers = ['^GSPC']
# ---------------------

# for ticker, csv_file, justticker, in tqdm(zip(validated_tickers, csv_files, validated_tickers), total=len(validated_tickers), desc="Processing tickers"):

#     try:
#         max63d(csv_file, justticker)
#     except Exception as e:
#         print(f"Error processing ticker {ticker}: {e}")

# Using ThreadPoolExecutor to process tickers in parallel
# with ThreadPoolExecutor(max_workers=10) as executor:  # Adjust max_workers as needed
#     futures = [executor.submit(process_ticker, ticker, csv_file, justticker) 
#                for ticker, csv_file, justticker in zip(validated_tickers, csv_files, validated_tickers)]
    
#     # Progress bar with tqdm
#     for future in tqdm(as_completed(futures), total=len(futures), desc="Processing tickers"):
#         pass
#         # print(future.result())

def main():

    # with open('X:/Stockland/raw_stock_data/tickerlists/tickerlist_validated.txt', 'r') as f:
    #     validated_tickers = f.read().splitlines()
    # csv_files = [f'X:/Stockland/raw_stock_data/daily_data/{file_name}.csv' for file_name in validated_tickers]

    with open(validated_tickers_file, 'r') as f:
        validated_tickers = f.read().splitlines()

    csv_files = [os.path.join(daily_data_directory, f'{file_name}.csv') for file_name in validated_tickers]
    # csv_files = csv_files[:20]

    # single_ticker = 'NVDA' 
    # single_csv_file = f'X:/Stockland/raw_stock_data/daily_data/{single_ticker}.csv'
    # process_ticker((single_ticker, single_csv_file, single_ticker))

    # Using ProcessPoolExecutor to process tickers in parallel
    with ProcessPoolExecutor(max_workers=NRSUBPROCESSES) as executor:  # Adjust max_workers as needed
        futures = list(tqdm(executor.map(process_ticker, zip(validated_tickers, csv_files, validated_tickers)), total=len(validated_tickers), desc="Processing tickers"))

if __name__ == "__main__":
    # profiler = cProfile.Profile()
    # profiler.enable()

    main()

    # profiler.disable()

    # import pstats

    # Save the stats to a file
    # with open(f"{output_directory}\\profile_output.txt", "w") as f:
        # ps = pstats.Stats(profiler, stream=f)
        # ps.sort_stats('cumulative').print_stats()

    # Print a confirmation message
    # print("Profile saved to profile_output.txt")