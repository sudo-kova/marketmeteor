import os
import platform

""""
Window and Linux (digital ocean droplet) paths to all things on the Farm!

EX: Farm.chart_data_directory
"""

class Farm:
    def __init__(self):
        self.operating_system = platform.system()

        # base paths init
        self.base_path = self._set_base_path()
        self.tld_base_path = self._set_tld_base_path()

        # data directories
        self.daily_data_directory = os.path.join(self.base_path, 'raw_stock_data', 'daily_data')
        
        self.chart_data_directory = os.path.join(self.base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata2')
        self.chart_data_directory_droplet = os.path.join('/incoming', 'marketmeteor-data', 'chartdata2')
        
        self.r08_directory = os.path.join(self.base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08')
        self.validated_tickers_file = os.path.join(self.base_path, 'raw_stock_data', 'tickerlists', 'tickerlist_validated.txt')
        
        # Set one_minute_directory with a specific base path for Linux
        if self.operating_system == "Linux":
            one_minute_base_path = '../../data/raw/minute'
        else:
            one_minute_base_path = self.tld_base_path
        self.one_minute_directory = os.path.join(one_minute_base_path, 'marketmeteor-data', 'one_minute_data')

        # data files
        self.GSPC_data_csv = os.path.join(self.daily_data_directory, '^GSPC.csv')
        self.GSPC_data_csv_droplet = os.path.join(self.chart_data_directory_droplet, '^GSPC.csv')

        # output files
            # get_portfolio.py
        self.portfolio_template_csv = os.path.join(self.tld_base_path, 'marketmeteor', 'web_server', 'portfolio_template.csv')
        self.portfolio_csv = os.path.join(self.tld_base_path, 'marketmeteor', 'web_server', 'portfolio.csv')

        self.web_server_directory = os.path.join(self.tld_base_path, 'marketmeteor', 'web_server')


        self.web_server_port_folio_directory = "../../data/portfolios"

        self.marketmeteor_data_repository = os.path.join(self.tld_base_path, 'marketmeteor-data')

        if self.operating_system == "Linux":
            chartdata2_basepath = '/incoming'
        else:
            chartdata2_basepath = self.tld_base_path
        self.marketmeteor_data_chartdata2 = os.path.join(chartdata2_basepath, 'marketmeteor-data', 'chartdata2')

    def _set_base_path(self):
        if self.operating_system == "Windows":
            return "X:\\Stockland"
        else:
            # Set the Linux base path here
            return "/path/to/Stockland/on/Linux"

    def _set_tld_base_path(self):
        if self.operating_system == "Windows":
            return "X:\\repositories"
        else:
            # Set the Linux TLD base path here
            return "/" # on linux marketmeteor is the base folder

            # /marketmeteor
            # /incoming/marketmeteor-data

# Usage
# Farm = Farm()
# print(Farm.GSPC_data_csv)