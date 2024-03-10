# note that the inprogress last 63 days data was not removed

# run add_columns first
# ensure record column is concatenated here

import pandas as pd
import itertools
import numpy as np
from concurrent.futures import ProcessPoolExecutor
from tqdm import tqdm

# Load data
# file_path = 'combined_m20_data_colgen.csv'
file_path = '../../../data/signal_lists/combined_m20_data_colgen_wPwin.csv'

data = pd.read_csv(file_path)

# Define a function to apply filters and calculate the ratio
def evaluate_filters(filters, data):
    filtered_data = data[
        (data['Earnings Offset Closest'] >= filters[0]) &
        (data['Earnings Offset Closest'] <= filters[1]) &
        # (data['number_of_crossings'] <= filters[1]) &
        (data['average_duration'] <= filters[2]) &
        (data['total_days_below_threshold'] <= filters[3]) &
        (data['Pwin'] >= filters[4]) &
        (data['63d %'] >= filters[5]) &
        (data['daily delta'] >= filters[6])
        
        # (data['max_duration'] <= filters[3]) &
        # (data['min_duration'] >= filters[4]) &
    ]
    m20_pass_count = filtered_data['m20 pass'].count()
    m20_fail_count = filtered_data['m20 fail'].count()
    m20_total = m20_pass_count + m20_fail_count
    ratio = m20_pass_count / (m20_total) if m20_total != 0 else 'fail'
    
    # For ratio_ip calculation
    filtered_data_ip = filtered_data[pd.to_datetime(filtered_data['Date']) >= pd.to_datetime("11/30/2023")]
    m20_pass_count_ip = filtered_data_ip['m20 pass'].count()
    m20_fail_count_ip = filtered_data_ip['m20 fail'].count()
    m20_total_ip = m20_pass_count_ip + m20_fail_count_ip
    ratio_ip = m20_pass_count_ip / m20_total_ip if m20_total_ip != 0 else 'fail'

    filtered_data_pre_nov30 = filtered_data[pd.to_datetime(filtered_data['Date']) < pd.to_datetime("11/30/2023")]
    m20_pass_count_complete = filtered_data_pre_nov30['m20 pass'].count()
    m20_fail_count_complete = filtered_data_pre_nov30['m20 fail'].count()
    m20_total_complete = m20_pass_count_complete + m20_fail_count_complete
    ratio_complete = m20_pass_count_complete / m20_total_complete if m20_total_complete != 0 else 'fail'

    return m20_pass_count, m20_total, ratio, m20_pass_count_ip, m20_total_ip, ratio_ip, m20_pass_count_complete, m20_total_complete, ratio_complete 

# Define ranges for each filter
earnings_offset_range =[-63, -21, -14, -3, -2, -1, 0] # Example range
earnings_offset_range_upper =[1, 2, 3, 7, 14] # Example range

# number_of_crossings_range = [10,20,50,100,250,500,2000] # Example range
average_duration_range = [7,14,21,63,126,2000] # Example range
# max_duration_range = [20,63,126] # Example range
# min_duration_range = [7,21,63,126] # Example range
total_days_below_threshold_range = [7,21,63,126,2000] # Example range
record_range = [80,85,90,95,100] # Example range
meteor_range = [-.35,-.3,-.25,-.2]
daily_delta_range = [-0.3,-0.2,-0.1,-0.05]

# Generate all possible filter combinations
all_filters = list(itertools.product(
    earnings_offset_range,
    earnings_offset_range_upper,
    # number_of_crossings_range,
    average_duration_range,
    # max_duration_range,
    # min_duration_range,
    total_days_below_threshold_range,
    record_range,
    meteor_range,
    daily_delta_range
))

def process_filter_combination(filters):
    return filters, evaluate_filters(filters, data)

# Utilize 16 subprocesses
NRSUBPROCESSES = 16

# Create a ProcessPoolExecutor for parallel processing
with ProcessPoolExecutor(max_workers=NRSUBPROCESSES) as executor:
    # DataFrame to store the results
    results_df = pd.DataFrame(columns=['Earnings Offset >=', 'Earnings Offset Upper <=', 'Average Duration <=', 'Total Days Below Threshold <=', 'Daily Delta >=', 'Pwin >=', 'Meteor % >=', 'm20_pass_count', 'm20_total', 'Ratio'])

    # Initialize variables to track the best result
    best_ratio = 0
    best_filters = None

    # Iterate through filter combinations using tqdm for progress tracking
    for filters, (m20_pass_count, m20_total, ratio, m20_pass_count_ip, m20_total_ip, ratio_ip, m20_pass_count_complete, m20_total_complete, ratio_complete ) in tqdm(executor.map(process_filter_combination, all_filters), total=len(all_filters)):
        if ratio != "fail":
            # Append results to the DataFrame
            new_row = pd.DataFrame([{
                'Earnings Offset >=': filters[0],
                'Earnings Offset Upper <=': filters[1],
                # 'Number of Crossings': filters[1],
                'Average Duration <=': filters[2],
                # 'Max Duration': filters[3],
                # 'Min Duration': filters[4],
                'Total Days Below Threshold <=': filters[3],
                'Daily Delta >=': filters[6],
                'Pwin >=': filters[4],
                'Meteor % >=': filters[5],
                'm20_pass_count': m20_pass_count,
                'm20_total': m20_total,
                'Ratio': ratio,
                'm20_pass_count_ip': m20_pass_count_ip,
                'm20_total_ip': m20_total_ip,
                'Ratio_ip': ratio_ip,
                'm20_pass_count_complete': m20_pass_count_complete,
                'm20_total_complete': m20_total_complete,
                'Ratio_complete': ratio_complete
            }])
            results_df = pd.concat([results_df, new_row], ignore_index=True)
        
            if ratio > best_ratio:
                best_ratio = ratio
                best_filters = filters

    # Print the best filters and the corresponding ratio
    print(f"Best Filters: {best_filters}")
    print(f"Best Ratio: {best_ratio}")

    # Save the results to a CSV file
    results_df.to_csv('../../../data/PortSim/optimization/optimization_results4.csv', index=False)

    import matplotlib.pyplot as plt

    results_file_path = '../../../data/PortSim/optimization/optimization_results4.csv'

    # Reload the results DataFrame
    results_df = pd.read_csv(results_file_path)

    # Create a scatter plot
    plt.figure(figsize=(10, 6))
    plt.scatter(results_df['m20_total'], results_df['Ratio'], alpha=0.7)
    plt.xlabel('m20_total')
    plt.ylabel('Ratio')
    plt.title('Record vs Total Number of Signals')
    plt.grid(True)

    # Save the plot as a PNG file
    plt.savefig('../../../data/PortSim/optimization/m20_total_vs_ratio_scatter_plot4.png')
