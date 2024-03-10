# if you are working on a samba share on linux, you may have permission errors
# shell script will have permissions to perform copy actions
# sudo chmod +x transfer.sh

#!/bin/bash

# Function to echo in green
echo_green() {
    echo -e "\033[0;32m$1\033[0m"
}

# # Check if the script is run with sufficient privileges
# if [ "$(id -u)" != "0" ]; then
#     echo "This script must be run as root or with sudo privileges."
#     exit 1
# fi

echo_green "Phase 1: cp to marketmeteor-data"

# [1] Copying R08 chartdata2 folder
echo_green "[1] Copying R08 chartdata2 folder"
# copy the contents of the source chartdata2 directly into the destination chartdata2 (and not create an additional nested directory)
cp -rf /media/share/Stockland/m20perf_L2016/charts/repo/m20/R08/chartdata2/* /media/share/repositories/marketmeteor-data/chartdata2/

# [2] copying tickers.json
echo_green "[2] Copying tickers.json"
cp /media/share/Stockland/m20perf_L2016/charts/repo/m20/R08/tickers.json /media/share/repositories/marketmeteor-data/tickers.json

# [3] copying tickerlist_validated.txt
echo_green "[3] Copying tickerlist_validated.txt"
cp /media/share/Stockland/raw_stock_data/tickerlists/tickerlist_validated.txt /media/share/repositories/marketmeteor-data/tickerlist_validated.txt
cp /media/share/Stockland/raw_stock_data/tickerlists/tickerlist_validated.txt /media/share/repositories/collab/marketmeteor/data/tickerlists/tickerlist_validated.txt

echo_green "Phase 2: update portfolios"
python transfer.py

echo_green "Phase 3: copy earnings"
cp -rf /media/share/Stockland/earnings/splice/* /media/share/repositories/collab/marketmeteor/data/earnings/splice/
cp /media/share/Stockland/earnings/earnings_parsed_full.csv /media/share/repositories/collab/marketmeteor/data/earnings/earnings_parsed_full.csv

echo_green "Phase 4: copy raw stock data"
cp -rf /media/share/Stockland/raw_stock_data/daily_data/* /media/share/repositories/collab/marketmeteor/data/raw/daily/