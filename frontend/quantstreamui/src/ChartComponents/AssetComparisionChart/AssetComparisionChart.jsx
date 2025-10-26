import { CandlestickSeries, createChart, LineSeries } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import ChartLegend from "./ChartLegend";
import { convertToLocalTimestamp } from "../Helpers/ChartDataHandle";

////// data formatter for current chart

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
      return {
        time: convertToLocalTimestamp(d[ohlcKey].timestamp),
        // time: new Date(d[ohlcKey].timestamp).getTime() / 1000,
        value: valuekey == "close" ? d[ohlcKey][valuekey] : d[valuekey],
      };
    });
};

/////////

const AssetComparisionChart = ({
  yData,
  xData,
  ySymbol,
  xSymbol,
  liveData,
  symboldata,
}) => {
  // console.log(xData);

  const chartContainerRef = useRef(null);

  const chartrefval = useRef(null);

  // --- Refs to hold the series objects ---
  const ySeriesRef = useRef(null);
  const xSeriesRef = useRef(null);
  const RegressionLineRef = useRef(null);

  const [hoverData, setHoverData] = useState(null);

  const lastUpdateTimeRef = useRef(null);

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
      title: ySymbol?.name,
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: "#26a69a",
    });

    const formattedCandlestick = formatCandlestickData(yData, "y_ohlc");

    ySeriesRef.current.setData(formattedCandlestick);

    if (formattedCandlestick.length > 0) {
      // Get the timestamp of the very last historical bar
      const lastHistoricalTime =
        formattedCandlestick[formattedCandlestick.length - 1].time;
      // Set our ref to this time.
      lastUpdateTimeRef.current = lastHistoricalTime;
    }

    // --- SERIES 2: Regression Line on Right as these is expected value of Base ---
    RegressionLineRef.current = chart.addSeries(LineSeries, {
      title: "Regression Line",
      color: "#5a6161ff",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#717776ff",
      wickDownColor: "#ef5350",
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
    });
    RegressionLineRef.current.setData(
      formatLineSeriesData(yData, "y_ohlc", "regression_line_value")
    );

    // --- SERIES 3: Hedge Asset (X) on the LEFT scale ---
    xSeriesRef.current = chart.addSeries(LineSeries, {
      title: xSymbol?.name,
      color: "rgba(41, 98, 255, 0.8)",
      downColor: "rgba(255, 109, 0, 0.8)",
      borderVisible: false,
      wickUpColor: "rgba(41, 98, 255, 0.8)",
      wickDownColor: "rgba(255, 109, 0, 0.8)",
      priceScaleId: "left",
      lastValueVisible: true,
      priceLineVisible: false,
    });
    xSeriesRef.current.setData(formatLineSeriesData(xData, "x_ohlc", "close"));

    const dataTimeRange = ySeriesRef.current.data(); // Or xSeries, they are the same

    if (dataTimeRange.length > 0) {
      // console.log(dataTimeRange[dataTimeRange.length - 1].time);

      const from = dataTimeRange[Math.max(0, dataTimeRange.length - 50)].time; // Start of the window
      const to = dataTimeRange[dataTimeRange.length - 1].time; // End of the window (latest point)

      // 2. Set the visible range
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

    chartrefval.current.subscribeCrosshairMove((event) => {
      // This function fires every time the mouse moves over the chart

      // If the mouse is not on a specific bar/point, clear the hover data
      if (!event.time) {
        setHoverData(null);
        return;
      }

      // The event gives us a map of the series and their values at the hovered point
      const yPriceData = event.seriesData.get(ySeriesRef.current);
      const xPriceData = event.seriesData.get(xSeriesRef.current);
      const regPriceData = event.seriesData.get(RegressionLineRef.current);

      setHoverData({
        // For candlesticks, the value is an object {open, high, low, close}
        yPrice: yPriceData?.close,
        // For line series, the value is just a number in the 'value' property
        xPrice: xPriceData?.value,
        regPrice: regPriceData?.value,
      });
    });

    const timer = setTimeout(() => {
      if (chartrefval.current) {
        // Check if chart still exists
        const dataTimeRange = ySeriesRef.current.data();
        if (dataTimeRange.length > 1) {
          const dataLength = dataTimeRange.length;

          // Use setVisibleLogicalRange as it's the most robust method
          chartrefval.current.timeScale().setVisibleLogicalRange({
            from: Math.max(0, dataLength - 50), // Show last 100 bars
            to: dataLength - 1,
          });
        }
      }
    }, 0);

    // --- 4. Cleanup Function ---
    return () => {
      // Stop observing and remove the chart when the component unmounts
      resizeObserver.disconnect();
      clearTimeout(timer);
      if (chartrefval.current) {
        chartrefval.current.remove();
        chartrefval.current = null;
      }
    };
  }, [xData, yData, ySymbol?.name, xSymbol?.name]);

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
      value: liveData.x_price,
    };

    const regUpdate = {
      time: convertToLocalTimestamp(liveData.time),
      value: liveData.regression_line_value,
    };

    let newTime = convertToLocalTimestamp(liveData.time);
    // If the new time is not strictly greater than the last update time, ignore this packet.
    if (lastUpdateTimeRef.current && newTime <= lastUpdateTimeRef.current) {
      return;
    }

    // If we've passed the guard, update the last update time immediately
    lastUpdateTimeRef.current = newTime;

    // Use the .update() method to append the new data point
    ySeriesRef.current.update(yUpdate);
    RegressionLineRef.current.update(regUpdate);
    xSeriesRef.current.update(xUpdate);
  }, [liveData]);

  return (
    <>
      <ChartLegend
        ySymbol={ySymbol}
        xSymbol={xSymbol}
        regressionTitle="Expected Price"
        liveData={liveData}
        hoverData={hoverData}
      />

      <div
        ref={chartContainerRef}
        className="flex"
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
};

export default AssetComparisionChart;
