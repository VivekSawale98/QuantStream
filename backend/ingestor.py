import websocket
import json
import sqlite3
import time
from database import get_db_connection
from config import SUPPORTED_SYMBOLS


streams = [f"{s.lower()}@trade" for s in SUPPORTED_SYMBOLS]
STREAM_URL = "wss://stream.binance.com:9443/stream?streams=" + "/".join(streams)

print(STREAM_URL)


def on_open(ws):
    """
    Called when the WebSocket connection is successfully opened.
    """
    print("--- Ingestor WebSocket Connection Opened ---")
    print(f"--- Subscribed to streams: {', '.join(SUPPORTED_SYMBOLS)} ---")


def on_error(ws, error):
    """
    Called when an error occurs.
    """
    print(f"--- Ingestor Error: {error} ---")


def on_close(ws, close_status_code, close_msg):
    """
    Called when the WebSocket connection is closed.
    """
    print("--- Ingestor WebSocket Connection Closed ---")


def on_message(ws, message):
    """
    For every message received from the WebSocket.
    """
    # The message from Binance is a JSON string.
    data = json.loads(message)

    if "data" in data:
        trade_data = data["data"]

        # Extract the relevant fields from the trade data.
        timestamp = trade_data["T"]
        symbol = trade_data["s"]
        price = float(trade_data["p"])
        quantity = float(trade_data["q"])

        # print(f"Tick: {symbol} - Price: {price}, Qty: {quantity}")

        try:
            # Get a new database connection for this transaction
            conn = get_db_connection()
            cursor = conn.cursor()

            # Execute the INSERT statement to save the tick data
            cursor.execute(
                "INSERT INTO raw_ticks (timestamp, symbol, price, quantity) VALUES (?, ?, ?, ?)",
                (timestamp, symbol, price, quantity),
            )

            # Commit the transaction to make the changes permanent
            conn.commit()
            conn.close()

        except sqlite3.Error as e:
            print(f"--- Database Error: {e} ---")
        except Exception as e:
            print(f"--- An error occurred: {e} ---")


def start_websocket_app():
    """Creates and starts a single WebSocketApp instance."""
    print("--- Attempting to start WebSocket connection... ---")

    # Create the WebSocketApp instance with our callback functions
    ws = websocket.WebSocketApp(
        STREAM_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    # This is a blocking call that will run until the connection is closed
    ws.run_forever()


def run_ingestor():
    """
    Main entry point for the ingestor process.
    Runs an infinite loop that attempts to keep the WebSocket connection alive.
    """
    print("--- Starting Ingestor Process ---")

    while True:
        try:
            # Start the WebSocket app. This function will block until it disconnects.
            start_websocket_app()

            # If we get here, it means run_forever() has exited due to a disconnection.
            print("--- Ingestor connection lost. Reconnecting in 5 seconds... ---")
            time.sleep(5)

        except Exception as e:
            # This will catch any unexpected crash in the start_websocket_app function itself.
            print(
                f"--- Ingestor process crashed with error: {e}. Restarting in 5 seconds... ---"
            )
            time.sleep(5)


# To test just this component.
if __name__ == "__main__":
    run_ingestor()
