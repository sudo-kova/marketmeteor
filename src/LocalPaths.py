import os
import platform

""""
I pull and store data locally on my Linux (artemis/Farm) machine daily.
This class is to organize paths for transfer.py 
    script prepares data pulled on artemis, to be
    cp'd to directories in marketmeteor and marketmeteor-data to prepare for git push 
    (data/portfolios and data/marketmeteors)
"""

class LocalPaths:
    def __init__(self):
        self.operating_system = platform.system()

        # base paths init
        self.base_path = self._set_base_path()
        self.tld_base_path = self._set_tld_base_path()

        # chartdata transfer
        self.chart_data_directory = os.path.join(self.base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08', 'chartdata2')
        # if self.operating_system == "Linux":
        #     chartdata2_basepath = '/incoming'
        # else:
        chartdata2_basepath = self.tld_base_path
        self.marketmeteor_data_chartdata2 = os.path.join(chartdata2_basepath, 'marketmeteor-data', 'chartdata2')

        # tickers.json transfer
        self.r08_directory = os.path.join(self.base_path, 'm20perf_L2016', 'charts', 'repo', 'm20', 'R08')
        self.marketmeteor_data_repository = os.path.join(self.tld_base_path, 'marketmeteor-data')

        # validated tickers txt file transfer
        self.validated_tickers_file = os.path.join(self.base_path, 'raw_stock_data', 'tickerlists', 'tickerlist_validated.txt')
        
        # path to update portfolio templates
        self.web_server_port_folio_directory = os.path.join(self.tld_base_path, 'collab', 'marketmeteor', 'data', 'portfolios')

        self.web_server_directory = os.path.join(self.tld_base_path, 'collab', 'marketmeteor', 'src', 'python')

    def _set_base_path(self):
        if self.operating_system == "Windows":
            return "X:\\Stockland"
        else:
            # Set the Linux base path here
            return "/media/share/Stockland"

    def _set_tld_base_path(self):
        if self.operating_system == "Windows":
            return "X:\\repositories"
        else:
            return "/media/share/repositories"

# Usage
# Farm = Farm()
# print(Farm.GSPC_data_csv)