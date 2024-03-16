"""
Open sweep/Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35.csv. 
Split the set into two chunks where date_number_buy is >2495
Get length of the first chunk.

Open sweep/Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35/start10000/summary.csv
Use all rows when including last 63 days to calculate,
Total Portfolio Scenarios: length of the entire file
Percentage > GSPC: number of rows whose 'Total Return' > 'GSPC'
Percentage > CD: number of rows whose 'Total Return' > 'CD'
Percentage of Positive Portfolios: : number of rows wose 'Total Return' > 0

Use first chunk only when not including last 63 days to calculate,
Total Portfolio Scenarios:
Percentage > GSPC
Percentage > CD
Percentage of Positive Portfolios

minimum portfolio return (use Total Return)
maximum portfolio return (use Total Return)
minimum GSPC return (use GSPC)
maximum GSPC return (use GSPC)

summary.csv:

Start,Total Return,Beta,Alpha,Standard Deviation,Sharpe Ratio,Information Ratio,average_risk_free_rate,GSPC,CD,Sinkhole,Buy Count
5118,7.65431823585192,0.2899853284985574,0.1005328992156453,5.056129304517671,0.0244338247357877,0.0198074507862239,0.0002299331103678,34.42152596874664,7.100014588241965,"['AAP', 'VIAV', 'DVN', 'NTCT', 'GMED', 'PFE', 'WNS', 'CBRL', 'IPG', 'IRDM', 'MPW', 'NYCB', 'FNV', 'ELP', 'LEG', 'ABM', 'ADM']",103
3844,55.90771836731998,0.1719926389620752,0.1673633194038424,3.9802518751626415,0.0454031468219456,0.0412619707433404,0.0002304469273743,40.84649213717222,8.579399632784913,"['BXMT', 'DVN', 'AAP', 'FIBK', 'GMED', 'NTCT', 'PFE', 'CBRL', 'NUS', 'TR', 'IPG', 'IRDM', 'MTZ', 'NEP', 'MPW', 'ALK', 'NYCB', 'FNV', 'KW', 'ELP', 'COLB', 'HUM', 'ABM', 'ADM', 'CCJ']",185
3833,36.41845206138685,-0.0469051603329694,0.1670314486805107,4.347836160429222,0.0375796057202663,0.0374043976461979,0.0002304469273743,40.84649213717222,8.579399632784913,"['AAP', 'DVN', 'GMED', 'PFE', 'HALO', 'IPG', 'TR', 'FMC', 'CBRL', 'IRDM', 'NEP', 'MTZ', 'CPB', 'NYCB', 'KW', 'NTCT', 'ELP', 'COLB', 'ABM', 'ADM']",163
3469,17.680553256844433,0.2148124234418666,0.0597814250008464,3.2521396922395973,0.0227579338129556,0.0179286949121351,0.0002279005524861,35.54551588475119,8.579399632784913,"['AAP', 'DVN', 'GMED', 'NTCT', 'PFE', 'CBRL', 'NUS', 'IPG', 'DG', 'IRDM', 'MTZ', 'NEP', 'MPW', 'ALK', 'NYCB', 'ELP', 'COLB', 'ADM', 'ABM', 'CCJ', 'BOH', 'LEG']",173

"""

import pandas as pd
from pprint import pprint


base_paths = [
    # "sweep/fullset_Pwin90plus/start10000/",
    # "sweep/Pwin90plus_greaterthan50closestabove/start10000/",
    # "sweep/Pwin90plus_earnings_0_to_49/start10000/",
    # "sweep/Pwin90plus_earnings_neg10_to_9/start10000/",
    # "sweep/Pwin90plus_earnings_neg63to7_avrgdurationLT21_GTnegpt3dd_mmGTnegpt25/start10000/",
    # "sweep/Pwin80plus_earnings_neg63to14_avrgdurationLT7_GTnegpt5dd_mmGTnegpt35/start10000/",
    # "sweep/Unique_Pwin80plus_earnings_neg63to14_avrgdurationLT7_GTnegpt5dd_mmGTnegpt35/start10000/",
    # "sweep/Unique_Pwin80plus_earnings_neg63to14_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35/start10000/",
    "sweep/Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35/start10000/",
    "sweep/dads_filter/start10000/",
    "sweep/dads_filter_80/start10000/"
]

# base_paths = ["../../../data/PortSim/" + base_path for i in base_paths]

text_names = [
    # "Pwin >= 90",
    # "Pwin >= 90 and closest above >-50",
    # "Pwin >= 90 and earnings [0,50)",
    # "Pwin >= 90 and earnings [-10,10)",
    # "Pwin >= 90 and earnings [-63,7), average duration <=21, daily delta >= -0.3, 63 d% >= -0.25",
    # "Pwin >= 80 and earnings [-63,14), average duration <=7, daily delta >= -0.05, 63 d% >= -0.35, <126 days below threshold",
    # "UNIQUE POSITIONS Pwin >= 80 and earnings [-63,14), average duration <=7, daily delta >= -0.05, 63 d% >= -0.36, <126 days below threshold",
    # "UNIQUE POSITIONS Pwin >= 80 and earnings [-63,14), average duration <=21, daily delta >= -0.05, 63 d% >= -0.36, <126 days below threshold",
    # "UNIQUE POSITIONS Pwin >= 80 and earnings [-63,40), average duration <=21, daily delta >= -0.05, 63 d% >= -0.36, <126 days below threshold",
    "UNIQUE POSITIONS Pwin >= 80 and earnings [-63,40), average duration <=21, daily delta >= -0.05, 63 d% >= -0.36, <126 days below threshold",
    "dads filter",
    "dads filter 80",
    "dads filter earn"
]

combined_all_df = pd.DataFrame()

for base_path, text_name in zip(base_paths, text_names):
    # base_path = "sweep/Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35/start10000/"
    # text_name = "UNIQUE POSITIONS Pwin >= 80 and earnings [-63,40), average duration <=21, daily delta >= -0.05, 63 d% >= -0.36, <126 days below threshold"]

    # fn1 = 'sweep/Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35.csv'
    fn1_directory = base_path.split('/')[1]  # Gets 'Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35'
    fn1 = "../../../data/signal_lists/portfolio_simulation/" + fn1_directory + '.csv'
    fn2 = 'summary.csv'
    outputnm = base_path.split('/')[1]

    signals_df = pd.read_csv(fn1)
    summary_df = pd.read_csv("../../../data/PortSim/" + base_path + fn2)

    first_chunk = signals_df[signals_df['date_number_buy'] <= 2495]
    second_chunk = signals_df[signals_df['date_number_buy'] > 2495]
    length_first_chunk = len(first_chunk)

    summary_stats = {}
    total_portfolios_all = len(summary_df)
    summary_stats["Total Portfolio Scenarios"] = len(summary_df)
    summary_stats['Percentage > GSPC'] = len(summary_df[summary_df['Total Return'] > summary_df['GSPC']]) / total_portfolios_all * 100
    summary_stats['Percentage > CD'] = len(summary_df[summary_df['Total Return'] > summary_df['CD']]) / total_portfolios_all * 100
    summary_stats['Percentage > 0'] = len(summary_df[summary_df['Total Return'] > 0]) / total_portfolios_all * 100
    summary_stats['min portfolio return'] = summary_df['Total Return'].min()
    summary_stats['max portfolio return'] = summary_df['Total Return'].max()
    summary_stats['min GSPC return'] = summary_df['GSPC'].min()
    summary_stats['max GSPC return'] = summary_df['GSPC'].max()

    filtered_stats = {}
    filtered_summary_df = summary_df[summary_df['Start'] < length_first_chunk]
    total_portfolios_filtered = len(filtered_summary_df)
    filtered_stats["Total Portfolio Scenarios (-63d)"] = total_portfolios_filtered
    filtered_stats['Percentage > GSPC (-63d)'] = len(filtered_summary_df[filtered_summary_df['Total Return'] > filtered_summary_df['GSPC']]) / total_portfolios_filtered * 100
    filtered_stats['Percentage > CD (-63d)'] = len(filtered_summary_df[filtered_summary_df['Total Return'] > filtered_summary_df['CD']]) / total_portfolios_filtered * 100
    filtered_stats['Percentage > 0 (-63d)'] = len(filtered_summary_df[filtered_summary_df['Total Return'] > 0]) / total_portfolios_filtered * 100
    filtered_stats['min portfolio return (-63d)'] = filtered_summary_df['Total Return'].min()
    filtered_stats['max portfolio return (-63d)'] = filtered_summary_df['Total Return'].max()
    filtered_stats['min GSPC return (-63d)'] = filtered_summary_df['GSPC'].min()
    filtered_stats['max GSPC return (-63d)'] = filtered_summary_df['GSPC'].max()

    combined_stats_df = pd.DataFrame([summary_stats, filtered_stats])
    combined_stats_df.insert(0, 'Base Path', base_path)

    # Combine rows by filling in missing values from the second row
    combined_row = combined_stats_df.iloc[0].combine_first(combined_stats_df.iloc[1])
    # Convert the combined row to a DataFrame
    combined_df = pd.DataFrame([combined_row])

    # Add 'text_name' as the first column
    combined_df.insert(0, 'Scenario', text_name)

    combined_all_df = pd.concat([combined_all_df, combined_df])

combined_all_df.to_csv(f'../../../data/Portsim/PortSimSummariesPy2.csv', index = False)