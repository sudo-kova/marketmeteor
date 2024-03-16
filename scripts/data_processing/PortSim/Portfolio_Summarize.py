"""
sweep/fullset_Pwin90plus/start10000/

This folder contains folders from date0 to date6228

In each of those folders there is a file:
ex: key_metrics_start10000_date6180.csv

its contents:
start10000_date6180,Value
Total Return,-13.815900629999977
Beta,-0.353671757852622
Alpha,-0.8997128863364943
Standard Deviation,5.262292856928307
Sharpe Ratio,-0.17943179907320855
Information Ratio,-0.17377050568678074
average_risk_free_rate,0.000327380952380956

create a summary of all these files

with the first column being the filename and then the following columns being Total Return, Beta, Alpha, Standard Deviation,
Sharpe Ratio, Information Ratio, average_risk_free_rate

"""

import os
import pandas as pd

# base_path = "sweep/fullset_Pwin90plus/start10000/"
# base_path = "sweep/Pwin90plus_greaterthan50closestabove/start10000/"
# base_path = "sweep/Pwin90plus_earnings_0_to_49/start10000/"
# base_path = "sweep/Pwin90plus_earnings_neg10_to_9/start10000/"
# base_path = "sweep/Pwin90plus_earnings_neg63to7_avrgdurationLT21_GTnegpt3dd_mmGTnegpt25/start10000/"
# base_path = "sweep/Pwin80plus_earnings_neg63to14_avrgdurationLT7_GTnegpt5dd_mmGTnegpt35/start10000/"
# base_path = "sweep/Unique_Pwin80plus_earnings_neg63to14_avrgdurationLT7_GTnegpt5dd_mmGTnegpt35/start10000/"
# base_path = "sweep/Unique_Pwin80plus_earnings_neg63to14_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35/start10000/"
# base_path = "sweep/Unique_Pwin80plus_earnings_neg63to40_avrgdurationLT21_GTnegpt5dd_mmGTnegpt35/start10000/"
# base_path = "sweep/dads_filter/start10000/"
base_path = "sweep/dads_filter_80/start10000/"

base_path = "../../../data/PortSim/" + base_path
summary_data = []

# Define the metrics columns
metrics_columns = ['Total Return', 'Beta', 'Alpha', 'Standard Deviation',
                   'Sharpe Ratio', 'Information Ratio', 'average_risk_free_rate', 'GSPC', 'CD']

# Loop through each subfolder and file
for folder_name in os.listdir(base_path):
    folder_path = os.path.join(base_path, folder_name)
    if os.path.isdir(folder_path):
        for file_name in os.listdir(folder_path):
            if file_name.startswith("key_metrics_start10000_date") and file_name.endswith(".csv"):
                file_path = os.path.join(folder_path, file_name)
                # Read the CSV file, skipping the header
                df = pd.read_csv(file_path, header=None, skiprows=1, names=['Metric', 'Value'])
                # Create a dictionary to store the file's metrics
                # Extract the date number from the file name
                date_number = file_name.split('_')[-1].split('.')[0].replace("date","")  # Extract '546' from 'key_metrics_start10000_date546.csv'
                metrics = {metric: df[df['Metric'] == metric]['Value'].values[0]
                           for metric in metrics_columns}
                metrics['Start'] = date_number  
                # summary_data.append(metrics)

                # Process portsim.csv file for the same folder
                portsim_path = os.path.join(folder_path, 'portsim.csv')
                if os.path.exists(portsim_path):
                    df_portsim = pd.read_csv(portsim_path)
                    sinkhole_list = df_portsim.loc[(df_portsim['sell_date'].isna()) & (df_portsim['action'] == 'buy'), 'ticker'].tolist()
                    buy_count = df_portsim[df_portsim['action'] == 'buy'].shape[0]
                    metrics['Sinkhole'] = sinkhole_list
                    metrics['Buy Count'] = buy_count
                else:
                    metrics['Sinkhole'] = []
                    metrics['Buy Count'] = 0

                summary_data.append(metrics)

# Create a DataFrame from the summary data
summary_df = pd.DataFrame(summary_data)

# Reorder columns to have Filename first
column_order = ['Start'] + metrics_columns + ['Sinkhole', 'Buy Count']
summary_df = summary_df[column_order]

# Save the summary to a CSV file
summary_df.to_csv(os.path.join(base_path, "summary.csv"), index=False)
