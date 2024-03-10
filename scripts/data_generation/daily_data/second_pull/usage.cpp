#include "yfapi.hpp"
#include "cstdio"
#include "ctime"
#include <string>
#include <iostream>
#include <fstream>
#include <list>
#include <iterator>
#include <algorithm>
#include <vector>
#include <unistd.h>  // for Unix-based systems

using namespace std;

int main(int argc, char *argv[])
{
    yfapi::YahooFinanceAPI api;
    // datatable::DataTable dt = api.get_ticker_data("spy", "2020-09-01", "2020-10-06");
    // // datetime not supported in DataTables (https://github.com/anthonymorast/DataTables/issues/5)
    // dt.drop_columns(new string[1]{"Date"}, 1);
    // dt.print_shape(cout);
    // dt.print_headers(cout);

    // Read in ticker list from .txt ////
    std::string line;
    // std::string tickerlistpath = "/home/stockland/Documents/raw_stock_data/tickerlists/";
    std::string tickerlistpath =  "/media/share/Stockland/raw_stock_data/tickerlists/";
    // /run/user/1000/gvfs/smb-share:server=192.168.1.29,share=farm

    std::vector<std::string> tickers;
    // ifstream f(tickerlistpath + "composite_ticker_list_linux.txt"); // text file pasted into nano for linux formatting
    ifstream f(tickerlistpath + "tickerlist_tryagain.txt");
    while(std::getline(f,line))
    {
        tickers.push_back(line);
    }


    // single ticker
    // std::vector<std::string> tickers;
    // tickers.push_back("MRNA");

    // get current day as char array
    time_t curr_time;
    tm *curr_tm;
    char date_string[100];
    time(&curr_time);
    curr_tm = localtime(&curr_time);
    strftime(date_string, 50, "%Y-%m-%d", curr_tm);

    // supply future date (yahoo fixed leap year and returns data for 1 less day than input)

    // download data to file for ticker in tickers
    for (int i = 0; i < tickers.size(); i++)
    {
        // std::cout << tickers[i] << std::endl;
        // api.download_ticker_data(tickers[i], "2018-01-01", date_string);
        // api.download_ticker_data(tickers[i], "2014-01-01", "2025-01-01", "/home/stockland/Documents/raw_stock_data/daily_data/");
        api.download_ticker_data(tickers[i], "2014-01-01", "2025-01-01", "/media/share/Stockland/raw_stock_data/daily_data/");

        // sleep(1); // Sleep for 1 second

    }

    // api.download_ticker_data("qqq", "1900-01-01", "2022-12-02");

    return 0;
}
