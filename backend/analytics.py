import pandas as pd
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller


def calculate_hedge_ratio(y: pd.Series, x: pd.Series) -> tuple:
    """
    Calculates the hedge ratio using Ordinary Least Squares (OLS) regression.

    The regression model is Y = a + b*X
    - Y: Base asset prices
    - X: Hedge asset prices
    - a: Intercept
    - b: Slope, which is our Hedge Ratio

    Returns a tuple containing the hedge ratio and the full regression model results.
    """
    # If all X values are the same, regression is impossible.
    if x.std() == 0:
        # In this case, we can't determine a relationship, so the hedge ratio is undefined.
        # We can return 0 or NaN. Returning NaN and handling it later is more robust.
        return float("nan"), None

    x_with_const = sm.add_constant(x)
    model = sm.OLS(y, x_with_const).fit()

    # Check if model is None (which it will be if the check above passes)
    if model is None:
        return float("nan"), None

    # The hedge ratio is the coefficient of our X variable
    hedge_ratio = model.params.iloc[1]
    return hedge_ratio, model


def calculate_spread(y: pd.Series, x: pd.Series, hedge_ratio: float) -> pd.Series:
    """
    Calculates the spread of a pair given their prices and a hedge ratio.
    Formula: Spread = Y - (Hedge Ratio * X)
    """
    return y - hedge_ratio * x


def calculate_zscore(spread: pd.Series) -> pd.Series:
    """
    Calculates the Z-score of the spread time series.
    Formula: Z-score = (Current Spread - Mean of Spread) / Std Dev of Spread
    """
    mean_spread = spread.mean()
    std_spread = spread.std()

    if std_spread == 0:
        return pd.Series([0.0] * len(spread), index=spread.index)

    z_score = (spread - mean_spread) / std_spread
    return z_score


def run_adf_test(series: pd.Series) -> dict:
    """
    Performs the Augmented Dickey-Fuller test for stationarity on a time series.

    Returns a dictionary with key test results.
    A low p-value (e.g., < 0.05) suggests the series is stationary.
    """
    # Drop any NaN values before running the test
    result = adfuller(series.dropna())

    return {
        "test_statistic": result[0],
        "p_value": result[1],
        "lags_used": result[2],
        "num_observations": result[3],
        "critical_values": result[4],
    }


def calculate_rolling_correlation(y: pd.Series, x: pd.Series, window: int) -> pd.Series:
    """
    Calculates the rolling correlation between two time series.
    """
    return x.rolling(window=window).corr(y)
