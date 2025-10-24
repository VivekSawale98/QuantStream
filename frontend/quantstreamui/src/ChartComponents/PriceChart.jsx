import React, { useEffect, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  LineSeries,
} from "lightweight-charts";
import moment from "moment";

const formatCandlestickData = (apiData, ohlcKey) => {
  if (!apiData || !ohlcKey) return [];

  return apiData
    .filter((d) => d?.[ohlcKey] != null) // Ensure the ohlc data for this key exists
    .map((d) => {
      // The API returns time in the main object, and OHLC in a nested one.
      // We need to flatten this into the structure the chart expects.
      return {
        time: new Date(d[ohlcKey].timestamp).getTime() / 1000,
        // time: moment(d[ohlcKey].timestamp).valueOf(),
        open: d[ohlcKey].open,
        high: d[ohlcKey].high,
        low: d[ohlcKey].low,
        close: d[ohlcKey].close,
      };
    });
};

const PriceChart = ({ yData, xData, ySymbol, xSymbol, liveData }) => {
  console.log(xData);

  const chartContainerRef = useRef(null);

  // --- Refs to hold the series objects ---
  const ySeriesRef = useRef(null);
  const xSeriesRef = useRef(null);

  useEffect(() => {
    const chartOptions = {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time, tickMarkType, locale) => {
          // Create a formatter that ALWAYS displays in UTC
          const formatter = new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "UTC", // <-- The key change
          });
          return formatter.format(new Date(time * 1000));
        },
      },
      layout: {
        textColor: "black",
        background: { type: "solid", color: "white" },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#485158",
      },
      leftPriceScale: {
        visible: true,
        borderColor: "#485158",
      },
      crosshair: {
        mode: "normal", // 'normal' is the default, but we make it explicit

        // Vertical line (time)
        vertLine: {
          color: "#666",
          style: 3, // Dotted line
          labelBackgroundColor: "#333",
        },

        // Horizontal line (price)
        horzLine: {
          color: "#666",
          style: 3, // Dotted line
          labelBackgroundColor: "#333",
        },
      },
    };
    const chart = createChart(chartContainerRef.current, chartOptions);

    // --- SERIES 1: Base Asset (Y) on the RIGHT scale ---
    ySeriesRef.current = chart.addSeries(CandlestickSeries, {
      title: ySymbol,
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceScaleId: "right", // <-- Attach to the right scale
    });
    ySeriesRef.current.setData(formatCandlestickData(yData, "y_ohlc"));

    // --- SERIES 2: Hedge Asset (X) on the LEFT scale ---
    xSeriesRef.current = chart.addSeries(CandlestickSeries, {
      title: xSymbol,
      upColor: "rgba(41, 98, 255, 0.8)",
      downColor: "rgba(255, 109, 0, 0.8)",
      borderVisible: false,
      wickUpColor: "rgba(41, 98, 255, 0.8)",
      wickDownColor: "rgba(255, 109, 0, 0.8)",
      priceScaleId: "left", // <-- Attach to the left scale
    });
    xSeriesRef.current.setData(formatCandlestickData(xData, "x_ohlc"));

    const dataTimeRange = ySeriesRef.current.data(); // Or xSeries, they are the same

    if (dataTimeRange.length > 0) {
      const from = dataTimeRange[Math.max(0, dataTimeRange.length - 50)].time; // Start of the window
      const to = dataTimeRange[dataTimeRange.length - 1].time; // End of the window (latest point)

      // 2. Set the visible range to the last 100 candles
      chart.timeScale().setVisibleRange({ from, to });
    } else {
      // Fallback if there is no data
      chart.timeScale().fitContent();
    }
  }, [xData, yData, ySymbol, xSymbol]);

  useEffect(() => {
    if (!liveData || !ySeriesRef.current || !xSeriesRef.current) {
      return;
    }

    const yUpdate = {
      time: new Date(liveData.time).getTime() / 1000,
      open: liveData.y_price,
      high: liveData.y_price,
      low: liveData.y_price,
      close: liveData.y_price,
    };

    const xUpdate = {
      time: new Date(liveData.time).getTime() / 1000,
      open: liveData.x_price,
      high: liveData.x_price,
      low: liveData.x_price,
      close: liveData.x_price,
    };

    // Use the .update() method to append the new data point
    ySeriesRef.current.update(yUpdate);
    xSeriesRef.current.update(xUpdate);
  }, [liveData]);

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "400px" }}>
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 999, // Make sure it's on top of the chart
            display: "flex",
            gap: "20px",
            background: "rgba(255, 255, 255, 0.8)",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div
              style={{ width: "12px", height: "12px", background: "#26a69a" }}
            ></div>
            <span>{ySymbol} (Base)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "rgba(41, 98, 255, 0.8)",
              }}
            ></div>
            <span>{xSymbol} (Hedge)</span>
          </div>
        </div>
        <div
          ref={chartContainerRef}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </>
  );
};

export default PriceChart;
