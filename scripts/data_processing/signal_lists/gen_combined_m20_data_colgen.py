"""
runtime: 1 minute

use a class based approach as this will just be ONE calculation added as a column and I plan to implement more columns in the future

add columns to ../combined_m20_data.csv

refer to 'Ticker' column.

Open the corresponding data file from os.path.join(base_path, 'raw_stock_data', 'daily_data')

keep that file dataframe in memory and get rid of it until you are at a row with a new Ticker that is different. 

calculate the 2 year Beta using 504 rows above the 'Date' from the row in combined_m20_data.csv

similiar to this algorithm
    # Calculate daily returns
    time_series['Portfolio Daily Return'] = time_series['Portfolio Value'].pct_change()
    time_series['SP500 Daily Return'] = time_series['Scaled ^GSPC'].pct_change()
    time_series['Risk-Free Daily Return'] = time_series['Investment Value'].pct_change()

    # Drop the first row since it will have NaN values for daily returns
    time_series = time_series.dropna()

    # Calculate Beta
    covariance = time_series['Portfolio Daily Return'].cov(time_series['SP500 Daily Return'])
    variance = time_series['SP500 Daily Return'].var()
    beta = covariance / variance

add the respective betas as a column to combined_m20_data.csv and save that as combined_m20_data_colgen.csv
"""


import pandas as pd
import os
from multiprocessing import Pool
from tqdm import tqdm


class StockDataProcessor:
    def __init__(self, base_path):
        self.base_path = base_path
        self.threshold = -0.2  # Threshold for crossing events
        self.sp500_data = self.load_sp500_data()

    def load_combined_data(self):
        return pd.read_csv('../../../data/signal_lists/combined_m20_data.csv')
        # return pd.read_csv('../combined_m20_data_with_Pwin.csv')

    def load_daily_data(self, ticker):
        daily_data_path = f'../../../data/chartdata/historic/0301/{ticker}.csv'
        daily_data = pd.read_csv(daily_data_path)
        daily_data['Date'] = pd.to_datetime(daily_data['Date'])  # Convert to datetime
        return daily_data
    
    def load_sp500_data(self):
        sp500_data_path = f'../../../data/chartdata/historic/0301/^GSPC.csv'
        return pd.read_csv(sp500_data_path)

    def calculate_crossing_stats(self, args):
        ticker, date = args
        daily_data = self.load_daily_data(ticker)
        # Find the index of the given date
        idx = daily_data.index[daily_data['Date'] == pd.to_datetime(date)].tolist()
        
        # Ensure the date is found in the dataset
        if not idx:
            return {'number_of_crossings': 0, 'average_duration': 0, 'max_duration': 0, 
                    'min_duration': 0, 'total_days_below_threshold': 0, 'std_deviation': 0}
        
        idx = idx[0]
        # Select 504 days of data ending on the given date
        # relevant_data = daily_data.iloc[max(0, idx - 503):idx + 1].copy()

        # Select 504 days of data ending just before the given date
        relevant_data = daily_data.iloc[max(0, idx - 503):idx].copy()

        # Calculate crossings
        relevant_data.loc[:, 'crossed'] = relevant_data['63d %'] < self.threshold
        crossings = relevant_data['crossed'].ne(relevant_data['crossed'].shift())
        
        start_crossings = relevant_data.loc[crossings & relevant_data['crossed'], 'Date'].reset_index(drop=True)
        end_crossings = relevant_data.loc[crossings & ~relevant_data['crossed'], 'Date'].reset_index(drop=True)

        # Make sure start and end crossings are aligned
        if len(end_crossings) > len(start_crossings):
            end_crossings = end_crossings.iloc[1:]
        crossing_durations = (end_crossings - start_crossings.shift(1)).dropna()

        # Calculate stats
        stats = {
            'number_of_crossings': len(crossing_durations),
            'average_duration': crossing_durations.mean().days if not crossing_durations.empty else 0,
            'max_duration': crossing_durations.max().days if not crossing_durations.empty else 0,
            'min_duration': crossing_durations.min().days if not crossing_durations.empty else 0,
            'total_days_below_threshold': crossing_durations.sum().days if not crossing_durations.empty else 0,
            'std_deviation': crossing_durations.std().days if not crossing_durations.empty else 0  # Pandas returns Timedelta, convert to days
        }
        return stats

    def calculate_beta(self, args):
        ticker, date = args
        daily_data = self.load_daily_data(ticker)
        # Find the index of the given date
        idx = daily_data[daily_data['Date'] == date].index[0]
        # Select 504 days of data ending on the given date
        stock_time_series = daily_data.iloc[max(0, idx - 503):idx + 1].copy()
        sp500_time_series = self.sp500_data.iloc[max(0, idx - 503):idx + 1].copy()

        # Calculate daily returns
        stock_time_series['Stock Daily Return'] = stock_time_series['Close'].pct_change()
        sp500_time_series['SP500 Daily Return'] = sp500_time_series['Close'].pct_change()

        # Drop NaN values
        stock_time_series.dropna(inplace=True)
        sp500_time_series.dropna(inplace=True)

        # Calculate Beta
        covariance = stock_time_series['Stock Daily Return'].cov(sp500_time_series['SP500 Daily Return'])
        variance = sp500_time_series['SP500 Daily Return'].var()
        beta = covariance / variance
        return beta

    def integrate_pwin_data(self, combined_m20_df):

        # assumes dates are in YYYY-MM-DD

        pwin_path = '../../../data/Pwin/Pwin.csv'
        # Read the Pwin file
        pwin_df = pd.read_csv(pwin_path)
        # Merge with combined_m20_data.csv on Ticker and Date
        combined_m20_df = combined_m20_df.merge(pwin_df, left_on=['Ticker', 'Date'], right_on=['Ticker', 'RollbackDate'], how='left')
        # Rename M20Pct column to Pwin
        combined_m20_df.rename(columns={'M20Pct': 'Pwin'}, inplace=True)
        combined_m20_df.rename(columns={'M20InplayPct': 'PwinIP'}, inplace=True)
        # Drop unnecessary columns
        combined_m20_df.drop(columns=['RollbackDate'], inplace=True)
        # combined_m20_df.drop(columns=['RollbackDate', 'M20PassCount', 'M20Total', 'M20InplayPassCount', 'M20InplayTotal'], inplace=True)
        return combined_m20_df

    def process(self, nr_subprocesses):
        combined_data = self.load_combined_data()
        tickers_dates = [(row['Ticker'], row['Date']) for _, row in combined_data.iterrows()]

        with Pool(nr_subprocesses) as p:
            stats_list = list(tqdm(p.imap(self.calculate_crossing_stats, tickers_dates), total=len(tickers_dates)))

        # Add stats to the dataframe
        for i, stats in enumerate(stats_list):
            for key in stats:
                combined_data.at[i, key] = stats[key]

        combined_data = self.integrate_pwin_data(combined_data)

        return combined_data

    def save_combined_data(self, data):
        data.to_csv('../../../data/signal_lists/combined_m20_data_colgen_wPwin.csv', index=False)

# Usage
import platform
operating_system = platform.system()
if operating_system == "Windows":
    base_path = "X:\\"
    verbose = True
    os.system('color')
    NRSUBPROCESSES = 16
else:
    base_path = "/media/share/"
    verbose = False
    NRSUBPROCESSES = 16

# base_path = 'path_to_your_data_directory'
processor = StockDataProcessor(base_path)
processed_data = processor.process(NRSUBPROCESSES)
processor.save_combined_data(processed_data)