import {
  AreaSeries,
  BaselineSeries,
  createChart,
  LineSeries,
  PriceLineSource,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { convertToLocalTimestamp } from "../Helpers/ChartDataHandle";
import ChartLegend from "./ChartLegend";
import { calculateCorrelation } from "./RollingCorrelationCal";

////// data formatter for current chart

const formatLineSeriesData = (apiData, ohlcKey) => {
  if (!apiData || !ohlcKey) return [];

  return apiData
    .filter((d) => d?.[ohlcKey] != null) // Ensure the ohlc data for this key exists
    .map((d) => {
      return {
        time: convertToLocalTimestamp(d["time"]),
        // time: new Date(d[ohlcKey].timestamp).getTime() / 1000,
        value: d[ohlcKey],
      };
    });
};

const formatLineData = (apiData, valueKey) => {
  if (!apiData) return [];
  return apiData
    .map((d) => ({
      time: convertToLocalTimestamp(d.time),
      value: d[valueKey],
    }))
    .filter((d) => d.value != null);
};

/////

const CorrelationChart = ({
  yData,
  xData,
  ySymbol,
  xSymbol,
  liveData,
  symboldata,
  summarydata,
  windowSize,
  timeframeinseconds,
}) => {
  // console.log(xData);

  const chartContainerRef = useRef(null);

  const chartrefval = useRef(null);

  // --- Refs to hold the series objects ---
  const RollingCorrelationSeriesRef = useRef(null);

  const [hoverData, setHoverData] = useState(null);

  ///// calculation data
  const [priceWindow, setPriceWindow] = useState({ y: [], x: [] });
  const lastCandleTimeRef = useRef(null);

  const [correlationlivecaldata, setcorrelationlivecaldata] = useState(null);

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
        scaleMargins: { top: 0.1, bottom: 0.1 },
        overrideMin: -1,
        overrideMax: 1,
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

    // --- SERIES 1: Spread Amount Series on Left   ---
    RollingCorrelationSeriesRef.current = chart.addSeries(BaselineSeries, {
      title: "Rolling Correlation",
      baseValue: { type: "price", price: 0.7 },
      topLineColor: "rgba( 38, 166, 154, 1)",
      topFillColor1: "rgba( 38, 166, 154, 0.28)",
      topFillColor2: "rgba( 38, 166, 154, 0.05)",
      bottomLineColor: "rgba( 239, 83, 80, 1)",
      bottomFillColor1: "rgba( 239, 83, 80, 0.05)",
      bottomFillColor2: "rgba( 239, 83, 80, 0.28)",
    });
    // RollingCorrelationSeriesRef.current = chart.addSeries(LineSeries, {
    //   title: "Correlation",
    //   upColor: "#26a69a",
    //   downColor: "#ef5350",
    //   borderVisible: false,
    //   wickUpColor: "#26a69a",
    //   wickDownColor: "#ef5350",
    //   priceScaleId: "right",
    //   lastValueVisible: true,
    //   priceLineVisible: true,
    //   priceLineColor: "#26a69a",
    // });

    let datavessel = formatLineSeriesData(yData, "rolling_corr");
    RollingCorrelationSeriesRef.current.setData(datavessel);

    setcorrelationlivecaldata(datavessel[datavessel.length - 1]?.value);

    // --- SERIES 2: Setup Refrence Lines  ---

    RollingCorrelationSeriesRef.current.createPriceLine({
      price: -1,
      title: "-1",
      color: "#be1238",
      lineWidth: 2,
      lineStyle: 3, // Dashed line (0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed)
      axisLabelVisible: true,
    });

    RollingCorrelationSeriesRef.current.createPriceLine({
      price: 1,
      title: "1",
      color: "#be1238",
      lineWidth: 2,
      lineStyle: 3, // Dashed line (0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed)
      axisLabelVisible: true,
    });

    RollingCorrelationSeriesRef.current.createPriceLine({
      price: 0.7,
      title: "0.7",
      color: "#02541bff",
      lineWidth: 2,
      lineStyle: 3, // Dashed line (0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed)
      axisLabelVisible: true,
    });

    const dataTimeRange = RollingCorrelationSeriesRef.current.data(); // Or xSeries, they are the same

    if (dataTimeRange.length > 0) {
      //   console.log(dataTimeRange[dataTimeRange.length - 1].time);

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

    chartrefval.current.subscribeCrosshairMove((event) => {
      //   console.log(event);

      // This function fires every time the mouse moves over the chart

      // If the mouse is not on a specific bar/point, clear the hover data
      if (!event.time) {
        setHoverData(null);
        return;
      }

      // The event gives us a map of the series and their values at the hovered point
      const correlationData = event.seriesData.get(
        RollingCorrelationSeriesRef.current
      );

      setHoverData({
        correlation: correlationData?.value,
      });
    });

    const timer = setTimeout(() => {
      if (chartrefval.current) {
        // Check if chart still exists
        const dataTimeRange = RollingCorrelationSeriesRef.current.data();
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
  }, [xData, yData, ySymbol, xSymbol]);

  /// ----- Load historical data ---

  useEffect(() => {
    if (xData) {
      const historicalCorrData = formatLineData(xData, "rolling_corr");

      // Initialize the rolling price window for future calculations
      const initialWindowY = xData
        .slice(-windowSize)
        .map((d) => d.y_ohlc?.close)
        .filter(Boolean);
      const initialWindowX = xData
        .slice(-windowSize)
        .map((d) => d.x_ohlc?.close)
        .filter(Boolean);
      setPriceWindow({ y: initialWindowY, x: initialWindowX });

      // Set the last candle time
      if (historicalCorrData.length > 0) {
        lastCandleTimeRef.current =
          historicalCorrData[historicalCorrData.length - 1].time;
      }
    }
  }, [xData, ySymbol, xSymbol]);

  ///// load calculation data

  useEffect(() => {
    if (!liveData || !lastCandleTimeRef.current) return;

    const liveTime = convertToLocalTimestamp(liveData.time);
    const interval = liveTime - lastCandleTimeRef.current;

    // This assumes a 1-second timeframe for simplicity.
    // A more robust version would get the interval from a prop.

    let timeframsecondmapper = {
      "1s": 1,
      "1m": 60,
      "5m": 300,
    };
    const timeframeSeconds = timeframsecondmapper[timeframeinseconds];

    if (interval >= timeframeSeconds) {
      // A new candle has completed!

      // Update the price window
      const newYPrices = [...priceWindow.y, liveData.y_price];
      const newXPrices = [...priceWindow.x, liveData.x_price];

      if (newYPrices.length > windowSize) {
        newYPrices.shift();
        newXPrices.shift();
      }

      setPriceWindow({ y: newYPrices, x: newXPrices });

      // Recalculate correlation if the window is full
      if (newYPrices.length >= windowSize) {
        const newCorrelation = calculateCorrelation(newXPrices, newYPrices);

        if (newCorrelation !== null && RollingCorrelationSeriesRef.current) {
          const newPointTime =
            Math.floor(liveTime / timeframeSeconds) * timeframeSeconds;

          if (newCorrelation !== null && !isNaN(newCorrelation)) {
            // Update the chart series
            RollingCorrelationSeriesRef.current.update({
              time: newPointTime,
              value: newCorrelation,
            });

            setcorrelationlivecaldata(newCorrelation);
          } else {
            console.log("NaN value test");
          }

          // Update our last candle time reference
          lastCandleTimeRef.current = newPointTime;
        }
      }
    }
  }, [liveData, windowSize]);

  return (
    <>
      <ChartLegend
        ySymbol={ySymbol}
        xSymbol={xSymbol}
        regressionTitle="Expected Price"
        liveData={correlationlivecaldata}
        hoverData={hoverData}
        summarydata={summarydata}
      />

      <div
        ref={chartContainerRef}
        className="flex"
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
};

export default CorrelationChart;
