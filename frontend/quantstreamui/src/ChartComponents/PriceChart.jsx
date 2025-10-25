import React, { useEffect, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  LineSeries,
} from "lightweight-charts";

function convertToLocalTimestamp(utcIsoString) {
  const date = new Date(utcIsoString);
  // offset in milliseconds (local - UTC)
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return (date.getTime() - offsetMs) / 1000; // seconds
}

const formatCandlestickData = (apiData, ohlcKey) => {
  if (!apiData || !ohlcKey) return [];

  return apiData
    .filter((d) => d?.[ohlcKey] != null) // Ensure the ohlc data for this key exists
    .map((d) => {
      // The API returns time in the main object, and OHLC in a nested one.
      // We need to flatten this into the structure the chart expects.
      return {
        time: convertToLocalTimestamp(d[ohlcKey].timestamp),
        // time: new Date(d[ohlcKey].timestamp).getTime() / 1000,
        open: d[ohlcKey].open,
        high: d[ohlcKey].high,
        low: d[ohlcKey].low,
        close: d[ohlcKey].close,
      };
    });
};

const formatLineSeriesData = (apiData, ohlcKey, valuekey) => {
  if (!apiData || !ohlcKey) return [];

  return apiData
    .filter((d) => d?.[ohlcKey] != null) // Ensure the ohlc data for this key exists
    .map((d) => {
      // The API returns time in the main object, and OHLC in a nested one.
      // We need to flatten this into the structure the chart expects.
      return {
        time: convertToLocalTimestamp(d[ohlcKey].timestamp),
        // time: new Date(d[ohlcKey].timestamp).getTime() / 1000,
        value: valuekey == "close" ? d[ohlcKey][valuekey] : d[valuekey],
      };
    });
};

const PriceChart = ({ yData, xData, ySymbol, xSymbol, liveData }) => {
  // console.log(xData);

  const chartContainerRef = useRef(null);

  const chartrefval = useRef(null);

  // --- Refs to hold the series objects ---
  const ySeriesRef = useRef(null);
  const xSeriesRef = useRef(null);
  const RegressionLineRef = useRef(null);

  useEffect(() => {
    const chartOptions = {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
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
    chartrefval.current = createChart(chartContainerRef.current, chartOptions);

    const chart = chartrefval.current;

    // --- SERIES 1: Base Asset (Y) on the RIGHT scale ---
    ySeriesRef.current = chart.addSeries(CandlestickSeries, {
      title: ySymbol,
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceScaleId: "right",
    });
    ySeriesRef.current.setData(formatCandlestickData(yData, "y_ohlc"));

    // --- SERIES 2: Regression Line on Right as these is expected value of Base ---
    RegressionLineRef.current = chart.addSeries(LineSeries, {
      title: "Regression Line",
      color: "#5a6161ff",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#717776ff",
      wickDownColor: "#ef5350",
      priceScaleId: "right",
    });
    RegressionLineRef.current.setData(
      formatLineSeriesData(yData, "y_ohlc", "regression_line_value")
    );

    // --- SERIES 3: Hedge Asset (X) on the LEFT scale ---
    xSeriesRef.current = chart.addSeries(LineSeries, {
      title: xSymbol,
      color: "rgba(41, 98, 255, 0.8)",
      downColor: "rgba(255, 109, 0, 0.8)",
      borderVisible: false,
      wickUpColor: "rgba(41, 98, 255, 0.8)",
      wickDownColor: "rgba(255, 109, 0, 0.8)",
      priceScaleId: "left",
    });
    xSeriesRef.current.setData(formatLineSeriesData(xData, "x_ohlc", "close"));

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

    // --- 3. THE RESIZE OBSERVER LOGIC ---
    const resizeObserver = new ResizeObserver((entries) => {
      // This callback fires when the container's size changes
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    // Start observing the chart container
    resizeObserver.observe(chartContainerRef.current);

    // --- 4. Cleanup Function ---
    return () => {
      // Stop observing and remove the chart when the component unmounts
      resizeObserver.disconnect();
      if (chartrefval.current) {
        chartrefval.current.remove();
        chartrefval.current = null;
      }
    };
  }, [xData, yData, ySymbol, xSymbol]);

  useEffect(() => {
    if (!liveData || !ySeriesRef.current || !xSeriesRef.current) {
      return;
    }

    const yUpdate = {
      time: convertToLocalTimestamp(liveData.time),
      // time: new Date(liveData.time).getTime() / 1000,
      open: liveData.y_price,
      high: liveData.y_price,
      low: liveData.y_price,
      close: liveData.y_price,
    };

    const xUpdate = {
      time: convertToLocalTimestamp(liveData.time),
      // time: new Date(liveData.time).getTime() / 1000,
      value: liveData.x_price,
    };

    const regUpdate = {
      time: convertToLocalTimestamp(liveData.time),
      // time: new Date(liveData.time).getTime() / 1000,
      value: liveData.regression_line_value,
    };

    // Use the .update() method to append the new data point
    ySeriesRef.current.update(yUpdate);
    RegressionLineRef.current.update(regUpdate);
    xSeriesRef.current.update(xUpdate);
  }, [liveData]);

  // useEffect(() => {
  //   console.log("Refs Value");

  //   console.log(chart1ref.current);

  //   chartrefval.current.applyOptions({
  //     width: chart1ref.current.clientWidth,
  //     height: chart1ref.current.clientHeight,
  //   });
  // }, [chart1ref.current.clientHeight]);

  return (
    <>
      {/* <div style={{ position: "relative", width: "100%", height: "400px" }}>
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 999,
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
      </div> */}

      <div
        ref={chartContainerRef}
        className="flex"
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
};

export default PriceChart;
