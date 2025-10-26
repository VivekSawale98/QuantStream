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

////// data formatter for current chart

const formatAreaSeriesData = (apiData, ohlcKey) => {
  if (!apiData || !ohlcKey) return [];

  return apiData
    .filter((d) => d?.[ohlcKey] != null) // Ensure the ohlc data for this key exists
    .map((d) => {
      // The API returns time in the main object, and OHLC in a nested one.
      // We need to flatten this into the structure the chart expects.
      return {
        time: convertToLocalTimestamp(d["time"]),
        // time: new Date(d[ohlcKey].timestamp).getTime() / 1000,
        value: d[ohlcKey],
      };
    });
};

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

/////

const SpreadZscoreChart = ({
  yData,
  xData,
  ySymbol,
  xSymbol,
  liveData,
  symboldata,
  summarydata,
}) => {
  // console.log(xData);

  const chartContainerRef = useRef(null);

  const chartrefval = useRef(null);

  // --- Refs to hold the series objects ---
  const SpreadSeriesRef = useRef(null);
  const ZScoreLineRef = useRef(null);

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

    // --- SERIES 1: Spread Amount Series on Left   ---
    SpreadSeriesRef.current = chart.addSeries(AreaSeries, {
      title: "Spread",
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceScaleId: "left",
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: "#26a69a",
    });

    let formattedAreaSeriesData = formatAreaSeriesData(yData, "spread");
    SpreadSeriesRef.current.setData(formattedAreaSeriesData);

    if (formattedAreaSeriesData.length > 0) {
      // Get the timestamp of the very last historical bar
      const lastHistoricalTime =
        formattedAreaSeriesData[formattedAreaSeriesData.length - 1].time;
      // Set our ref to this time.
      lastUpdateTimeRef.current = lastHistoricalTime;
    }

    // --- SERIES 2: Z-score Standara Amount on Right ---
    ZScoreLineRef.current = chart.addSeries(LineSeries, {
      title: "Z-Score",
      color: "#5a6161ff",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#717776ff",
      wickDownColor: "#ef5350",
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
    });

    ZScoreLineRef.current.setData(formatLineSeriesData(yData, "z_score"));

    // --- SERIES 3: Spread Mean on Left  ---
    SpreadSeriesRef.current.createPriceLine({
      price: summarydata?.spread_mean,
      title: "Spread Mean",
      color: "#be1238",
      lineWidth: 2,
      lineStyle: 3, // Dashed line (0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed)
      axisLabelVisible: true,
    });

    const dataTimeRange = SpreadSeriesRef.current.data(); // Or xSeries, they are the same

    if (dataTimeRange.length > 0) {
      // console.log(dataTimeRange[dataTimeRange.length - 1].time);

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
      const spreadPriceData = event.seriesData.get(SpreadSeriesRef.current);
      const zScorePriceData = event.seriesData.get(ZScoreLineRef.current);

      setHoverData({
        spreadPrice: spreadPriceData?.value,
        // For line series, the value is just a number in the 'value' property
        zscorePrice: zScorePriceData?.value,
      });
    });

    const timer = setTimeout(() => {
      if (chartrefval.current) {
        // Check if chart still exists
        const dataTimeRange = SpreadSeriesRef.current.data();
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

  useEffect(() => {
    if (!liveData || !SpreadSeriesRef.current) {
      return;
    }

    const spreadUpdate = {
      time: convertToLocalTimestamp(liveData.time),
      value: liveData.spread,
    };

    const ZscoreUpdate = {
      time: convertToLocalTimestamp(liveData.time),
      value: liveData.z_score,
    };

    let newTime = convertToLocalTimestamp(liveData.time);
    // If the new time is not strictly greater than the last update time, ignore this packet.
    if (lastUpdateTimeRef.current && newTime <= lastUpdateTimeRef.current) {
      return;
    }

    // Use the .update() method to append the new data point
    SpreadSeriesRef.current.update(spreadUpdate);
    ZScoreLineRef.current.update(ZscoreUpdate);
  }, [liveData]);

  return (
    <>
      <ChartLegend
        ySymbol={ySymbol}
        xSymbol={xSymbol}
        regressionTitle="Expected Price"
        liveData={liveData}
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

export default SpreadZscoreChart;
