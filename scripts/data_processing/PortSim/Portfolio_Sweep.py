import pandas as pd
import os
import numpy as np

from multiprocessing import Pool
from tqdm import tqdm

from termcolor import colored
# using signals_table.csv to run a portfolio simulation
# each row represents a "buy signal"
# after a position is sold, it takes 3 days to clear that money
# buy and sell dates are numbered to be easily traversed

# start with 2000 cash
# have functions for buy, sell, and clear

import warnings

warnings.simplefilter(action='ignore', category=FutureWarning)
warnings.filterwarnings('ignore')

# Suppress SettingWithCopyWarning
pd.options.mode.chained_assignment = None  # default='warn'

import platform

class Portfolio:
    def __init__(self, initial_cash=10000):

        self.initial = initial_cash

        # Initial cash balance
        self.cash = initial_cash
        # Dictionary to keep track of stock positions (ticker: number of shares)
        self.positions = {}
        # Dataframe to log transactions
        self.transaction_log = pd.DataFrame(columns=['date_number', 'action', 'ticker', 'shares', 'price', 
                                                     'max_position_size', 'cash', 'sell_date', 'clear_date'])
        self.max_position_size = 2000

    def buy(self, date_number, ticker, price, shares, sell_date=None):
        """
        Buy shares of a stock.
        :param date_number: Date number of the transaction.
        :param ticker: Stock ticker.
        :param price: Price per share.
        :param shares: Number of shares to buy.
        """

        # Update max position size for next
        # self.max_position_size = self.cash
        self.max_position_size = min(self.cash, 2000)

        cost = price * shares
        
        if self.cash >= cost:

            # Update cash balance
            self.cash -= cost

            # Update positions
            if ticker in self.positions:
                self.positions[ticker] += shares
            else:
                self.positions[ticker] = shares
            # Log the transaction
            # self.transaction_log = self.transaction_log.append({'date_number': date_number, 'action': 'buy', 
            #                                                     'ticker': ticker, 'shares': shares, 'price': price, 
            #                                                     'max_position_size': self.max_position_size, 'cash': self.cash, 
            #                                                     'sell_date': sell_date, 'clear_date': None}, 
            #                                                    ignore_index=True)
            
            new_row = pd.DataFrame({'date_number': [date_number], 
                                    'action': ['buy'], 
                                    'ticker': [ticker], 
                                    'shares': [shares], 
                                    'price': [price], 
                                    'max_position_size': [self.max_position_size], 
                                    'cash': [self.cash], 
                                    'sell_date': [sell_date], 
                                    'clear_date': [None]})

            self.transaction_log = pd.concat([self.transaction_log, new_row], ignore_index=True)

            return True
        else:
            print(f'skipping this buy command, cost: {cost}, cash: {self.cash}')

    def sell(self, date_number, ticker, price, shares, clear_date):
        """
        Sell shares of a stock.
        :param date_number: Date number of the transaction.
        :param ticker: Stock ticker.
        :param price: Price per share.
        :param shares: Number of shares to sell.
        """

        # Update max position size for next
        self.max_position_size = self.cash

        if ticker in self.positions and self.positions[ticker] >= shares:
            # Calculate revenue
            revenue = price * shares
            # self.cash += revenue
            # Update positions
            self.positions[ticker] -= shares
            if self.positions[ticker] == 0:
                del self.positions[ticker]
            # Log the transaction with sell date and clear date (3 days later)
            # clear_date = date_number + 3
            # self.transaction_log = self.transaction_log.append({'date_number': date_number, 'action': 'sell', 
            #                                                     'ticker': ticker, 'shares': shares, 'price': price, 
            #                                                     'max_position_size': self.max_position_size, 'cash': self.cash, 
            #                                                     'sell_date': None, 'clear_date': clear_date}, 
            #                                                    ignore_index=True)

            new_row = pd.DataFrame({'date_number': [date_number], 
                                    'action': ['sell'], 
                                    'ticker': [ticker], 
                                    'shares': [shares], 
                                    'price': [price], 
                                    'max_position_size': [self.max_position_size], 
                                    'cash': [self.cash], 
                                    'sell_date': [None], 
                                    'clear_date': [clear_date]})

            self.transaction_log = pd.concat([self.transaction_log, new_row], ignore_index=True)


    def clear(self, date_number, ticker, price, shares):
        """
        Clear the funds after a sale.
        """

        revenue = price * shares

        self.cash += revenue

        # self.transaction_log = self.transaction_log.append({'date_number': date_number, 'action': 'clear', 
        #                                                     'ticker': ticker, 'shares': shares, 'price': price, 
        #                                                     'max_position_size': self.max_position_size, 'cash': self.cash, 
        #                                                     'sell_date': None, 'clear_date': None}, 
        #                                                     ignore_index=True)
        # Assuming self.transaction_log is your existing DataFrame
        new_row = pd.DataFrame({'date_number': [date_number], 
                                'action': ['clear'], 
                                'ticker': [ticker], 
                                'shares': [shares], 
                                'price': [price], 
                                'max_position_size': [self.max_position_size], 
                                'cash': [self.cash], 
                                'sell_date': [None], 
                                'clear_date': [None]})

        self.transaction_log = pd.concat([self.transaction_log, new_row], ignore_index=True)

    def run_simulation(self, signals_df):
        """
        Run the portfolio simulation based on buy/sell signals from the dataframe.
        :param signals_df: DataFrame with signals.
        """

        clearing = {} # dictionary to track positions that will clear in the future
        clearing_days = 3

        for index, row in signals_df.iterrows():

            # if index == 16:
                

            ticker = row['Ticker']
            price = row['Price']
            sell_price = row['sell_price']
            date_number_buy = row['date_number_buy']
            date_number_sell = row['date_number_sell']

            # Clear positions that sell on this buy date number

            # if date_number_buy in clearing:
            #     print(f'date number {date_number_buy} in clearing')
            #     for sell_info in clearing[date_number_buy]:
            #         _, ticker_info, price_info, number_of_shares_info, sell_date = sell_info
            #         # print(sell_info)
            #         # print(ticker)
            #         self.sell(sell_date-clearing_days, ticker_info, price_info, number_of_shares_info, sell_date)
            #         print(f'self.sell({sell_date}, {ticker_info}, {price_info}, {number_of_shares_info}, {sell_date})')

            #         self.clear(sell_date, ticker_info, price_info, number_of_shares_info)
            #         print(colored(f'self.clear({sell_date}, {ticker_info}, {price_info}, {number_of_shares_info})', "green"))

            #     # remove key
            #     del clearing[date_number_buy]

            # perform sell and clears on keys < date_number_buy
            perform_sell_and_clears = [key for key in clearing if key <= date_number_buy]
            # print(f'today is {date_number_buy}, remove {perform_sell_and_clears}')

            for key in perform_sell_and_clears:
                for sell_info in clearing[key]:
                    _, ticker_info, price_info, number_of_shares_info, sell_date = sell_info
                    # print(sell_info)
                    # print(ticker)
                    self.sell(sell_date-clearing_days, ticker_info, price_info, number_of_shares_info, sell_date)

                    if verbose:
                        print(f'self.sell({sell_date}, {ticker_info}, {price_info}, {number_of_shares_info}, {sell_date})')

                    self.clear(sell_date, ticker_info, price_info, number_of_shares_info)
                    
                    if verbose:
                        print(colored(f'self.clear({sell_date}, {ticker_info}, {price_info}, {number_of_shares_info})', "green"))

                # remove key
                del clearing[key]

                
            # number_of_shares = int(self.max_position_size/price)
            number_of_shares = int(min(self.cash,2000) / price)
            # number_of_shares = min(int(self.cash/price),2000)

            # if index >= 153 and index <= 160:
            #     # print(colored(f'---- {row} ----', "yellow"))
            #     print(f'ticker: {ticker}')
            #     print(f'cash: {self.cash}')
            #     print(f'price: {price}')
            #     print(f'number_of_shares: {number_of_shares}')
            #     print(f'needed: {price * number_of_shares}')

            # Skip buying if already holding a position in the same stock
            if ticker in self.positions:
                if verbose:
                    print(f"Already holding a position in {ticker}, skipping buy.")

                # continue to next iteration. if statement below not executed
                continue

            # Execute buy and sell based on the signals
            if not pd.isna(date_number_buy) and self.cash >= price * number_of_shares and number_of_shares>0:
                successful_buy = self.buy(date_number_buy, ticker, price, number_of_shares, date_number_sell)

                if successful_buy:

                    # Check if date_number_sell is not 'nan'
                    if not pd.isna(date_number_sell):
                        outnumber = date_number_sell + clearing_days
                        if outnumber in clearing:
                            clearing[outnumber].append((date_number_sell, ticker, sell_price, number_of_shares, outnumber))  # Store the sell date
                        else:
                            clearing[outnumber] = [(date_number_sell, ticker, sell_price, number_of_shares, outnumber)]  # Store the sell date
                        
                        if verbose:
                            print(colored(f'added to clearing: ({clearing[outnumber]})', "yellow"))
                    if verbose:
                        print(colored(f'self.buy({date_number_buy}, {ticker}, {price}, {number_of_shares}, {date_number_sell})', "blue"))

        # Check if the clearing dictionary is not empty
        if clearing:
            # Iterate through all remaining keys in the clearing dictionary
            for key in sorted(clearing.keys()):
                for sell_info in clearing[key]:
                    _, ticker_info, price_info, number_of_shares_info, sell_date = sell_info
                    self.sell(sell_date-clearing_days, ticker_info, price_info, number_of_shares_info, sell_date)

                    if verbose:
                        print(f'self.sell({sell_date}, {ticker_info}, {price_info}, {number_of_shares_info}, {sell_date})')

                    self.clear(sell_date, ticker_info, price_info, number_of_shares_info)
                    
                    if verbose:
                        print(colored(f'self.clear({sell_date}, {ticker_info}, {price_info}, {number_of_shares_info})', "green"))

        # print(clearing)

        return self.transaction_log

def process_portfolio(args):

    starting_balance = args['starting_balance']
    date_nr_mapping = args['date_nr_mapping']
    daily_data_directory = args['daily_data_directory']
    end_date_nr_mapping = args['end_date_nr_mapping']
    base_folder = args['base_folder']
    signals_df_full = args['signals_df_full']
    i = args['i']
    signals_table_file_name = args['signals_table_file_name']

    # for i in range(nr_signals):

    signals_df = signals_df_full.iloc[i:]
    output_folder = f'{base_folder}/{signals_table_file_name}/start{starting_balance}/date{i}'
    metrics_csv_file_path = f"{output_folder}/key_metrics_start{starting_balance}_date{i}.csv"

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    portfolio = Portfolio(starting_balance)

    transaction_log = portfolio.run_simulation(signals_df)
    transaction_log['ticker'] = transaction_log['ticker'].str.replace("d", "-", regex=False)

    # ---- create time series of portfolio ----

    # Merge the date mapping with the transaction log
    transaction_log = pd.merge(transaction_log, date_nr_mapping, left_on='date_number', right_on='nr', how='left')
    transaction_log = transaction_log.sort_values(by='date_number', ascending=True)
    transaction_log.to_csv(f"{output_folder}/portsim.csv", index = False)

    # Removing rows where 'action' is 'clear'
    transaction_log = transaction_log[transaction_log['action'] != 'clear']

    # Load stock data for each ticker and map date_nr to it
    stock_data = {}
    for ticker in transaction_log['ticker'].unique():
        ticker = ticker.replace("d", "-")
        file_path = os.path.join(daily_data_directory, f'{ticker}.csv')
        # print(file_path)
        if os.path.exists(file_path):
            stock_df = pd.read_csv(file_path)
            stock_df['date'] = pd.to_datetime(stock_df['Date'])
            # Merge with date_nr_mapping
            stock_df = pd.merge(stock_df, date_nr_mapping, left_on='date', right_on='date', how='left')
            stock_data[ticker] = stock_df

    # Calculate portfolio value over time using date_nr
            
    # print(transaction_log)
    start_date_nr = transaction_log['nr'].min()
    # end_date_nr = transaction_log['nr'].max()

    # last_clear_date = {ticker: None for ticker in transaction_log['ticker'].unique()}

    # Calculate portfolio and position values over time
    active_periods = {}
    position_counter = {}

    # Determine active periods for each position
    for _, row in transaction_log.iterrows():
        ticker = row['ticker']
        position_id = f"{ticker} Position {position_counter.get(ticker, 1)}"
        
        if row['action'] == 'buy':
            # Use 'sell_date' as the end of the active period, or None if 'sell_date' is not available
            end_period = row['sell_date'] if not pd.isna(row['sell_date']) else None
            active_periods[position_id] = [row['nr'], end_period]  # Define the active period
            position_counter[ticker] = position_counter.get(ticker, 1) + 1

    # print(active_periods)

    # Function to check if a date_nr is within the active period for a position
    def is_active(date_nr, period):
        # Adjust end period check to be inclusive if end_period is set
        end_period = period[1] if period[1] else float('inf')
        return period[0] <= date_nr <= end_period

    # Initialize the DataFrame with date_nr as the index

    # print(start_date_nr)
    # print(end_date_nr)
    # print(f'start: {start_date_nr}, end: {end_date_nr_mapping}')

    time_series = pd.DataFrame(index=range(int(start_date_nr), int(end_date_nr_mapping) + 1))
    time_series['Portfolio Value'] = 0
    time_series['Cash Value'] = 0  # Initialize the Cash Value column

    # Initialize columns for each position
    for position_id in active_periods.keys():
        time_series[f'{position_id} Value'] = 0

    time_series['Cash Value'] = 0  # Initialize the Cash Value column

    # Track the last value of each position
    last_position_values = {position_id: (0, None) for position_id in active_periods.keys()}  # (value, end_date_nr)

    # Calculate portfolio and position values over time
    for date_nr in time_series.index:
        daily_value = 0
        # cash_on_date = transaction_log[transaction_log['nr'] <= date_nr]['cash'].iloc[-1]

        cash_on_date = transaction_log[transaction_log['nr'] <= date_nr]['cash'].min()

        # if date_nr <= 2092 and date_nr >= 2090:
        #     print(transaction_log[transaction_log['nr'] <= date_nr]['cash'])
        #     print(f'{date_nr}, {cash_on_date}')

        # Reset values for positions that have been accounted for more than two days ago
        for position_id in last_position_values:
            if last_position_values[position_id][1] and date_nr > last_position_values[position_id][1] + 2:
                last_position_values[position_id] = (0, None)

        for position_id, period in active_periods.items():
            if is_active(date_nr, period):
                position_ticker = position_id.split(" ")[0]
                # position_ticker = position_ticker.replace("d", "-")
                # print(f'position ticker: {position_ticker}')
                # Find the row corresponding to the start of the period for this position

                row = transaction_log[(transaction_log['ticker'] == position_ticker) & 
                                    (transaction_log['nr'] == period[0]) & 
                                    (transaction_log['action'].isin(['buy']))].iloc[0]
                shares = row['shares']

                if position_ticker in stock_data and date_nr in stock_data[position_ticker]['nr'].values:
                    stock_price = stock_data[position_ticker][stock_data[position_ticker]['nr'] == date_nr]['Close'].iloc[0]
                    position_value = shares * stock_price
                    time_series.loc[date_nr, f'{position_id} Value'] = position_value
                    daily_value += position_value
                    # last_position_values[position_id] = position_value

                    # Update last position value and end date
                    if period[1] and date_nr == period[1]:  # Check if the period has ended
                        last_position_values[position_id] = (position_value, date_nr)

        for position_id, (value, end_date_nr) in last_position_values.items():
            # Check if the current date is one of the two days after the end date
            # if 2222 <= date_nr <= 2226:
                # print(f"Processing {position_id}, End Date: {end_date_nr}, Current Date: {date_nr}, Value: {value}")

            if end_date_nr and (date_nr == end_date_nr + 1 or date_nr == end_date_nr + 2):
                cash_on_date += value
                # if 2222 <= date_nr <= 2226:
                    # print(f"Added {value} to cash for {position_id} on day {date_nr}")
                # Reset after two days
                if date_nr == end_date_nr + 2:
                    last_position_values[position_id] = (0, None)
                
        # Reset values for positions that have been accounted for more than two days ago
        for position_id in last_position_values:
            if last_position_values[position_id][1] and date_nr > last_position_values[position_id][1] + 2:
                last_position_values[position_id] = (0, None)

        # if date_nr <= 2092 and date_nr >= 2090:
        #     print(f'{date_nr}, {cash_on_date}')

        # when a position stops being tracked, the cash on the next row must add that last close price 
        time_series.loc[date_nr, 'Portfolio Value'] = daily_value + cash_on_date
        time_series.loc[date_nr, 'Cash Value'] = cash_on_date

    time_series.reset_index(inplace=True)
    time_series.rename(columns={'index': 'date_nr'}, inplace=True)

    # ---- ^GSPC ----
    gspc_file_path = os.path.join(daily_data_directory, '^GSPC.csv')
    if os.path.exists(gspc_file_path):
        gspc_data = pd.read_csv(gspc_file_path)
        gspc_data['date'] = pd.to_datetime(gspc_data['Date'])
        gspc_data = pd.merge(gspc_data, date_nr_mapping, left_on='date', right_on='date', how='left')

        # Find the close price of ^GSPC corresponding to the first date_nr in time_series
        first_date_nr = time_series['date_nr'].iloc[0]
        initial_gspc_value = gspc_data[gspc_data['nr'] == first_date_nr]['Close'].iloc[0]

        # Calculate the scaling factor
        scaling_factor = portfolio.initial / initial_gspc_value

        # Scale the ^GSPC data
        gspc_data['Scaled ^GSPC'] = gspc_data['Close'] * scaling_factor

        # Merge the scaled ^GSPC data with the time_series DataFrame
        time_series = pd.merge(time_series, gspc_data[['nr', 'Scaled ^GSPC']], left_on='date_nr', right_on='nr', how='left')
        time_series.drop('nr', axis=1, inplace=True)  # Drop the extra 'nr' column


    # ---- CD / RISK-FREE RETURN ----

    # Merge time_series with date_nr_mapping to get actual dates
    time_series = pd.merge(time_series, date_nr_mapping, left_on='date_nr', right_on='nr')

    # Initialize a column for the investment value
    time_series['Investment Value'] = portfolio.initial  # Starting balance

    # Calculate monthly interest rate
    annual_interest_rate = 0.055  # 5.5% annual interest
    monthly_interest_rate = annual_interest_rate / 12

    # Variables to track the month and investment value
    current_month = time_series['date'].iloc[0].month
    investment_value = portfolio.initial

    # Iterate through each row in the DataFrame to calculate the investment value
    for index, row in time_series.iterrows():
        if row['date'].month != current_month:
            # Apply the interest for the new month
            investment_value *= (1 + monthly_interest_rate)
            current_month = row['date'].month
        
        # Update the investment value in the DataFrame
        time_series.at[index, 'Investment Value'] = investment_value

    time_series.drop(['nr', 'date'], axis=1, inplace=True)

    # print(time_series)
    time_series.to_csv(f"{output_folder}/port_timeseries.csv", index = False)

    # ---- KEY PERFORMANCE METRICS ----

    #  Total Return
    initial_value = time_series['Portfolio Value'].iloc[0]
    final_value = time_series['Portfolio Value'].iloc[-1]
    total_return = (final_value / initial_value) - 1

    initial_value = time_series['Scaled ^GSPC'].iloc[0]
    final_value = time_series['Scaled ^GSPC'].iloc[-1]
    gspc_total_return = (final_value / initial_value) - 1

    initial_value = time_series['Investment Value'].iloc[0]
    final_value = time_series['Investment Value'].iloc[-1]
    cd_total_return = (final_value / initial_value) - 1

    # print(f"Total Return: {total_return * 100}%")

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

    # Calculate the average risk-free rate
    average_risk_free_rate = time_series['Risk-Free Daily Return'].mean()
    # print(f"average_risk_free_rate: {average_risk_free_rate}")

    # Update the Alpha calculation
    # Alpha = Portfolio's Average Return - [Risk-Free Rate + Beta * (Market's Average Return - Risk-Free Rate)]
    average_portfolio_return = time_series['Portfolio Daily Return'].mean()
    average_market_return = time_series['SP500 Daily Return'].mean()

    alpha = average_portfolio_return - (average_risk_free_rate + beta * (average_market_return - average_risk_free_rate))

    # Update Sharpe Ratio calculation
    # Sharpe Ratio = (Portfolio's Average Return - Risk-Free Rate) / Portfolio's Standard Deviation
    sharpe_ratio = (time_series['Portfolio Daily Return'].mean() - average_risk_free_rate) / \
                time_series['Portfolio Daily Return'].std()

    # Information Ratio remains the same
    tracking_error = np.std(time_series['Portfolio Daily Return'] - time_series['SP500 Daily Return'])
    information_ratio = alpha / tracking_error

    # print(f"Beta: {beta}")
    # print(f"Alpha: {alpha*100}%")
    # print(f"Standard Deviation: {time_series['Portfolio Daily Return'].std()*100}%")
    # print(f"Sharpe Ratio: {sharpe_ratio}")
    # print(f"Information Ratio: {information_ratio}")

    # Create a DataFrame to store the metrics
    metrics = pd.DataFrame({
        f'start{starting_balance}_date{i}': ['Total Return', 'Beta', 'Alpha', 'Standard Deviation', 'Sharpe Ratio', 'Information Ratio', 'average_risk_free_rate' ,'GSPC', 'CD'],
        'Value': [
            total_return * 100,  # Total Return, %
            beta,                # Beta
            alpha * 100,         # Alpha,%
            time_series['Portfolio Daily Return'].std() * 100,  # Standard Deviation, %
            sharpe_ratio,        # Sharpe Ratio
            information_ratio,   # Information Ratio
            average_risk_free_rate,  # Average Risk-Free Rate, %
            gspc_total_return * 100,  # GSPC Total Return, %
            cd_total_return * 100,  # CD Total Return, %
        ]
    })

    metrics.to_csv(metrics_csv_file_path, index=False)


def main():

    # base_folder = "testset"
    starting_balance = 10000
    base_folder = "../../../data/PortSim/sweep"
    # signals_table_file_name = "fullset_Pwin90plus"
    # signals_table_file_name = "Pwin90plus_greaterthan50closestabove"
    # signals_table_file_name = "Pwin90plus_earnings_0_to_49"
    # signals_table_file_name = "Pwin90plus_earnings_neg10_to_9"
    # signals_table_file_name = "Pwin90plus_earnings_neg63to7_avrgdurationLT21_GTnegpt3dd_mmGTnegpt25"
    # signals_table_file_name = "Pwin80plus_earnings_neg63to14_avrgdurationLT7_GTnegpt5dd_mmGTnegpt35"
    # signals_table_file_name = "Unique_Pwin80plus_earnings_neg63to14_avrgdurationLT7_GTnegpt5dd_mmGTnegpt35"
    # signals_table_file_name = "Unique_Pwin80plus_earnings_neg63to14_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35"
    # signals_table_file_name = "Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35"
    # signals_table_file_name = "dads_filter"
    signals_table_file_name = "dads_filter_80"

    signals_df_full = pd.read_csv(f'../../../data/signal_lists/portfolio_simulation/{signals_table_file_name}.csv')
    nr_signals = len(signals_df_full)
    print(f'processing {nr_signals} portfolio simulations ...')

    # date nr mapping file
    date_nr_mapping = pd.read_csv(f'../../../data/signal_lists/portfolio_simulation/{signals_table_file_name}_date_nrs.csv')
    date_nr_mapping['date'] = pd.to_datetime(date_nr_mapping['date'])
    date_nr_mapping['nr'] = date_nr_mapping['nr'].astype(int)
    end_date_nr_mapping = date_nr_mapping['nr'].max()

    # nr_signals = 32

    # daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data')
    daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data_03_01')

    process_args = [{
        'starting_balance': starting_balance,
        'date_nr_mapping': date_nr_mapping,
        'daily_data_directory': daily_data_directory,
        'end_date_nr_mapping': end_date_nr_mapping,
        'base_folder': base_folder,
        'signals_df_full': signals_df_full,
        'i': i,
        'signals_table_file_name': signals_table_file_name
    } for i in range(nr_signals)]

    with Pool(NRSUBPROCESSES) as pool:
        for _ in tqdm(pool.imap_unordered(process_portfolio, process_args), total=nr_signals):
            pass

if __name__ == "__main__":

    # determine the operating system
    operating_system = platform.system()
    if operating_system == "Windows":
        base_path = "X:\\Stockland"
        verbose = True
        os.system('color')
        NRSUBPROCESSES = 16
    else:
        base_path = "/media/share/Stockland"
        verbose = False
        NRSUBPROCESSES = 16

    main()

    # import cProfile
    # import pstats

    # profiler = cProfile.Profile()
    # profiler.enable()

    # main()  # the function you want to profile

    # profiler.disable()
    # with open("sweep/profiling_results.txt", "w") as f:
    #     stats = pstats.Stats(profiler, stream=f)
    #     stats.sort_stats('cumtime')
    #     stats.print_stats()