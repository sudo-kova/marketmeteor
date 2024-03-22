import polars as pl
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
        Custom rounding function to match Excel's rounding behavior, applied to a Polars Series.

        :param series: Polars Series containing float values to be rounded.
        :return: Polars Series with values rounded according to Excel's rounding rules.
        """
        def round_individual_value(value):
            value_decimal = decimal.Decimal(str(value))
            return float(value_decimal.quantize(decimal.Decimal('0.0001'), rounding=decimal.ROUND_HALF_UP))

        rounded_values = [round_individual_value(v) for v in series.to_numpy()]
        # Creating a new Polars Series and setting the name separately
        rounded_series = pl.Series(name=series.name, values=rounded_values)
        return rounded_series

def preprocess_data(file_path):
    df = pl.read_csv(file_path)
    if len(df) > 2016:
        df = df.tail(2016)

    ticker = IndividualTicker()
    # Perform rounding once here
    df = df.with_columns([
        ticker.excel_like_round_v4(df['Close'].cast(pl.Float64)).alias('Close')
    ])

    return df

def calculate_var(df, justticker):
    # Use with_columns to add or modify columns
    df = df.with_columns([
        df['Close'].pct_change().alias('Return')
    ])
    var_95 = df['Return'].quantile(0.05, interpolation='linear')
    var_99 = df['Return'].quantile(0.01, interpolation='linear')
    return var_95, var_99


def calculate_var_covar(df, justticker, confidence_levels=[0.95, 0.99]):
    # Use with_columns to add or modify columns
    df = df.with_columns([
        df['Close'].pct_change().alias('Return')
    ])
    mean_return = df['Return'].mean()
    std_deviation = df['Return'].std()

    var_values = []
    for cl in confidence_levels:
        z_score = 1.645 if cl == 0.95 else 2.33  # 95% and 99% confidence levels
        var_value = -(mean_return + z_score * std_deviation)
        var_values.append(var_value)

    return var_values



def process_ticker(args):
    ticker, csv_file, justticker = args

    df = preprocess_data(csv_file)
    var_hist_95, var_hist_99 = calculate_var(df, justticker)
    var_covar_95, var_covar_99 = calculate_var_covar(df, justticker)
    return ticker, var_hist_95, var_hist_99, var_covar_95, var_covar_99

    # try:
    #     df = preprocess_data(csv_file)
    #     var_hist_95, var_hist_99 = calculate_var(df, justticker)
    #     var_covar_95, var_covar_99 = calculate_var_covar(df, justticker)
    #     return ticker, var_hist_95, var_hist_99, var_covar_95, var_covar_99
    # except Exception as e:
    #     return ticker, f"Error: {e}", f"Error: {e}", f"Error: {e}", f"Error: {e}"


def main():
    validated_tickers_file = '../../../data/tickerlists/tickerlist_validated.txt'
    daily_data_directory = '../../../data/raw/daily'
    output_file = '../../../data/quant/var/var_polars.csv'

    with open(validated_tickers_file, 'r') as f:
        validated_tickers = f.read().splitlines()

    csv_files = [os.path.join(daily_data_directory, f'{ticker}.csv') for ticker in validated_tickers]
    # csv_files = csv_files[:20]
    var_results = []
    with ProcessPoolExecutor(max_workers=NRSUBPROCESSES) as executor:
        for result in tqdm(executor.map(process_ticker, zip(validated_tickers, csv_files, validated_tickers)), total=len(validated_tickers)):
            var_results.append(result)

    # Save results to CSV
    var_df = pl.DataFrame({'Ticker': [result[0] for result in var_results],
                       'Hist VaR 95%': [result[1] for result in var_results],
                       'Hist VaR 99%': [result[2] for result in var_results],
                       'Var-Covar VaR 95%': [result[3] for result in var_results],
                       'Var-Covar VaR 99%': [result[4] for result in var_results]})
    
    var_df.write_csv(output_file)
    print(f"VaR calculations saved to {output_file}")



if __name__ == "__main__":

    main()