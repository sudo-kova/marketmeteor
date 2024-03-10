"""
run this on artemis

data pulled on artemis, cp'd to directories in marketmeteor and marketmeteor-data to prepare for git push (data/portfolios and data/marketmeteors)
"""

import sys
import os
import shutil
from tqdm import tqdm
import subprocess

# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from LocalPaths import LocalPaths

farm = LocalPaths()

print('Beginning cp to marketmeteor-data')

def copy_directory_with_progress(src, dst):
    print(f'src: {src}')
    print(f'dst: {dst}')

    # if os.path.isdir(dst):
    #     shutil.rmtree(dst)

    # if not os.path.exists(dst):
    #     os.makedirs(dst)
    
    files = os.listdir(src)
    for f in tqdm(files, desc="[1] Copying R08 charddata2 folder"):
        # shutil.copy2(os.path.join(src, f), os.path.join(dst, f))
        shutil.copy(os.path.join(src, f), os.path.join(dst, f))

"""
cp to marketmeteor-data
    chartdata2/ from R08
    tickers.json
    tickerlist_validated.txt
    # watchlist.txt
"""

# cp all files from Farm.chart_data_directory to Farm.marketmeteor_data_chartdata2, overwrite
copy_directory_with_progress(farm.chart_data_directory, farm.marketmeteor_data_chartdata2)
# cp tickers.json file that is in the Farm.r08_directory to Farm.marketmeteor_data_repository

tickers_json_src = os.path.join(farm.r08_directory, 'tickers.json')
tickers_json_dst = os.path.join(farm.marketmeteor_data_repository, 'tickers.json')
shutil.copy(tickers_json_src, tickers_json_dst)
print('[2] copying tickers.json')

# cp Farm.validated_tickers_file which is the full path to a text file, to Farm.marketmeteor_data_repository
validated_tickers_dst = os.path.join(farm.marketmeteor_data_repository, os.path.basename(farm.validated_tickers_file))
shutil.copy(farm.validated_tickers_file, validated_tickers_dst)
print('[3] copying tickerlist_validated.txt')

"""
cp to web_server
    run get_portfolio.py for each template csv in the portfolio directory
        there is one command line argument that takes the name of the template

        use Farm.web_server_port_folio_directory for directory of portfolio template

        ex: Admin_1_template.csv ends with _template.csv. python get_portfolio.py Admin_1

    run m20tmrw.py 0 (0 - full, 1 - watchlist only)
    run live_data_single.py
"""

print('Beginning cp to web_server')

print('[4] updating portfolios') # -- good on linux
# Run get_portfolio.py for each template CSV in the portfolio directory
portfolio_templates = [f for f in os.listdir(farm.web_server_port_folio_directory) if f.endswith('_template.csv')]
for template in portfolio_templates:
    template_name = template.rsplit('_template.csv', 1)[0]
    subprocess.run(['python', 'get_portfolio.py', template_name], cwd=farm.web_server_directory)

print('[5] calculating m20tmrw prices')
# Run m20tmrw.py 0 (0 - full, 1 - watchlist only)
subprocess.run(['python', 'm20tmrw.py', '0'], cwd=farm.web_server_directory)

print('[6] downloading last prices')
# Run live_data_single.py
subprocess.run(['python', 'live_data_single.py'], cwd=farm.web_server_directory)