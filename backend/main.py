from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import List, Optional
import pandas as pd
import numpy as np
import statsmodels.api as sm
from pydantic import BaseModel, Field
from typing import Literal
from fastapi.staticfiles import StaticFiles
import os

from config import SUPPORTED_SYMBOLS, SUPPORTED_SYMBOLS_DETAIL
from database import get_db_connection
from analytics import (
    calculate_hedge_ratio,
    calculate_spread,
    calculate_zscore,
    run_adf_test,
    calculate_rolling_correlation,
)


def sanitize_for_json(data):
    """
    Recursively walk a dictionary or list and convert non-JSON-compliant
    values (like NaN, inf, -inf) to None.
    """
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    elif isinstance(data, (np.floating, float)):
        if np.isnan(data) or np.isinf(data):
            return None
        return data
    # Add any other type conversions you need here
    return data


# --- App Definition ---
app = FastAPI(
    title="QuantStream API",
    description="API to ingest data from Binance and perform analysis on the pair of symbols",
    version="1.0.0",
)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API Endpoints ---


@app.get("/api/detailsymbols", tags=["General"], response_model=list[dict[str, str]])
def get_detail_symbols():
    return SUPPORTED_SYMBOLS_DETAIL


@app.get("/api/symbols", tags=["General"], response_model=List[str])
def get_supported_symbols():
    return SUPPORTED_SYMBOLS


# This is our main new endpoint
@app.get("/api/chart-data", tags=["Analytics"])
def get_chart_data(
    y_symbol: str = Query(..., description="The symbol for the base asset (Y-axis)."),
    x_symbol: str = Query(..., description="The symbol for the hedge asset (X-axis)."),
    timeframe: str = Query(
        "1m", description="The chart timeframe, e.g., '1s', '1m', '5m'."
    ),
    window: int = Query(
        50, description="The rolling window for correlation calculation."
    ),
):
    """
    Provides all necessary data to render the historical analytics charts.
    """
    # --- 1. Validation ---
    if y_symbol not in SUPPORTED_SYMBOLS or x_symbol not in SUPPORTED_SYMBOLS:
        raise HTTPException(
            status_code=400, detail="One or both symbols are not supported."
        )
    if y_symbol == x_symbol:
        raise HTTPException(
            status_code=400, detail="Base and hedge symbols cannot be the same."
        )

    timeframe_map = {"1s": "1s", "1m": "1T", "5m": "5T"}
    if timeframe not in timeframe_map:
        raise HTTPException(status_code=400, detail="Unsupported timeframe.")

    resample_code = timeframe_map[timeframe]

    # --- 2. Data Fetching ---
    try:
        conn = get_db_connection()
        # Fetch a reasonable amount of data for analysis, e.g., last 100,000 ticks for each
        # A more advanced query would fetch by time, e.g., last 24 hours
        query = f"""
            SELECT timestamp, symbol, price 
            FROM raw_ticks 
            WHERE symbol IN ('{y_symbol}', '{x_symbol}')
            ORDER BY timestamp DESC
            LIMIT 200000 
        """
        raw_df = pd.read_sql_query(query, conn)
        conn.close()

        if raw_df.empty:
            raise HTTPException(
                status_code=404, detail="Not enough data available to perform analysis."
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # --- 3. Data Processing & Analysis ---
    # Convert timestamp and set as index
    raw_df["timestamp"] = pd.to_datetime(raw_df["timestamp"], unit="ms")
    raw_df.set_index("timestamp", inplace=True)
    raw_df.sort_index(inplace=True)  # Sort chronologically

    # Pivot to get symbols as columns, then forward-fill missing values
    price_df = raw_df.pivot_table(
        index="timestamp", columns="symbol", values="price"
    ).ffill()

    # Resample to the desired timeframe (OHLC)
    ohlc_df = price_df.resample(resample_code).ohlc()

    # --- ENSURE THE INDEX IS UTC ---

    if ohlc_df.index.tz is None:
        ohlc_df.index = ohlc_df.index.tz_localize("UTC")
    else:
        ohlc_df.index = ohlc_df.index.tz_convert("UTC")

    # Get just the close prices for our calculations
    y_prices = ohlc_df[(y_symbol, "close")].dropna()
    x_prices = ohlc_df[(x_symbol, "close")].dropna()

    # Align the two series by their index (timestamps)
    aligned_prices = pd.concat([y_prices, x_prices], axis=1, keys=["Y", "X"]).dropna()

    if len(aligned_prices) < window:
        raise HTTPException(
            status_code=404,
            detail=f"Not enough data for the given timeframe to meet the rolling window size of {window}.",
        )

    # Run all our analytics functions
    hedge_ratio, model = calculate_hedge_ratio(aligned_prices["Y"], aligned_prices["X"])
    spread = calculate_spread(aligned_prices["Y"], aligned_prices["X"], hedge_ratio)
    spread_mean = spread.mean()
    z_score = calculate_zscore(spread)
    adf_result = run_adf_test(spread)
    rolling_corr = calculate_rolling_correlation(
        aligned_prices["Y"], aligned_prices["X"], window
    )

    # --- 4. Format the Response ---
    # Convert our Pandas Series/DataFrames to a JSON-friendly format
    # We will build the timeseries array of objects as discussed

    spread = spread.where(pd.notna(spread), None)
    z_score = z_score.where(pd.notna(z_score), None)
    rolling_corr = rolling_corr.where(pd.notna(rolling_corr), None)
    X_with_const_for_prediction = sm.add_constant(aligned_prices["X"])
    regression_line = model.predict(X_with_const_for_prediction)

    # Get the OHLC data for the response
    y_ohlc_response = ohlc_df[y_symbol].dropna().reset_index()
    x_ohlc_response = ohlc_df[x_symbol].dropna().reset_index()

    timeseries_data = []
    for i, timestamp in enumerate(aligned_prices.index):
        # Find the corresponding OHLC data (this is not super efficient, but ok for now)
        y_ohlc_row = y_ohlc_response[y_ohlc_response["timestamp"] == timestamp]
        x_ohlc_row = x_ohlc_response[x_ohlc_response["timestamp"] == timestamp]

        timeseries_data.append(
            {
                "time": timestamp.isoformat(),
                "y_ohlc": (
                    y_ohlc_row.iloc[0].to_dict() if not y_ohlc_row.empty else None
                ),
                "x_ohlc": (
                    x_ohlc_row.iloc[0].to_dict() if not x_ohlc_row.empty else None
                ),
                "spread": spread.iloc[i],
                "z_score": z_score.iloc[i],
                "rolling_corr": (
                    rolling_corr.iloc[i] if pd.notna(rolling_corr.iloc[i]) else None
                ),
                "regression_line_value": regression_line.iloc[i],
            }
        )

    final_response = {
        "analytics_summary": {
            "hedge_ratio": hedge_ratio,
            "adf_p_value": adf_result["p_value"],
            "pair": f"{y_symbol}/{x_symbol}",
            "spread_mean": spread.mean(),
        },
        "timeseries_data": timeseries_data,
    }

    return sanitize_for_json(final_response)


# ------ Alert management APIS ------------


# --- Pydantic Model for validation ---
# This defines the shape of the JSON the frontend must send.
class AlertCreate(BaseModel):
    symbol_pair: str
    metric: Literal["Z-Score"]  # Ensures only "Z-Score" is accepted
    condition: Literal[">", "<"]  # Ensures only ">" or "<" are accepted
    value: float = Field(..., ge=0.5, le=5.0)  # Value must be between -7 and 7


@app.post("/api/alerts", tags=["Alerts"], status_code=201)
def create_alert(alert: AlertCreate):
    """
    Creates a new alert rule or re-activates an existing one.
    Returns the full alert object, including its ID.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if an alert with these exact parameters already exists
        cursor.execute(
            "SELECT * FROM alerts WHERE symbol_pair = ? AND metric = ? AND condition = ? AND value = ?",
            (alert.symbol_pair, alert.metric, alert.condition, alert.value),
        )
        existing_alert_row = cursor.fetchone()

        if existing_alert_row:
            # --- The alert already exists ---
            alert_id = existing_alert_row["id"]
            if existing_alert_row["status"] != "active":
                # If it was triggered or deleted, re-activate it
                cursor.execute(
                    "UPDATE alerts SET status = 'active' WHERE id = ?", (alert_id,)
                )
                conn.commit()
        else:
            # --- The alert is new, so insert it ---
            cursor.execute(
                "INSERT INTO alerts (symbol_pair, metric, condition, value, status) VALUES (?, ?, ?, ?, 'active')",
                (alert.symbol_pair, alert.metric, alert.condition, alert.value),
            )
            # Get the ID of the row we just inserted
            alert_id = cursor.lastrowid
            conn.commit()

        # --- Fetch the complete alert object to return to the frontend ---
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        new_or_updated_alert = cursor.fetchone()

        conn.close()

        if not new_or_updated_alert:
            raise HTTPException(
                status_code=404, detail="Could not find the alert after creation."
            )

        # Convert the database row to a dictionary and return it
        return dict(new_or_updated_alert)

    except Exception as e:
        print(f"Error creating alert: {e}")
        raise HTTPException(status_code=500, detail="Could not save alert to database.")


@app.get("/api/alerts/{y_symbol}/{x_symbol}", tags=["Alerts"])
def get_alerts_for_pair(y_symbol: str, x_symbol: str):
    """
    Fetches all active alerts for a given symbol pair.
    """
    symbol_pair = f"{y_symbol}/{x_symbol}"
    conn = get_db_connection()
    alerts = conn.execute(
        "SELECT * FROM alerts WHERE symbol_pair = ? AND status = 'active'",
        (symbol_pair,),
    ).fetchall()
    conn.close()
    # Convert the database rows to a list of dictionaries
    return [dict(row) for row in alerts]


@app.get("/api/alerts", tags=["Alerts"])
def get_alerts_for_pair():
    """
    Fetches all active alerts.
    """
    conn = get_db_connection()
    alerts = conn.execute(
        "SELECT * FROM alerts WHERE status = 'active'",
    ).fetchall()
    conn.close()
    # Convert the database rows to a list of dictionaries
    return [dict(row) for row in alerts]


@app.delete("/api/alerts/{alert_id}", tags=["Alerts"], status_code=204)
def delete_alert(alert_id: int):
    """
    Deletes an alert by its ID.
    """
    try:
        conn = get_db_connection()
        conn.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
        # Return No Content on successful deletion
        return
    except Exception as e:
        print(f"Error deleting alert: {e}")
        raise HTTPException(
            status_code=500, detail="Could not delete alert from database."
        )


# --- WebSocket Endpoint for Live Updates ---
@app.websocket("/ws/live-data/{y_symbol}/{x_symbol}")
async def websocket_endpoint(websocket: WebSocket, y_symbol: str, x_symbol: str):
    """
    WebSocket endpoint for streaming live analytics data for a given pair.
    """
    # --- 1. Accept the connection ---
    await websocket.accept()
    print(f"WebSocket connection accepted for pair: {y_symbol}/{x_symbol}")

    # --- 2. Initial parameters calculation (one-time) ---
    # We need to get the historical hedge_ratio, spread_mean, and spread_std
    # This is a simplified version. In a real app, you might cache this
    # or pass it from the initial HTTP request.

    # For now, we'll calculate it once at the start of the WebSocket connection.
    # Note: This is slightly inefficient as it duplicates the work from the HTTP endpoint.
    # A more advanced design would use a shared cache (like Redis).
    # But for this project, this is a clear and functional approach.

    try:
        conn = get_db_connection()
        query = f"""
            SELECT timestamp, symbol, price 
            FROM raw_ticks WHERE symbol IN ('{y_symbol}', '{x_symbol}')
            ORDER BY timestamp DESC LIMIT 100000
        """
        raw_df = pd.read_sql_query(query, conn)
        conn.close()

        if raw_df.empty:
            await websocket.close(code=1000, reason="Not enough data to initialize.")
            return

        raw_df["timestamp"] = pd.to_datetime(raw_df["timestamp"], unit="ms")
        raw_df.set_index("timestamp", inplace=True)
        raw_df.sort_index(inplace=True)

        price_df = raw_df.pivot_table(
            index="timestamp", columns="symbol", values="price"
        ).ffill()
        ohlc_df = price_df.resample("1s").ohlc()  # Resample at 1s for live data
        y_prices = ohlc_df[(y_symbol, "close")].dropna()
        x_prices = ohlc_df[(x_symbol, "close")].dropna()
        aligned_prices = pd.concat(
            [y_prices, x_prices], axis=1, keys=["Y", "X"]
        ).dropna()

        # Calculate the historical parameters we need to reuse
        historical_hedge_ratio, model = calculate_hedge_ratio(
            aligned_prices["Y"], aligned_prices["X"]
        )

        if model is None:
            await websocket.close(code=1000, reason="Model calculation failed.")
            return

        historical_intercept = model.params.iloc[0]

        historical_spread = calculate_spread(
            aligned_prices["Y"], aligned_prices["X"], historical_hedge_ratio
        )
        historical_spread_mean = historical_spread.mean()
        historical_spread_std = historical_spread.std()

        print(
            f"[{y_symbol}/{x_symbol}] Historical params calculated: Ratio={historical_hedge_ratio:.4f}, Mean={historical_spread_mean:.4f}, Std={historical_spread_std:.4f}"
        )

    except Exception as e:
        print(f"Error during WebSocket initialization: {e}")
        await websocket.close(code=1000, reason=f"Initialization failed: {e}")
        return

    # --- 3. The Live Update Loop ---
    try:
        while True:
            # Get the single most recent tick for each symbol
            conn = get_db_connection()
            # This query is very fast because of our index
            y_tick_query = f"SELECT price, timestamp FROM raw_ticks WHERE symbol = '{y_symbol}' ORDER BY timestamp DESC LIMIT 1"
            x_tick_query = f"SELECT price, timestamp FROM raw_ticks WHERE symbol = '{x_symbol}' ORDER BY timestamp DESC LIMIT 1"

            latest_y = conn.execute(y_tick_query).fetchone()
            latest_x = conn.execute(x_tick_query).fetchone()
            conn.close()

            if latest_y and latest_x:

                current_regression_line_value = historical_intercept + (
                    historical_hedge_ratio * latest_x["price"]
                )
                # Perform the fast, "update" calculations
                current_spread = latest_y["price"] - (
                    historical_hedge_ratio * latest_x["price"]
                )

                # Avoid division by zero if std dev is 0
                if historical_spread_std > 0:
                    current_z_score = (
                        current_spread - historical_spread_mean
                    ) / historical_spread_std
                else:
                    current_z_score = 0.0

                if latest_y and latest_x:
                    # ... (all your calculations for spread, z_score, regression_line_value) ...

                    # --- NEW: Alert Checking Logic ---
                    # Get the symbol pair string for querying the database
                    symbol_pair_str = f"{y_symbol}/{x_symbol}"

                    conn_alerts = get_db_connection()
                    # Find all 'active' alerts for this specific pair
                    alerts_to_check = conn_alerts.execute(
                        "SELECT * FROM alerts WHERE symbol_pair = ? AND status = 'active'",
                        (symbol_pair_str,),
                    ).fetchall()

                    if alerts_to_check:
                        for alert_row in alerts_to_check:
                            triggered = False
                            alert = dict(alert_row)  # Convert row to dictionary

                            # Check if the condition is met
                            if (
                                alert["condition"] == ">"
                                and current_z_score > alert["value"]
                            ):
                                triggered = True
                            elif (
                                alert["condition"] == "<"
                                and current_z_score < alert["value"]
                            ):
                                triggered = True

                            if triggered:
                                print(f"--- ALERT TRIGGERED: {alert['id']} ---")
                                alert_message = f"ALERT on {alert['symbol_pair']}: Z-Score ({current_z_score:.2f}) {alert['condition']} {alert['value']}"

                                # Prepare a special alert packet to send to the frontend
                                alert_packet = {
                                    "type": "alert",
                                    "message": alert_message,
                                    "alert_id": alert["id"],
                                }
                                await websocket.send_json(alert_packet)

                                # Deactivate the alert in the database so it doesn't fire again immediately
                                conn_alerts.execute(
                                    "UPDATE alerts SET status = 'triggered' WHERE id = ?",
                                    (alert["id"],),
                                )
                                conn_alerts.commit()

                    conn_alerts.close()

                # The timestamp from the DB in common format with timezone data

                timestamp_ms = latest_y["timestamp"]

                aware_timestamp = pd.to_datetime(timestamp_ms, unit="ms", utc=True)

                iso_timestamp = aware_timestamp.isoformat()

                # Prepare the data packet to send to the client
                live_data_packet = {
                    "time": iso_timestamp,
                    "y_price": latest_y["price"],
                    "x_price": latest_x["price"],
                    "spread": current_spread,
                    "z_score": current_z_score,
                    "regression_line_value": current_regression_line_value,
                }

                # Send the data packet as JSON over the WebSocket
                await websocket.send_json(live_data_packet)

            # Wait for 500 milliseconds before the next update
            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for pair: {y_symbol}/{x_symbol}")
    except Exception as e:
        print(f"An error occurred in the WebSocket loop: {e}")
        await websocket.close(code=1000, reason="An unexpected error occurred.")


static_files_path = os.path.join(os.path.dirname(__file__), "FrontEndApp", "dist")

app.mount("/", StaticFiles(directory=static_files_path, html=True), name="static")
