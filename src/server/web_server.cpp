// standard
#include <iostream>
#include <fstream>
#include <sstream>

#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>

#include <cstring>
#include <string>
#include <map>
#include <vector>
#include <cstdlib> // For system()

#include <filesystem>
#include <iomanip>
#include <chrono>
#include <regex>
#include <algorithm>  // For std::transform
#include <cctype>     // For std::toupper

// third party
#include "json.hpp"

// namespaces
namespace fs = std::filesystem;
using json = nlohmann::json;

/**
 * Stockland Web Server
 * 
 * handle basic web requests and serve data from CSV files as JSON.
 * port 9000 with following endpoints:
 * 
 * 1. Root (`/`):
 *    - Serves the main HTML page located at "www/index.html".
 * 
 * 2. Tickers JSON (`/tickers.json`):
 *    - Serves a JSON file located at "/media/share/Stockland/m20perf_L2016/charts/repo/m20/R08/tickers.json".
 *    - This file contains a list of tickers displayed in the "ticker tape".
 * 
 * 3. Chart Data (`/chartdata/{ticker}`):
 *    - Serves specific ticker data as a CSV file from the directory "/media/share/Stockland/m20perf_L2016/charts/repo/m20/R08/chartdata2/".
 *    - `{ticker}` is a placeholder for the ticker symbol.
 * 
 * 4. Sectors Data (`/sectors-data`):
 *    - Reads data from a CSV file at "/media/share/Stockland/m20perf_L2016/charts/repo/m20/R08/sectors.csv".
 *    - Converts the CSV data to JSON format and serves it.
 *    - This endpoint uses nlohmann/json library for JSON conversion.
 * 
 * 5. M20 Watchlist Data (`/get-m20-data`):
 *    - Concatenates and serves two files: m20_file and stock_file
 *    - Initial load pulls the current price (live_data_single.py) and loads the table
 *    - "Manual Fetch and Display Data" button runs the same script and updates the table
 *
 * 6. Rollback Data (`/process-date`)
 *    - rollback (historic): /process-date, 
 *    - chartdata (rollback): /rollback_chartdata/ (exactly like chartdata but from the rollback_chartdata folder instead)
 *
 * if file exists, header is added with last-modified date
 *
 * Dependencies: nlohmann/json (for JSON handling)

 * need to implement
 * task status: /task-status
 * m20 watchlist (live): /get-m20-data SOCKET (maybe not needed)
 */

void writeDataToCsv(const std::string& filename, const json& data, bool allowOverride = false) {

    // Check if the file already exists, only if override is not allowed
    if (!allowOverride) {
        std::ifstream fileExists(filename);
        if (fileExists.good()) {
            std::cerr << "File already exists: " << filename << ". Aborting to prevent overwrite." << std::endl;
            return;
        }
    }

    std::ofstream csvFile(filename);

    if (!csvFile.is_open()) {
        std::cerr << "Failed to open file for writing: " << filename << std::endl;
        return;
    }

    for (const auto& row : data) {
        bool firstCell = true;
        for (const auto& cell : row) {
            if (!firstCell) {
                csvFile << ",";
            }
            csvFile << cell.get<std::string>();  // Assuming each cell is a string
            firstCell = false;
        }
        csvFile << "\n";
    }

    csvFile.close();
    std::cout << "Data successfully written to " << filename << std::endl;
}

bool tokenIsValid(const std::string& token, const std::string& authToken) {
    return token.find(authToken) != std::string::npos;
}

bool partialTokenMatch(const std::string& token1, const std::string& token2) {
    const size_t lengthToCompare = 100; // Number of characters to compare

    if (token1.length() < lengthToCompare || token2.length() < lengthToCompare) {
        return false; // If either token is shorter than 100 characters, don't match
    }

    // Compare the last 100 characters of each token
    return token1.substr(token1.length() - lengthToCompare) == token2.substr(token2.length() - lengthToCompare);
}


// Function to extract the token from the request
std::string extractToken(const std::string& request) {
    std::string token;
    // Extract the token from the Authorization header
    // Simplified example; in real code, you'd need to parse the headers properly
    size_t startPos = request.find("Authorization: Bearer ");
    if (startPos != std::string::npos) {
        startPos += std::string("Authorization: Bearer ").length();
        size_t endPos = request.find("\r\n", startPos);
        token = request.substr(startPos, endPos - startPos);
    }
    return token;
}

// Function to read the JSON file
json readJsonFile(const std::string& filePath) {
    std::ifstream file(filePath);
    json j;
    if (file.is_open()) {
        file >> j;
    }
    return j;
}

// Function to write to the JSON file
void writeJsonFile(const std::string& filePath, const json& j) {
    std::ofstream file(filePath);
    if (file.is_open()) {
        file << j.dump(4); // Pretty print with 4 spaces indentation
    }
}

void printGreen(const std::string& message) {
    // ANSI escape code for green text is "\033[32m"
    // Reset color is "\033[0m"
    std::cout << "\033[32m" << message << "\033[0m" << std::endl;
}

std::string urlDecode(const std::string& encoded) {
    std::string result;
    result.reserve(encoded.size());

    for (std::size_t i = 0; i < encoded.size(); ++i) {
        if (encoded[i] == '%' && i + 2 < encoded.size()) {
            std::string hex = encoded.substr(i + 1, 2);
            std::istringstream hex_stream(hex);
            int hex_value;
            hex_stream >> std::hex >> hex_value;
            result += static_cast<char>(hex_value);
            i += 2; // Skip the next two characters
        } else if (encoded[i] == '+') {
            result += ' '; // Convert + to space
        } else {
            result += encoded[i]; // Copy the character directly
        }
    }

    return result;
}

std::string urlDecode_carrot(const std::string &encoded) {
    std::string decoded;
    decoded.reserve(encoded.length());

    for (std::size_t i = 0; i < encoded.size(); ++i) {
        if (encoded[i] == '%' && i + 2 < encoded.size()) {
            std::string hexValue = encoded.substr(i + 1, 2);
            decoded += static_cast<char>(std::stoi(hexValue, nullptr, 16));
            i += 2; // Skip next two characters
        } else if (encoded[i] == '+') {
            decoded += ' ';
        } else {
            decoded += encoded[i];
        }
    }

    return decoded;
}

std::string getLastModifiedTime(const std::string& filePath) {
    namespace fs = std::filesystem;

    std::cout << "Getting last modified time for file: " << filePath << std::endl;

    auto ftime = fs::last_write_time(filePath);
    auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(ftime - fs::file_time_type::clock::now() + std::chrono::system_clock::now());
    std::time_t lastModifiedTime = std::chrono::system_clock::to_time_t(sctp);

    // Convert time_t to tm as local time
    std::tm tm = *std::localtime(&lastModifiedTime);

    // Format the time in a RFC1123 format
    std::ostringstream oss;
    oss << std::put_time(&tm, "%a, %d %b %Y %H:%M:%S GMT"); // Note: GMT in format string is now misleading
    std::string formattedTime = oss.str();

    std::cout << "Last Modified Time: " << formattedTime << std::endl;

    return formattedTime;
}


std::vector<std::map<std::string, std::string>> mergeData(
    const std::vector<std::vector<std::string>>& stockData,
    const std::vector<std::vector<std::string>>& m20Data) {

    std::vector<std::map<std::string, std::string>> mergedData;
    std::map<std::string, std::map<std::string, std::string>> tickerMap;

    // Assuming the first row of each CSV contains headers
    std::vector<std::string> stockHeaders = stockData.front();
    std::vector<std::string> m20Headers = m20Data.front();

    // Process stockData
    for (size_t i = 1; i < stockData.size(); ++i) {
        std::map<std::string, std::string> rowMap;
        for (size_t j = 0; j < stockData[i].size() && j < stockHeaders.size(); ++j) {
            rowMap[stockHeaders[j]] = stockData[i][j];
        }
        tickerMap[rowMap["Ticker"]] = rowMap; // Assuming "Ticker" is the key
    }

    // Merge with m20Data
    for (size_t i = 1; i < m20Data.size(); ++i) {
        std::map<std::string, std::string> rowMap;
        for (size_t j = 0; j < m20Data[i].size() && j < m20Headers.size(); ++j) {
            rowMap[m20Headers[j]] = m20Data[i][j];
        }
        // Merge data based on Ticker
        if (tickerMap.find(rowMap["Ticker"]) != tickerMap.end()) {
            for (const auto& kv : rowMap) {
                tickerMap[rowMap["Ticker"]][kv.first] = kv.second;
            }
        }
    }

    // Convert map to vector for JSON conversion
    for (const auto& kv : tickerMap) {
        mergedData.push_back(kv.second);
    }

    if (!mergedData.empty()) {
        std::cout << "Sample merged data:" << std::endl;
        for (const auto& field : mergedData.front()) {
            std::cout << field.first << ": " << field.second << "; ";
        }
        std::cout << std::endl;
    }


    return mergedData;
}


std::vector<std::vector<std::string>> readCsv(const std::string &filePath) {
    std::vector<std::vector<std::string>> data;
    std::ifstream file(filePath);
    std::string line;

    while (std::getline(file, line)) {
        std::vector<std::string> row;
        std::string cell;
        bool inQuotes = false;
        char lastChar = 0;

        for (char c : line) {
            if ((c == ',' || c == '\t') && !inQuotes) {
                row.push_back(cell); 
                cell.clear(); 
            } else if (c == '\"' && lastChar != '\\') {
                inQuotes = !inQuotes;
            } else {
                cell += c; 
            }
            lastChar = c;
        }
        row.push_back(cell); 
        data.push_back(row);
    }

    // debug first and last 10 rows

    // if (!data.empty()) {
    //     // Print the first 10 rows
    //     for (size_t i = 0; i < data.size() && i < 10; ++i) {
    //         std::cout << "Row " << i + 1 << ": ";
    //         for (const auto& field : data[i]) {
    //             std::cout << "\"" << field << "\" ";
    //         }
    //         std::cout << std::endl;
    //     }

    //     std::cout << "Last 10 rows in CSV:" << std::endl;
    //     size_t start = data.size() > 10 ? data.size() - 10 : 0;
    //     for (size_t i = start; i < data.size(); ++i) {
    //         std::cout << "Row " << i + 1 << ": ";
    //         for (const auto& field : data[i]) {
    //             std::cout << "\"" << field << "\" ";
    //         }
    //         std::cout << std::endl;
    //     }
    // }

    return data;
}

nlohmann::json csvToJson(const std::vector<std::vector<std::string>>& csvData) {
    nlohmann::json json = nlohmann::json::array();
    std::vector<std::string> headers = csvData.front(); // First row as headers

    for (size_t i = 1; i < csvData.size(); ++i) {
        nlohmann::json jsonObj;
        for (size_t j = 0; j < csvData[i].size() && j < headers.size(); ++j) {
            jsonObj[headers[j]] = csvData[i][j];
        }
        json.push_back(jsonObj);
    }

    return json;
}

std::string readFile(const std::string &filePath) {
    std::ifstream file(filePath);
    std::stringstream buffer;

    if (file) {
        buffer << file.rdbuf();
        file.close();
        return buffer.str();
    } else {
        return "<h1>404 Not Found</h1>";
    }
}

std::string getFilePath(const std::string &request) {
    std::istringstream requestStream(request);
    std::string method;
    std::string path;
    requestStream >> method >> path;

    if (path == "/") {
        return "www/index.html";
    } else if (path == "/api/tickers.json") {
        return "/incoming/marketmeteor-data/tickers.json";
    } else if (path.find("/api/chartdata/") == 0) {

        // usage: fetch(`/api/chartdata/${ticker}.csv`)

        // Extract ticker name and construct CSV file path
        // std::string ticker = path.substr(std::string("/api/chartdata/").length());
        std::string ticker = urlDecode_carrot(path.substr(std::string("/api/chartdata/").length()));

        // Capitalize ticker only and not extension
        // Find the position of the dot (.)
        size_t dotPos = ticker.find('.');
        if (dotPos != std::string::npos) {
            // Capitalize only the part before the dot
            for (size_t i = 0; i < dotPos; ++i) {
                ticker[i] = std::toupper(ticker[i]);
            }
        }

        return "/incoming/marketmeteor-data/chartdata2/" + ticker;
        // return "/marketmeteor/web_server/dataset/chartdata2/" + ticker;
    } else if (path.find("/api/one_minute_chartdata/") == 0) {

        // usage: fetch(`/api/chartdata/${ticker}`)

        // std::string ticker = path.substr(std::string("/api/one_minute_chartdata/").length());
        // size_t dotPos = ticker.find('.');
        // if (dotPos != std::string::npos) {
        //     for (size_t i = 0; i < dotPos; ++i) {
        //         ticker[i] = std::toupper(ticker[i]);
        //     }
        // }

        std::string ticker = path.substr(std::string("/api/one_minute_chartdata/").length());
        std::transform(ticker.begin(), ticker.end(), ticker.begin(), 
                    [](unsigned char c) { return std::toupper(c); });

        // download one minute data for specified stock
        std::system(("bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/live_1m_data.py " + ticker + "'").c_str());

        return "/repos/marketmeteor/data/raw/minute/" + ticker + ".csv";

    } else if (path.find("/api/rollback_chartdata/") == 0) {
        // Extract ticker name and construct CSV file path
        std::string ticker = path.substr(std::string("/api/rollback_chartdata/").length());
        // std::string ticker = urlDecode_carrot(path.substr(std::string("/api/rollback_chartdata/").length()));
        std::cout << "Retrieving rollback chart data for ticker: " << ticker << std::endl;

        return "../../data/chartdata/rollback/" + ticker;
        // return "/media/share/Stockland/m20perf_L2016/charts/repo/m20/R08/rollback/" + ticker;

    } else if (path == "/api/sectors-data") {
        return "/marketmeteor/web_server/dataset/sectors.csv";
        // not used
    }

    return "www" + path;
}

std::string getContentType(const std::string &filePath) {
    std::map<std::string, std::string> contentTypeMap = {
        {".html", "text/html"},
        {".css", "text/css"},
        {".js", "application/javascript"},
        // Add more file types as needed
    };

    size_t dotPos = filePath.rfind('.');
    if (dotPos != std::string::npos) {
        std::string extension = filePath.substr(dotPos);
        if (contentTypeMap.count(extension)) {
            return contentTypeMap[extension];
        }
    }

    return "text/plain"; // Default content type
}

int main() {
    int server_fd, new_socket;
    struct sockaddr_in address;
    int opt = 1;
    int addrlen = sizeof(address);
    char buffer[8192] = {0};

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }

    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR | SO_REUSEPORT, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        exit(EXIT_FAILURE);
    }

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(9000);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("bind failed");
        exit(EXIT_FAILURE);
    }

    if (listen(server_fd, 3) < 0) {
        perror("listen");
        exit(EXIT_FAILURE);
    }

    while (true) {
        std::cout << "Waiting for connections..." << std::endl;

        if ((new_socket = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen)) < 0) {
            perror("accept");
            exit(EXIT_FAILURE);
        }

        memset(buffer, 0, 8192);
        ssize_t bytes_read = read(new_socket, buffer, 8191);
        
        if (bytes_read < 0) {
            perror("read failed");
            close(new_socket);
            continue;
        }

        std::cout << "Message received: " << buffer << std::endl;

        std::string request(buffer);
        std::string response;

        if (request.find("GET /api/sectors-data HTTP") == 0) {
            // Handle sectors-data request

            // auto csvData = readCsv("/marketmeteor/web_server/dataset/sectors.csv");
            auto csvData = readCsv("../../data/sectors/sectors_name_country.csv");
            nlohmann::json jsonOutput = csvToJson(csvData);
            std::string jsonResponse = jsonOutput.dump();

            // std::string jsonResponse = csvToJson(csvData);
            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                           << "Content-Type: application/json\r\n"
                           << "Content-Length: " << jsonResponse.length() << "\r\n"
                           << "\r\n"
                           << jsonResponse;
            response = responseStream.str();
        } else if (request.find("GET /api/majorindicies-timeseries HTTP") == 0) {
            // Handle major indicies time series request

            std::system("bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/live_1m_data_indicies.py'");

            // auto csvData = readCsv("/marketmeteor/web_server/dataset/sectors.csv");
            auto csvData = readCsv("../../data/raw/minute/combined_tickers.csv");
            nlohmann::json jsonOutput = csvToJson(csvData);
            std::string jsonResponse = jsonOutput.dump();

            // std::string jsonResponse = csvToJson(csvData);
            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                           << "Content-Type: application/json\r\n"
                           << "Content-Length: " << jsonResponse.length() << "\r\n"
                           << "\r\n"
                           << jsonResponse;
            response = responseStream.str();

        } else if (request.find("GET /api/get-m20-data HTTP") == 0) {

            std::cout << "executing live_data_single.py ..." << std::endl;

            // dangerous, runs out of memory
            // if running with the full list of ~1300 tickers, it will fail and OVERWRITE stock_prices.csv, IF it exists
            std::system("bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/live_data_single.py 1'");

            // !!!! if watchlist doesn't exist, it will load the last cached stock_prices and m20tmrw_prices (which is typically the full list)
            // !!!! watchlist is added to select tickers to live update during the day

            // std::system("python3 /marketmeteor/web_server/live_data_single.py");
            // it will wait for the script to finish

            // stock_prices.csv and m20tmrw_prices.csv will typically only contain SELECTED tickers

            std::cout << "Reading stock_prices.csv..." << std::endl;
            auto stockData = readCsv("../../data/marketmeteors/stock_prices.csv");
            std::cout << "stock_prices.csv read. Number of rows: " << stockData.size() << std::endl;

            std::cout << "Reading m20tmrw_prices.csv..." << std::endl;
            auto m20Data = readCsv("../../data/marketmeteors/m20tmrw_prices.csv");
            std::cout << "m20tmrw_prices.csv read. Number of rows: " << m20Data.size() << std::endl;

            std::cout << "Merging data..." << std::endl;
            auto mergedData = mergeData(stockData, m20Data);
            std::cout << "Data merged. Number of merged rows: " << mergedData.size() << std::endl;

            std::cout << "Converting merged data to JSON..." << std::endl;
            nlohmann::json jsonOutput = nlohmann::json(mergedData);
            std::string jsonResponse = jsonOutput.dump();
            std::cout << "JSON conversion complete. JSON length: " << jsonResponse.length() << std::endl;

            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json\r\n"
                        << "Content-Length: " << jsonResponse.length() << "\r\n"
                        << "\r\n"
                        << jsonResponse;
            response = responseStream.str();

        } else if (request.find("GET /api/get-gainers-data HTTP") == 0) {

            std::cout << "executing live_gainers.py ..." << std::endl;

            // dangerous, runs out of memory
            // if running with the full list of ~1300 tickers, it will fail and OVERWRITE stock_prices.csv, IF it exists
            std::system("bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/live_gainers.py 1'");

            // !!!! if watchlist doesn't exist, it will load the last cached stock_prices and m20tmrw_prices (which is typically the full list)
            // !!!! watchlist is added to select tickers to live update during the day

            // std::system("python3 /marketmeteor/web_server/live_data_single.py");
            // it will wait for the script to finish

            // stock_prices.csv and m20tmrw_prices.csv will typically only contain SELECTED tickers

            std::cout << "Reading gainers_prices.csv..." << std::endl;
            auto stockData = readCsv("../../data/marketmeteors/gainers_prices.csv");
            std::cout << "gainers_prices.csv read. Number of rows: " << stockData.size() << std::endl;

            std::cout << "Reading m20tmrw_prices.csv..." << std::endl;
            auto m20Data = readCsv("../../data/marketmeteors/m20tmrw_prices.csv");
            std::cout << "m20tmrw_prices.csv read. Number of rows: " << m20Data.size() << std::endl;

            std::cout << "Merging data..." << std::endl;
            auto mergedData = mergeData(stockData, m20Data);
            std::cout << "Data merged. Number of merged rows: " << mergedData.size() << std::endl;

            std::cout << "Converting merged data to JSON..." << std::endl;
            nlohmann::json jsonOutput = nlohmann::json(mergedData);
            std::string jsonResponse = jsonOutput.dump();
            std::cout << "JSON conversion complete. JSON length: " << jsonResponse.length() << std::endl;

            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json\r\n"
                        << "Content-Length: " << jsonResponse.length() << "\r\n"
                        << "\r\n"
                        << jsonResponse;
            response = responseStream.str();
        } else if (request.find("GET /api/get-portfolio") == 0) {

            std::regex re("account=([^&\\s]+)");
            std::smatch match;
            std::string accountValue;

            if (std::regex_search(request, match, re) && match.size() > 1) {
                accountValue = match.str(1); // Get the captured string after "account="
                accountValue = urlDecode(accountValue); // You should implement urlDecode to handle URL decoding
            } else {
                std::cerr << "Account parameter not found." << std::endl;
                // Handle error or set default account value
            }

            std::cout << "Executing get_portfolio.py with account: " << accountValue << " ..." << std::endl;

            // Build the command string with the account parameter
            std::string command = "bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/get_portfolio.py " + accountValue + "'";

            // Execute the command
            std::system(command.c_str());
            
            std::cout << "Reading portfolio.csv..." << std::endl;
            // auto portData = readCsv("/marketmeteor/web_server/portfolios/portfolio.csv");
            std::string filePath = "../../data/portfolios/" + accountValue + ".csv";
            auto portData = readCsv(filePath);
            
            std::cout << "portfolio.csv read. Number of rows: " << portData.size() << std::endl;

            nlohmann::json jsonOutput = csvToJson(portData);
            std::string jsonResponse = jsonOutput.dump();

            // std::string jsonResponse = csvToJson(csvData);
            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                           << "Content-Type: application/json\r\n"
                           << "Content-Length: " << jsonResponse.length() << "\r\n"
                           << "\r\n"
                           << jsonResponse;
            response = responseStream.str();

        } else if (request.find("POST /api/process-date HTTP") == 0) {
            // Extract the JSON data from the request
            size_t jsonStart = request.find("\r\n\r\n");
            std::string jsonData = request.substr(jsonStart + 4); // +4 to skip the "\r\n\r\n"

            // Parse the JSON data
            auto data = nlohmann::json::parse(jsonData);
            std::string received_date = data["date"];
            std::string ticker = data["ticker"];

            // Path to the Python script
            // std::string scriptPath = "bash -c source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/gen_rollback_v2.py";
            std::string command = "bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/gen_rollback_v2.py " + ticker + " " + received_date + "'";
            // usage: bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/gen_rollback_v2.py TSLA 2024-03-06'
            // std::string command = "python " + scriptPath + " " + ticker + " " + received_date;

            // Execute the Python script
            int result = std::system(command.c_str());

            // Construct response
            nlohmann::json response_data;
            if (result == 0) { // Assuming 0 is success
                // Construct successful response
                std::string csvFilePath = "../../data/chartdata/rollback/" + ticker + ".csv";
                response_data = {
                    {"status", "Rollback data generated"},
                    {"prepared for", received_date},
                    // {"data last modified", ...} // Add last modified time if needed
                };
            } else {
                // Construct error response
                response_data = {
                    {"status", "Rollback data failed to generate"},
                    {"failed to prepared for", received_date}
                };
            }

            // Send response
            std::string jsonResponse = response_data.dump();
            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                           << "Content-Type: application/json\r\n"
                           << "Content-Length: " << jsonResponse.length() << "\r\n"
                           << "\r\n"
                           << jsonResponse;
            std::string response = responseStream.str();
            send(new_socket, response.c_str(), response.length(), 0);
        } else if (request.find("GET /api/usage HTTP") == 0) {
            // Run the Python script to parse the access log
            // std::system("python3 /incoming/marketmeteor-data/parse_access_log.py");
            // std::system("bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 /incoming/marketmeteor-data/parse_access_log.py'");
            std::system("bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 /incoming/marketmeteor-data/parse_access_log.py' > output_c_parse_access.log 2>&1");

            // Read the resulting CSV file
            auto csvData = readCsv("/incoming/marketmeteor-data/parsed_access_log_api.csv");

            // Convert CSV data to JSON
            nlohmann::json jsonOutput = csvToJson(csvData);
            std::string jsonResponse = jsonOutput.dump();

            // Create the HTTP response
            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json\r\n"
                        << "Content-Length: " << jsonResponse.length() << "\r\n"
                        << "\r\n"
                        << jsonResponse;
            response = responseStream.str();
        } else if (request.find("POST /api/login_content HTTP") == 0) {

            printGreen("POST request:\n" + request);

            // Find the start of the body (after headers)
            size_t headerEnd = request.find("\r\n\r\n");
            if (headerEnd == std::string::npos) {
                headerEnd = request.find("\n\n"); // Fallback to just "\n\n"
            }
            std::string body = request.substr(headerEnd + 4); // Adjust the offset based on the line ending used
            printGreen("POST request (body):\n");
            std::cout << body << std::endl;

            json requestBody = json::parse(body);
            std::string userEmail = requestBody["email"];
            std::string token = requestBody["token"];
            // std::string token = extractToken(request);
            std::string authtoken = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiaXNzIjoiaHR0cHM6Ly9kZXYtbHMweXVmamh4ajAxcjh1dy51cy5hdXRoMC5jb20vIn0";

            // Authenticare only if authtoken is found in token
            if (token.find(authtoken) != std::string::npos) {

                json users = readJsonFile("/incoming/marketmeteor-data/users.json");

                // Check if user exists by email
                bool userExists = users.contains(userEmail);

                if (userExists) {
                    // User exists - retrieve existing data
                    // users[userEmail]["token"] = token;

                    printGreen("---- RETURNING USER ----");
                    std::cout << "Existing user data: " << users[userEmail].dump(4) << std::endl;

                    // Prepare JSON response with matchedKey
                    json jsonOutput = users[userEmail];
                    std::string jsonResponse = jsonOutput.dump();

                    std::ostringstream responseStream;
                    responseStream << "HTTP/1.1 200 OK\r\n"
                                << "Content-Type: application/json\r\n"
                                << "Content-Length: " << jsonResponse.length() << "\r\n"
                                << "\r\n"
                                << jsonResponse;
                    response = responseStream.str();
                    send(new_socket, response.c_str(), response.length(), 0);
                } else {
                    // User does not exist - add new user

                    users[userEmail] = json::object({
                        {"token", json::array({token})},
                        {"public_watchlists", json::array({"Admin_3"})},
                        {"user_watchlists", json::array()},
                        {"btc_address_for_payment", json::array()},
                        {"paid", json::array({"false"})}
                    });

                    // // Update the user's information
                    // users[token] = json::object(); // Create a new object for the user

                    // // Example of adding some default data for a new user
                    // users[token]["public watchlists"] = json::array({"admin1", "admin3"});
                    // users[token]["user watchlists"] = json::array();
                    // users[token]["user email"] = json::array({userEmail});

                    // Write the updated JSON back to the file
                    writeJsonFile("/incoming/marketmeteor-data/users.json", users);

                    // Send back the new user data
                    printGreen("---- NEW USER ----");
                    std::cout << "New user data: " << users[userEmail].dump(4) << std::endl;

                    // Prepare JSON response with the new user data
                    json jsonOutput = users[userEmail];
                    std::string jsonResponse = jsonOutput.dump();

                    std::ostringstream responseStream;
                    responseStream << "HTTP/1.1 200 OK\r\n"
                                    << "Content-Type: application/json\r\n"
                                    << "Content-Length: " << jsonResponse.length() << "\r\n"
                                    << "\r\n"
                                    << jsonResponse;
                    response = responseStream.str();
                    send(new_socket, response.c_str(), response.length(), 0);

                }

            }

            

        } else if (request.find("POST /api/savePortfolio HTTP") == 0){

            // Find the start of the body (after headers)
            size_t headerEnd_save_portfolio = request.find("\r\n\r\n");
            if (headerEnd_save_portfolio == std::string::npos) {
                headerEnd_save_portfolio = request.find("\n\n"); // Fallback to just "\n\n"
            }
            std::string body_save_portfolio = request.substr(headerEnd_save_portfolio + 4); // Adjust the offset based on the line ending used
            printGreen("POST request (body):\n");
            std::cout << body_save_portfolio << std::endl;

            json requestBody_saveport = json::parse(body_save_portfolio);
            std::string token2 = requestBody_saveport["token"];
            std::string authToken2 = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiaXNzIjoiaHR0cHM6Ly9kZXYtbHMweXVmamh4ajAxcjh1dy51cy5hdXRoMC5jb20vIn0";

            // if (!tokenIsValid(token, authToken2)) {
            if (token2.find(authToken2) != std::string::npos) {
                // std::cerr << "Invalid token" << std::endl;
                
                std::string userEmail = requestBody_saveport["user"];
                std::string portfolioName = requestBody_saveport["name"];
                json portfolioData = requestBody_saveport["data"];

                // Update user data - only if get_portfolio_hist.py is successful (check if portfolioName + ".csv" exists)
                // json users = readJsonFile("/incoming/marketmeteor-data/users.json");
                // users[userEmail]["user_watchlists"].push_back(portfolioName);
                // writeJsonFile("/incoming/marketmeteor-data/users.json", users);

                json users = readJsonFile("/incoming/marketmeteor-data/users.json");

                // Write portfolio data to CSV
                bool allowOverride = false;
                std::string csvFilename = "../../data/portfolios/" + portfolioName + "_template.csv";
                if (users.contains(userEmail) && users[userEmail]["user_watchlists"].is_array()) {
                    // Set allowOverride to true if portfolioName is found in the user's watchlist
                    if (std::find(users[userEmail]["user_watchlists"].begin(), users[userEmail]["user_watchlists"].end(), portfolioName) != users[userEmail]["user_watchlists"].end()) {
                        allowOverride = true;
                    }
                }
                writeDataToCsv(csvFilename, portfolioData, allowOverride);

                // initialize portfolio with get_portfolio_hist.py
                std::string commandhist = "bash -c 'source /marketmeteor/web_server/myenv/bin/activate && python3 ../python/get_portfolio_hist.py " + portfolioName + "'";
                std::system(commandhist.c_str());

                std::string csv_file_created = "../../data/portfolios/" + portfolioName + ".csv";
                if (std::filesystem::exists(csv_file_created)) {
                    // The file exists, update user data
                    // json users = readJsonFile("/incoming/marketmeteor-data/users.json");
                    // users[userEmail]["user_watchlists"].push_back(portfolioName);
                    // writeJsonFile("/incoming/marketmeteor-data/users.json", users);

                    // check if portfolio already exists

                    if (std::find(users[userEmail]["user_watchlists"].begin(), users[userEmail]["user_watchlists"].end(), portfolioName) == users[userEmail]["user_watchlists"].end()) {
                        // Portfolio name not found, safe to add
                        users[userEmail]["user_watchlists"].push_back(portfolioName);
                        writeJsonFile("/incoming/marketmeteor-data/users.json", users);

                        // Prepare JSON response with matchedKey
                        json jsonOutput = users[userEmail];
                        std::string jsonResponse = jsonOutput.dump();

                        std::ostringstream responseStream;
                        responseStream << "HTTP/1.1 200 OK\r\n"
                                    << "Content-Type: application/json\r\n"
                                    << "Content-Length: " << jsonResponse.length() << "\r\n"
                                    << "\r\n"
                                    << jsonResponse;
                        response = responseStream.str();
                        std::cerr << "Sending response: " << responseStream.str() << std::endl;
                        send(new_socket, response.c_str(), response.length(), 0);
                    }

                } else {
                    // The file does not exist, handle the error accordingly
                    std::cerr << "CSV file was not created. get_portfolio_hist.py may have failed." << std::endl;

                    std::ostringstream responseStream;
                    responseStream << "HTTP/1.1 500 Internal Server Error\r\n"
                                << "Content-Type: text/plain\r\n"
                                << "Content-Length: 27\r\n"
                                << "\r\n"
                                << "Error processing request";
                    response = responseStream.str();
                    std::cerr << "(authenticated but portfolio.csv does not exist) Sending response: " << responseStream.str() << std::endl;
                    send(new_socket, response.c_str(), response.length(), 0);
                }
            }

        } else if (request.find("GET /api/get-portsim-summary HTTP") == 0) {

            std::cout << "Reading summary.csv..." << std::endl;
            auto portsimSummary = readCsv("../../data/PortSim/display/summary.csv");
            std::cout << "summary.csv read. Number of rows: " << portsimSummary.size() << std::endl;
            auto scenarioSummary = readCsv("../../data/PortSim/display/PortSimSummariesPy.csv");

            // std::cout << "Converting merged data to JSON..." << std::endl;
            // nlohmann::json jsonOutput = nlohmann::json(portsimSummary);
            // std::string jsonResponse = jsonOutput.dump();
            // std::cout << "JSON conversion complete. JSON length: " << jsonResponse.length() << std::endl;

            nlohmann::json combinedJson;
            combinedJson["scenariosummary"] = scenarioSummary;
            combinedJson["portsimsummary"] = portsimSummary;
            std::string jsonResponse = combinedJson.dump();

            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json\r\n"
                        << "Content-Length: " << jsonResponse.length() << "\r\n"
                        << "\r\n"
                        << jsonResponse;
            response = responseStream.str();

        } else if (request.find("POST /api/post-porttimeseries HTTP") == 0){

            // Find the start of the body (after headers)
            size_t headerEnd_porttimeseries = request.find("\r\n\r\n");
            if (headerEnd_porttimeseries == std::string::npos) {
                headerEnd_porttimeseries = request.find("\n\n"); // Fallback to just "\n\n"
            }
            std::string body_porttimeseries = request.substr(headerEnd_porttimeseries + 4); // Adjust the offset based on the line ending used
            printGreen("POST request (body):\n");
            std::cout << body_porttimeseries << std::endl;

            json requestBody_porttimeseries = json::parse(body_porttimeseries);
            std::string startNr = requestBody_porttimeseries["start"];

            std::cout << "startNr: " << startNr << std::endl;

            // Construct file paths
            std::string timeseriesCsvPath = "../../data/PortSim/display/date" + startNr + "/port_timeseries.csv";
            std::string holdingsHistoryCsvPath = "../../data/PortSim/display/date" + startNr + "/portsim.csv";

            // Read CSV files and convert to JSON
            auto timeseriesJson = readCsv(timeseriesCsvPath);
            auto holdingsHistoryJson = readCsv(holdingsHistoryCsvPath);

            // Combine both JSON objects into a single JSON object
            nlohmann::json combinedJson;
            combinedJson["timeseries"] = timeseriesJson;
            combinedJson["holdingsHistory"] = holdingsHistoryJson;

            // Convert the combined JSON object to a string
            std::string jsonResponse = combinedJson.dump();

            // Create the HTTP response
            std::ostringstream responseStream;
            responseStream << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json\r\n"
                        << "Content-Length: " << jsonResponse.length() << "\r\n"
                        << "\r\n"
                        << jsonResponse;
            response = responseStream.str();

        } else {

            std::string filePath = getFilePath(request);

            std::cout << "<< FILEPATH >> : " << filePath << std::endl;

            if (fs::exists(filePath)){  
                std::string fileContent = readFile(filePath);
                std::string contentType = getContentType(filePath);
                std::string lastModified = getLastModifiedTime(filePath);

                std::ostringstream responseStream;
                responseStream << "HTTP/1.1 200 OK\r\n"
                            << "Content-Type: " << contentType << "\r\n"
                            << "Content-Length: " << fileContent.size() << "\r\n"
                            << "Last-Modified: " << lastModified << "\r\n"
                            << "\r\n"
                            << fileContent;
                response = responseStream.str(); 
            }else{
                std::string filePath = getFilePath(request);
                std::string fileContent = readFile(filePath);
                std::string contentType = getContentType(filePath);

                std::ostringstream responseStream;
                responseStream << "HTTP/1.1 200 OK\r\n"
                            << "Content-Type: " << contentType << "\r\n"
                            << "Content-Length: " << fileContent.size() << "\r\n"
                            << "\r\n"
                            << fileContent;
                response = responseStream.str();
            }
        }

        ssize_t bytes_sent = send(new_socket, response.c_str(), response.length(), 0);
        if (bytes_sent < 0) {
            perror("send failed");
        }

        close(new_socket);
    }

    close(server_fd);
    return 0;
}
