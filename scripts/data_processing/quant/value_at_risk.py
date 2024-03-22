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




"""
Value at Risk (VaR) for a list of validated stock tickers using two different methods: Historical and Variance-Covariance. 

The Historical VaR method calculates the potential loss in value of a stock based on historical price movements. 
It uses a percentile approach on sorted returns to determine the VaR at 95% and 99% confidence levels.

The Variance-Covariance VaR method, on the other hand, assumes a normal distribution of returns and 
calculates the VaR using the mean and standard deviation of the stock's returns. This method also provides VaR values at 95% and 99% confidence levels.

Both methods operate on the last 2016 data points (rows)

`IndividualTicker` class with custom rounding functions
Parallel processing of tickers `ProcessPoolExecutor`.
Saving the VaR results in a CSV file

"""


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


def calculate_var(file_path, justticker):

    df = pd.read_csv(file_path)

    # Truncate the dataframe to the last 2016 rows if it has more than 2016 rows
    if len(df) > 2016:
        df = df.tail(2016).reset_index(drop=True)

    ticker = IndividualTicker()
    # df['Close'] = ticker.custom_rounding_c(df['Close'].astype(float))
    df['Close'] = ticker.excel_like_round_v4(df['Close'].astype(float))

    # Calculate VaR
    df['Return'] = df['Close'].pct_change()
    sorted_returns = df['Return'].dropna().sort_values()
    var_95 = sorted_returns.quantile(0.05)  # 95% confidence level
    var_99 = sorted_returns.quantile(0.01)  # 99% confidence level
    return var_95, var_99

def calculate_var_covar(file_path, justticker, confidence_levels=[0.95, 0.99]):
    df = pd.read_csv(file_path)

    # Truncate the dataframe if needed
    if len(df) > 2016:
        df = df.tail(2016).reset_index(drop=True)

    ticker = IndividualTicker()
    df['Close'] = ticker.excel_like_round_v4(df['Close'].astype(float))

    # Calculate daily returns
    df['Return'] = df['Close'].pct_change()

    # Calculate mean and standard deviation of returns
    mean_return = df['Return'].mean()
    std_deviation = df['Return'].std()

    # Calculate VaR for each confidence level
    var_values = []
    for cl in confidence_levels:
        if cl == 0.95:
            z_score = 1.645  # for 95% confidence
        elif cl == 0.99:
            z_score = 2.33  # for 99% confidence
        var_value = -(mean_return + z_score * std_deviation)  # VaR should be negative
        var_values.append(var_value)

    return var_values

def process_ticker(args):
    ticker, csv_file, justticker = args
    try:
        var_hist_95, var_hist_99 = calculate_var(csv_file, justticker)
        var_covar_95, var_covar_99 = calculate_var_covar(csv_file, justticker)
        return ticker, var_hist_95, var_hist_99, var_covar_95, var_covar_99
    except Exception as e:
        return ticker, f"Error: {e}", f"Error: {e}", f"Error: {e}", f"Error: {e}"


def main():
    validated_tickers_file = '../../../data/tickerlists/tickerlist_validated.txt'
    daily_data_directory = '../../../data/raw/daily'
    output_file = '../../../data/quant/var/var.csv'

    with open(validated_tickers_file, 'r') as f:
        validated_tickers = f.read().splitlines()

    csv_files = [os.path.join(daily_data_directory, f'{ticker}.csv') for ticker in validated_tickers]

    var_results = []
    with ProcessPoolExecutor(max_workers=NRSUBPROCESSES) as executor:
        for result in tqdm(executor.map(process_ticker, zip(validated_tickers, csv_files, validated_tickers)), total=len(validated_tickers)):
            var_results.append(result)

    # Save results to CSV
    var_df = pd.DataFrame(var_results, columns=['Ticker', 'Hist VaR 95%', 'Hist VaR 99%', 'Var-Covar VaR 95%', 'Var-Covar VaR 99%'])
    var_df.to_csv(output_file, index=False)
    print(f"VaR calculations saved to {output_file}")



if __name__ == "__main__":

    main()