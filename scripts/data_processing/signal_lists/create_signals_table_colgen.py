"""

DIFFERENT THAN create_signals_table.py in that it points to combined_m20_data_colgen.csv which has extra columns

input: 

- combined_m20_data.csv
    headers: Date,Open,High,Low,Close,Adj Close,Volume,63d %,63,63min,daily delta,m20 pass,m20 fail,chance,sell price,sell date,Closest Date,Earnings Offset Closest,Ticker
    ex: 2016-11-03,61.75,62.299999,58.5,58.65,58.650002,299800,-0.2612419700214132,0.2821824381926685,0.0059676044330776,-0.0478896103896104,58.65,,58,63.1,2016-11-08,2016-11-03,0.0,PEN

- Pwin.csv 
    headers: Ticker,RollbackDate,M20PassCount,M20Total,M20Pct
    ex: PEN,2023-10-30,90,112,80.3571

output: 

- signals_table.csv
    headers: Ticker,Date,Price,sell_price,date_number_buy,date_number_sell
    ex: CALM,6/6/2023,46.96,49.41,4,7

- date_nrs.csv
    headers: date,nr
    ex: 6/1/2023,1

before saving, this scripts SORTS THE DATE NUMBERS IN INCREASING ORDER in signals_table.csv

"""

# combined_m20_data_src = 'combined_m20_data_colgen.csv'
combined_m20_data_src = '../../../data/signal_lists/combined_m20_data_colgen_wPwin.csv'
# scenario = 'Pwin90plus_earnings_neg10_to_9'
scenario = 'Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35'
scenario = '../../../data/signal_lists/portfolio_simulation/' + scenario

import platform
import os
import pandas as pd

# determine the operating system
operating_system = platform.system()
if operating_system == "Windows":
    base_path = "X:\\Stockland"
    verbose = True
    os.system('color')
else:
    base_path = "/media/share/Stockland"
    verbose = False

daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data_03_01')
# daily_data_directory = os.path.join(base_path, 'raw_stock_data', 'daily_data')

def process_gspc_file(daily_data_directory):
    gspc_path = os.path.join(daily_data_directory, '^GSPC.csv')
    # Read the file
    gspc_df = pd.read_csv(gspc_path)
    # Create 'nr' column starting at 1
    gspc_df['nr'] = range(1, len(gspc_df) + 1)
    # Rename 'Date' to 'date'
    gspc_df.rename(columns={'Date': 'date'}, inplace=True)
    # Save date and nr columns to date_nrs.csv
    gspc_df[['date', 'nr']].to_csv(f'{scenario}_date_nrs.csv', index=False)


def process_combined_m20_data():
    combined_m20_path = combined_m20_data_src
    # Read the file
    combined_m20_df = pd.read_csv(combined_m20_path)

    # Select and rename the necessary columns
    combined_m20_df = combined_m20_df[['Ticker', 'Date', 'Close', 'sell price', 'sell date', 'closest_above', 'Earnings Offset Closest', 'average_duration', 'total_days_below_threshold', '63d %', 'daily delta', 'Pwin']]
    colnames = {'Close': 'Price', 'sell price': 'sell_price', 'sell date': 'sell_date', 'closest_above':'closest_above', 'Earnings Offset Closest':'Earnings Offset Closest', 
    'average_duration':'average_duration', 'total_days_below_threshold':'total_days_below_threshold', '63d %':'63d %', 'daily delta':'daily delta', 'Pwin':'Pwin'}
    combined_m20_df.rename(columns=colnames, inplace=True)
    return combined_m20_df

def remove_rows_wo_pwin(combined_m20_df):
    print(combined_m20_df['Pwin'])
    print(len(combined_m20_df))
    # Remove rows where 'Pwin' column has NaN values
    combined_m20_df.dropna(subset=['Pwin'], inplace=True)
    return combined_m20_df

def integrate_pwin_data(combined_m20_df):

    # now being run in gen_combined_m20_data_colgen.py

    # assumes dates are in YYYY-MM-DD

    pwin_path = 'Pwin.csv'
    # Read the Pwin file
    pwin_df = pd.read_csv(pwin_path)
    # Merge with combined_m20_data.csv on Ticker and Date
    combined_m20_df = combined_m20_df.merge(pwin_df, left_on=['Ticker', 'Date'], right_on=['Ticker', 'RollbackDate'], how='left')
    # Rename M20Pct column to Pwin
    combined_m20_df.rename(columns={'M20Pct': 'Pwin'}, inplace=True)
    # Drop unnecessary columns
    combined_m20_df.drop(columns=['RollbackDate', 'M20PassCount', 'M20Total'], inplace=True)
    return combined_m20_df

def integrate_pwin_data2(combined_m20_df):

    # Converts DD/MM/YYYY to YYYY-MM-DD (would need a new version of map_dates_to_numbers)

    pwin_path = 'Pwin.csv'
    # Read the Pwin file
    pwin_df = pd.read_csv(pwin_path)

    # Convert Date format in combined_m20_df to YYYY-MM-DD
    combined_m20_df['Date'] = pd.to_datetime(combined_m20_df['Date'], format='%m/%d/%Y').dt.strftime('%Y-%m-%d')

    # Merge with Pwin.csv on Ticker and Date
    combined_m20_df = combined_m20_df.merge(pwin_df, left_on=['Ticker', 'Date'], right_on=['Ticker', 'RollbackDate'], how='left')

    # Rename M20Pct column to Pwin
    combined_m20_df.rename(columns={'M20Pct': 'Pwin'}, inplace=True)

    # Drop unnecessary columns
    combined_m20_df.drop(columns=['RollbackDate', 'M20PassCount', 'M20Total'], inplace=True)

    return combined_m20_df

def map_dates_to_numbers(combined_m20_df):
    date_nrs_path = f'{scenario}_date_nrs.csv'
    # Read the date_nrs.csv file
    date_nrs_df = pd.read_csv(date_nrs_path)

    print("First few 'sell_date' entries in combined_m20_df:")
    print(combined_m20_df['sell_date'].head())

    print("\nFirst few 'date' entries in date_nrs_df:")
    print(date_nrs_df['date'].head())

    # Merge to map 'Date' to 'date_number_buy'
    combined_m20_df = combined_m20_df.merge(date_nrs_df, left_on='Date', right_on='date', how='left')
    combined_m20_df.rename(columns={'nr': 'date_number_buy'}, inplace=True)
    combined_m20_df.drop(columns=['date'], inplace=True)

    # Merge to map 'sell_date' to 'date_number_sell'
    combined_m20_df = combined_m20_df.merge(date_nrs_df, left_on='sell_date', right_on='date', how='left')
    combined_m20_df.rename(columns={'nr': 'date_number_sell'}, inplace=True)
    combined_m20_df.drop(columns=['date'], inplace=True)

    return combined_m20_df

def filter_signals_table(combined_m20_df):

    # Remove rows where 'Pwin' is blank
    filtered_df = combined_m20_df.dropna(subset=['Pwin'])

    # Keeping rows where 'Pwin' is greater than or equal to 90
    filtered_df = filtered_df[filtered_df['Pwin'] >= 80]

    # Keeping rows where 'closest_above' is > -50
    # filtered_df = filtered_df[filtered_df['closest_above'] > -50]

    # Keeping rows where 'Earnings Offset Closest' is >= 0 and <= 50
    # filtered_df = filtered_df[(filtered_df['Earnings Offset Closest'] >= 0) & (filtered_df['Earnings Offset Closest'] < 50)]

    # Keeping rows where 'Earnings Offset Closest' is >= -10 and <= 10 
    filtered_df = filtered_df[(filtered_df['Earnings Offset Closest'] >= -63) & (filtered_df['Earnings Offset Closest'] < 40)]

    print(filtered_df)

    filtered_df = filtered_df[filtered_df['average_duration'] <= 21]
    print(filtered_df)

    filtered_df = filtered_df[filtered_df['daily delta'] >= -0.05]
    print(filtered_df)

    filtered_df = filtered_df[filtered_df['63d %'] >= -0.35]
    print(filtered_df)

    filtered_df = filtered_df[filtered_df['total_days_below_threshold'] <= 126]
    print(filtered_df)

    return filtered_df

def create_and_save_signals_table(combined_m20_df):
    # Save the processed data to signals_table.csv
    sorted_df = combined_m20_df.sort_values(by='date_number_buy', ascending=True)
    sorted_df.to_csv(f'{scenario}.csv', index=False)

# open ^GSPC.csv in the daily_data_directory, take the 'Date' column and create a 'nr' column starting at 1.
# rename 'Date' to 'date'
# save only date and nr columns to date_nrs.csv
process_gspc_file(daily_data_directory)

# open combined_m20_data.csv, need columns 'Ticker', 'Date', 'Close', 'sell price', 'sell date'
# rename to Ticker,Date,Price,sell_price, sell_date
# use Pwin to retrieve M20Pct, that matches RollbackDate with Ticker on that Date and append as column 'Pwin' to combined_m20_data.csv
# use date_nrs.csv to create date_number_buy and date_number_sell with the Date and sell_date
combined_m20_df = process_combined_m20_data()
print(combined_m20_df)
combined_m20_df = remove_rows_wo_pwin(combined_m20_df)
# combined_m20_df = integrate_pwin_data(combined_m20_df)
# combined_m20_df = integrate_pwin_data2(combined_m20_df)
print(combined_m20_df)
combined_m20_df = map_dates_to_numbers(combined_m20_df)
print(combined_m20_df)
print('entering filter...')
combined_m20_df = filter_signals_table(combined_m20_df)
print(combined_m20_df)

# save this as signals_table.csv
create_and_save_signals_table(combined_m20_df)