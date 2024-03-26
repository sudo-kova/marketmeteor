import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt


def calculate_ratio_and_momentum(etf_data, spy_data):

    # attempt to match BofA: "Chart 16: S&P 500 GICs Level 1 sector weekly relative rotation graph"
    # algorithm from: https://msw.flxn.de/tool/sector/

    # assumption: aggregate weekly data, plot the last 12 weeks

    window_len = 12
    momentum_len = 2

    # Resample data to weekly and calculate normalized prices
    normalized_etf_weekly = etf_data['Close'].resample('W').last() / etf_data['Close'].resample('W').last().iloc[0]
    normalized_spy_weekly = spy_data['Close'].resample('W').last() / spy_data['Close'].resample('W').last().iloc[0]

    # Calculate Relative Price of the ETF to the Benchmark
    relative_price_weekly = normalized_etf_weekly / normalized_spy_weekly

    # Rolling mean and standard deviation for Relative Price (10 weeks)
    rolling_mean_weekly = relative_price_weekly.rolling(window=window_len).mean()
    rolling_std_weekly = relative_price_weekly.rolling(window=window_len).std()

    # JdK RS-Ratio calculation for weekly data
    rs_ratio_weekly = 100 + ((relative_price_weekly - rolling_mean_weekly) / rolling_std_weekly)

    # Calculate Momentum based on normalized price (2 weeks)
    momentum_weekly = normalized_etf_weekly / normalized_etf_weekly.shift(momentum_len)
    momentum_rolling_mean_weekly = momentum_weekly.rolling(window=window_len).mean()
    momentum_rolling_std_weekly = momentum_weekly.rolling(window=window_len).std()

    # JdK RS-Momentum calculation for weekly data
    rs_momentum_weekly = 100 + ((momentum_weekly - momentum_rolling_mean_weekly) / momentum_rolling_std_weekly)

    # Smoothing both RS-Ratio and RS-Momentum with a 10-week rolling mean
    smoothed_rs_ratio_weekly = rs_ratio_weekly.rolling(window=window_len).mean()
    smoothed_rs_momentum_weekly = rs_momentum_weekly.rolling(window=window_len).mean()

    return smoothed_rs_ratio_weekly, smoothed_rs_momentum_weekly


def calculate_ratio_and_momentum_(etf_data, spy_data):



    # based on https://msw.flxn.de/tool/sector/
    # the sites defaults to a 10 day

    # Normalize prices relative to the first value
    normalized_etf = etf_data['Close'] / etf_data['Close'].iloc[0]
    normalized_spy = spy_data['Close'] / spy_data['Close'].iloc[0]

    # Calculate Relative Price of the ETF to the Benchmark
    relative_price = normalized_etf / normalized_spy

    # Rolling mean and standard deviation for Relative Price
    rolling_mean = relative_price.rolling(window=50).mean()
    rolling_std = relative_price.rolling(window=50).std()

    # JdK RS-Ratio calculation
    rs_ratio = 100 + ((relative_price - rolling_mean) / rolling_std)

    # Calculate Momentum based on normalized price
    momentum = normalized_etf / normalized_etf.shift(10)  # Relative to the price 10 days ago
    momentum_rolling_mean = momentum.rolling(window=50).mean()
    momentum_rolling_std = momentum.rolling(window=50).std()

    # JdK RS-Momentum calculation
    rs_momentum = 100 + ((momentum - momentum_rolling_mean) / momentum_rolling_std)

    # Smoothing both RS-Ratio and RS-Momentum with a 10-day rolling mean
    smoothed_rs_ratio = rs_ratio.rolling(window=10).mean()
    smoothed_rs_momentum = rs_momentum.rolling(window=10).mean()

    return smoothed_rs_ratio, smoothed_rs_momentum


def calculate_ratio_and_momentum_orig(etf_data, spy_data):
    w = 50

    # Calculating the Relative Strength (RS) line
    rs_line = etf_data['Close'] / spy_data['Close']

    # Normalize RS-Ratio with its 50-day rolling mean
    rs_ratio = rs_line / rs_line.rolling(window=w).mean() * 100

    # Calculate Momentum
    momentum = etf_data['Close'] / etf_data['Close'].shift(10)  # Relative to the price 10 days ago
    momentum_rolling_mean = momentum.rolling(window=w).mean()
    momentum_rolling_std = momentum.rolling(window=w).std()

    # Calculate JDK RS-Momentum
    rs_momentum = 100 + ((momentum - momentum_rolling_mean) / momentum_rolling_std)

    # Smoothing both RS-Ratio and RS-Momentum with a 10-day rolling mean
    smoothed_rs_ratio = rs_ratio.rolling(window=10).mean()
    smoothed_rs_momentum = rs_momentum.rolling(window=10).mean()

    return smoothed_rs_ratio, smoothed_rs_momentum


benchmark_ticker = "SPY"

# spy_data = yf.download(benchmark_ticker, start="2020-01-01", end="2024-01-01")
# print(spy_data)
# xlk_data = yf.download("XLK", start="2020-01-01", end="2024-01-01")
# xle_data = yf.download("XLE", start="2020-01-01", end="2024-01-01")

# spy_data = pd.read_csv(benchmark_ticker + ".csv")
spy_data = pd.read_csv(benchmark_ticker + ".csv", parse_dates=['Date'], index_col='Date')

tickers = [
    "XLC", "XLY", "XLP", "XLE", "XLF", "XLV",
    "XLI", "XLB", "XLRE", "XLK", "XLU"
]

# tickers = [
#     "XLE", "XLK"
# ]

# # Create the figure and the axes
fig, ax = plt.subplots(figsize=(12, 8))

# Function to draw arrows
def draw_arrows(x, y, color):
    for i in range(1, len(x)):
        ax.annotate('', xy=(x[i], y[i]), xytext=(x[i-1], y[i-1]),
                    arrowprops=dict(facecolor=color, shrink=0.05, width=1, headwidth=8))

# Draw vertical and horizontal red lines through 100
ax.axhline(100, color='red', linestyle='--')
ax.axvline(100, color='red', linestyle='--')

for ticker in tickers:
    df = pd.read_csv(ticker + ".csv", parse_dates=['Date'], index_col='Date')

    # Calculate the RS-Ratio and RS-Momentum
    r, m = calculate_ratio_and_momentum(df, spy_data)
    
    # Extract the last 12 weeks of data
    r_last_12 = r[-12:]
    m_last_12 = m[-12:]
    
    # Plotting the points for each ETF
    ax.scatter(r_last_12, m_last_12, label=f'{ticker} Weekly Data Points')
    ax.plot(r_last_12, m_last_12)
    
    # Draw arrows to show the direction of the movement
    draw_arrows(r_last_12, m_last_12, 'black')
    
    # Annotate the last point with the ticker symbol
    if len(r_last_12) > 0 and len(m_last_12) > 0:
        ax.text(r_last_12.iloc[-1], m_last_12.iloc[-1], f' {ticker}', verticalalignment='bottom', horizontalalignment='right')

# Plot settings
ax.set_title("Relative Rotation Graph - Last 12 Weeks")
ax.set_xlabel("RS-Ratio")
ax.set_ylabel("RS-Momentum")
ax.grid(True)
ax.legend()

plt.show()