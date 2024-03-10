# ORIGINAL VERSION: 00 16 * * 1-5 /media/share/Stockland/cplusplus/run.sh

# tickerlist textfile might need to be put to LF instead of CRLF format

# pull data
/media/share/Stockland/get_raw_stock_data/yfi2

# pause for 10 min
sleep 30m

# validate data to create try again ticker list
/media/share/Stockland/validate_data/usage

# pull data attempt 2
/media/share/Stockland/get_raw_stock_data/second_pull/yfitryagain

# final validation to get full composite list for the day 
/media/share/Stockland/validate_data/usage

# tickerlist_validated.txt is created
# # copy into relevant directories
cp /media/share/Stockland/raw_stock_data/tickerlists/tickerlist_validated.txt /media/share/Stockland/m20_workflow/tickerlist_full.txt
