"""
Stitch - stitches columns of csvs together.

    Read the gainers_prices.csv file into a DataFrame.
    Read the locations.csv file into a DataFrame without headers and assign appropriate column names.
    Merge the two DataFrames on the 'Ticker' column.
    Print the current directory where the script is running.
    Write the result to a new CSV file.

"""

import pandas as pd
import os

# Print the current working directory
print("Current working directory:", os.getcwd())

# Read the first CSV into a DataFrame
gainers_prices_df = pd.read_csv('../../../data/marketmeteors/gainers_prices.csv')

# Read the second CSV into another DataFrame, assigning column names since there are no headers
columns = ['Ticker', 'Address', 'City', 'State', 'Country', 'Website', 'Sector', 'Industry', 'Description', 'Latitude', 'Longitude']
locations_df = pd.read_csv('../../../data/sectors/locations.csv', names=columns)

# Merge the DataFrames on the 'Ticker' column for locations
stitched_df = pd.merge(gainers_prices_df, locations_df[['Ticker', 'City', 'State']], on='Ticker', how='left')

# Read the third CSV for the 'Close' column
m20tmrw_prices_df = pd.read_csv('../../../data/marketmeteors/m20tmrw_prices.csv')

# Merge the 'Close' column into the stitched DataFrame
stitched_df = pd.merge(stitched_df, m20tmrw_prices_df[['Ticker', 'Close']], on='Ticker', how='left')

# Calculate the 'live1d' column and add it to the stitched DataFrame
stitched_df['live1d'] = (stitched_df['Current Price'] / stitched_df['Close'] - 1) * 100

# Write the final merged DataFrame to a new CSV file
stitched_df.to_csv('../../../data/sectors/stitched.csv', index=False)