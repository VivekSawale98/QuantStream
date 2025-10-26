import { Dock } from "primereact/dock";
import { Dropdown } from "primereact/dropdown";
import { ChevronDownIcon } from "primereact/icons/chevrondown";
import { ChevronRightIcon } from "primereact/icons/chevronright";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import { SelectButton } from "primereact/selectbutton";
import { Slider } from "primereact/slider";
import { Toast } from "primereact/toast";
import { Message } from "primereact/message";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { ShowerrorAlert } from "./Helpers/Loaderhelper";

import { Mosaic, MosaicWindow } from "react-mosaic-component";

import "react-mosaic-component/react-mosaic-component.css";
import AssetComparisionChart from "./ChartComponents/AssetComparisionChart/AssetComparisionChart";
import ChartLoader from "./ChartComponents/Helpers/ChartLoader";
import SpreadZscoreChart from "./ChartComponents/SpreadZscoreChart/SpreadZscoreChart";
import CorrelationChart from "./ChartComponents/CorrelationChart/CorrelationChart";

const App = () => {
  ///// Notification Manager

  const notificationtoast = useRef(null);

  const showNotification = (issticky, severity, content, summary, lifeval) => {
    notificationtoast.current.show({
      severity: severity,
      summary: summary,
      detail: content,
      sticky: issticky,
      life: lifeval,
    });
  };
  //////////////// Component State //////////////////////

  ////// Pair selection data

  ///// Symbol data for pairs
  const [symboldata, setsymboldata] = useState([]);

  useEffect(() => {
    const loadsymboldata = async () => {
      let fetchsymboldata = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/detailsymbols`
      );

      if (!fetchsymboldata.ok) {
        ShowerrorAlert(
          "Unable to fetch symbols for pair selection",
          "please refresh the page and try again"
        );
      }
      let maindata = await fetchsymboldata.json();

      setsymboldata(maindata);
    };
    loadsymboldata();
  }, []);

  //// selected pairs

  const [paironeselectionbaseY, setpaironeselectionbaseY] = useState(null);

  const [paironeselectionhedgeX, setpaironeselectionhedgeX] = useState(null);

  const [paironeselectionbaseYref, setpaironeselectionbaseYref] =
    useState(null);

  const [paironeselectionhedgeXref, setpaironeselectionhedgeXref] =
    useState(null);

  ///// analysis parameters

  /// timeframe

  const timeframeoptions = [
    {
      template: (
        <>
          <span className="text-black-alpha-90">1 Second</span>
        </>
      ),
      value: "1s",
    },
    {
      template: (
        <>
          <span className="text-black-alpha-90">1 Minute</span>
        </>
      ),
      value: "1m",
    },
    {
      template: (
        <>
          <span className="text-black-alpha-90">5 Minutes</span>
        </>
      ),
      value: "5m",
    },
  ];

  const timeframeselectiontemplateselectbtn = (option) => {
    return option?.template;
  };
  const [timeframevalue, settimeframevalue] = useState("1m");

  /// rolling window value

  const [rollingwindowvalueinput, setrollingwindowvalueinput] = useState(10);
  const [rollingwindowvalue, setrollingwindowvalue] = useState(10);

  ///////////// Sidebar ///////////////////

  ////// Templates

  const selectedAssetPairTemplate = (option, props) => {
    if (option) {
      return (
        <div className="flex align-items-center">
          <img
            src={`${option.link}`}
            alt={option.name}
            style={{ width: 24, height: 24, marginRight: 8 }}
          />
          <div>{option.name}</div>
        </div>
      );
    }

    return <span>{props.placeholder}</span>;
  };

  const SelectedPairOptionTemplate = (option) => {
    return (
      <div className="flex align-items-center">
        <img
          src={`${option.link}`}
          alt={option.name}
          style={{ width: 24, height: 24, marginRight: 8 }}
        />
        <div>{option.name}</div>
      </div>
    );
  };

  const pairselectiononetemplate = (item) => {
    return (
      <>
        <div className="card flex flex-column justify-content-center p-2 ml-2">
          <label
            htmlFor="paironeselectionbaseY"
            className="font-semibold block mb-2 text-center"
          >
            Base Asset (Y)
          </label>
          <Dropdown
            value={paironeselectionbaseY}
            onChange={(e) => {
              if (
                paironeselectionhedgeX == null ||
                paironeselectionhedgeX?.symbol != e.value?.symbol
              ) {
                setpaironeselectionbaseY(e.value);
                setpaironeselectionbaseYref(e);
              } else {
                showNotification(
                  false,
                  "warn",
                  "Symbol is already selected in Hedge Asset (X)",
                  "Warning - Select different symbol",
                  4000
                );
              }
            }}
            options={symboldata}
            optionLabel="name"
            placeholder="Select a Symbol"
            valueTemplate={selectedAssetPairTemplate}
            itemTemplate={SelectedPairOptionTemplate}
            className="w-full"
            dropdownIcon={(opts) => {
              return opts.iconProps["data-pr-overlay-visible"] ? (
                <ChevronRightIcon {...opts.iconProps} />
              ) : (
                <ChevronDownIcon {...opts.iconProps} />
              );
            }}
            id="paironeselectionbaseY"
          />
        </div>{" "}
      </>
    );
  };

  const pairselectiontwotemplate = (item) => {
    return (
      <>
        <div className="card flex flex-column justify-content-center p-2 ml-2">
          <label
            htmlFor="paironeselectionhedgeX"
            className="font-semibold block mb-2 text-center"
          >
            Hedge Asset (X)
          </label>
          <Dropdown
            value={paironeselectionhedgeX}
            onChange={(e) => {
              if (
                paironeselectionbaseY == null ||
                paironeselectionbaseY?.symbol != e.value?.symbol
              ) {
                setpaironeselectionhedgeX(e.value);
                setpaironeselectionhedgeXref(e);
              } else {
                showNotification(
                  false,
                  "warn",
                  "Symbol is already selected in Base Asset (Y)",
                  "Warning - Select different symbol",
                  4000
                );
              }
            }}
            options={symboldata}
            optionLabel="name"
            placeholder="Select a Symbol"
            valueTemplate={selectedAssetPairTemplate}
            itemTemplate={SelectedPairOptionTemplate}
            className="w-full"
            dropdownIcon={(opts) => {
              return opts.iconProps["data-pr-overlay-visible"] ? (
                <ChevronRightIcon {...opts.iconProps} />
              ) : (
                <ChevronDownIcon {...opts.iconProps} />
              );
            }}
            id="paironeselectionhedgeX"
          />
        </div>{" "}
      </>
    );
  };

  const timeframeselectiontemplate = (item) => {
    return (
      <>
        <div className="card flex justify-content-center">
          <SelectButton
            value={timeframevalue}
            onChange={(e) => settimeframevalue(e.value)}
            itemTemplate={timeframeselectiontemplateselectbtn}
            optionLabel="value"
            options={timeframeoptions}
          />
        </div>
      </>
    );
  };

  const rollingwindowtemplate = (item) => {
    return (
      <>
        <div className="card flex justify-content-center">
          <div className="w-14rem">
            <label
              htmlFor="rollingwindowparam"
              className="font-semibold block mb-2 text-center"
            >
              Rolling Window
            </label>
            <InputText
              value={rollingwindowvalueinput}
              onBlur={(e) => {
                if (isNaN(parseInt(e.target.value)) || e.target.value < 10) {
                  setrollingwindowvalue(10);
                  setrollingwindowvalueinput(10);
                } else if (e.target.value > 200) {
                  setrollingwindowvalue(200);
                  setrollingwindowvalueinput(200);
                } else {
                  setrollingwindowvalue(e.target.value);
                  setrollingwindowvalueinput(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key == "Enter") {
                  if (isNaN(parseInt(e.target.value)) || e.target.value < 10) {
                    setrollingwindowvalue(10);
                    setrollingwindowvalueinput(10);
                  } else if (e.target.value > 200) {
                    setrollingwindowvalue(200);
                    setrollingwindowvalueinput(200);
                  } else {
                    setrollingwindowvalue(e.target.value);
                    setrollingwindowvalueinput(e.target.value);
                  }
                }
              }}
              onChange={(e) => setrollingwindowvalueinput(e.target.value)}
              className="w-full"
            />
            <Slider
              value={rollingwindowvalue}
              onChange={(e) => setrollingwindowvalue(e.value)}
              className="w-full"
              id="rollingwindowparam"
              min={10}
              max={200}
              e
            />
          </div>
        </div>
      </>
    );
  };

  //////

  let items = [
    {
      template: () => {
        return (
          <span className="inline-flex align-items-center gap-1 px-2 py-2">
            <i className="pi pi-chart-bar p-2"></i>
            <span className="text-black-alpha-90 font-bold text-center">
              <span className="text-lg">QuantStream Analytics Dashboard</span>
            </span>
          </span>
        );
      },
    },
    {
      separator: true,
    },
    {
      label: (
        <>
          <div className="text-center">PAIR SELECTION</div>
        </>
      ),
      items: [
        {
          label: "Base Asset (Y)",
          icon: "pi pi-plus",
          template: pairselectiononetemplate,
        },
        {
          label: "Hedge Asset (X)",
          icon: "pi pi-search",
          template: pairselectiontwotemplate,
        },
      ],
    },
    { separator: true },
    {
      label: (
        <>
          <div className="text-center">ANALYSIS PARAMETERS</div>
        </>
      ),
      items: [
        {
          label: "Rolling Window",
          icon: "pi pi-inbox",
          template: rollingwindowtemplate,
        },
      ],
    },
  ];

  ///// chart data manager

  const [chartData, setChartData] = useState(null);

  const [isloading, setisloading] = useState(false);

  const [liveData, setLiveData] = useState(null);

  const ws = useRef(null);

  const LoadLiveData = () => {
    if (ws.current) {
      ws.current.close();
      console.log("Previous WebSocket connection closed.");
    }

    if (!paironeselectionbaseY || !paironeselectionhedgeX) return;

    const wsUrl = `ws://${
      import.meta.env.VITE_BACKEND_URL_WEBSOCKET
    }/ws/live-data/${paironeselectionbaseY?.symbol}/${
      paironeselectionhedgeX?.symbol
    }`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log(`WebSocket connected to ${wsUrl}`);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Update our live data state with the new packet
      setLiveData(message);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected.");
    };
  };

  const loadChartData = async () => {
    setisloading(true);
    // Construct the URL from your state variables
    const url = `${import.meta.env.VITE_BACKEND_URL}/api/chart-data?y_symbol=${
      paironeselectionbaseY?.symbol
    }&x_symbol=${
      paironeselectionhedgeX?.symbol
    }&timeframe=${timeframevalue}&window=${rollingwindowvalue}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();

        setChartData(data); // Save the fetched data in our state
        LoadLiveData();
      } else {
        // Handle errors as we discussed before
        console.error("Failed to fetch chart data");
      }
    } catch (error) {
      console.error("API request failed:", error);
    } finally {
      setisloading(false);
    }
  };

  useEffect(() => {
    if (paironeselectionhedgeX && paironeselectionbaseY) {
      setLiveData(null);
      setChartData(null);
      loadChartData();
    }
  }, [
    paironeselectionbaseY,
    paironeselectionhedgeX,
    rollingwindowvalue,
    timeframevalue,
  ]);

  /////// chart dimensions manager

  const chart1ref = useRef(null);

  const [layoutcycle, setlayoutcycle] = useState();

  const [currentLayout, setCurrentLayout] = useState({
    direction: "row",
    first: "sidebar-locked-component",
    second: {
      direction: "column",
      first: "assetprice-comparision--component",
      second: {
        direction: "row",
        first: "spread&zscore--component",
        second: "rollingCorrelation--component",
        splitPercentage: 50,
      },
      splitPercentage: 50,
    },
    splitPercentage: 20,
  });

  const handleLayoutChange = (newLayout) => {
    console.log(newLayout);

    if (newLayout.splitPercentage !== 20) {
      newLayout.splitPercentage = 20;
    }
    setCurrentLayout(newLayout);
  };

  const ComponentMapper = {
    "sidebar-locked-component": (
      <>
        <Menu model={items} className="min-w-full min-h-full" />
      </>
    ),
    "assetprice-comparision--component": (
      <>
        {chartData?.timeseries_data &&
        paironeselectionbaseY &&
        paironeselectionhedgeX ? (
          <AssetComparisionChart
            yData={chartData.timeseries_data}
            xData={chartData.timeseries_data}
            ySymbol={paironeselectionbaseY}
            xSymbol={paironeselectionhedgeX}
            liveData={liveData}
            symboldata={symboldata}
          />
        ) : isloading ? (
          <ChartLoader isloadervisible={isloading} />
        ) : (
          <div className="flex align-items-center justify-content-center h-full">
            <Message
              severity="info"
              text={
                !paironeselectionbaseY && !paironeselectionhedgeX
                  ? `Please select Base & Hedge Assets`
                  : `Select ${!paironeselectionbaseY ? "Base" : "Hedge"} asset`
              }
            />
          </div>
        )}
      </>
    ),
    "spread&zscore--component": (
      <>
        {chartData?.timeseries_data &&
        paironeselectionbaseY &&
        paironeselectionhedgeX ? (
          <SpreadZscoreChart
            yData={chartData.timeseries_data}
            xData={chartData.timeseries_data}
            ySymbol={paironeselectionbaseY}
            xSymbol={paironeselectionhedgeX}
            liveData={liveData}
            symboldata={symboldata}
            summarydata={chartData.analytics_summary}
          />
        ) : isloading ? (
          <ChartLoader isloadervisible={isloading} />
        ) : (
          <div className="flex align-items-center justify-content-center h-full">
            <Message
              severity="info"
              text={
                !paironeselectionbaseY && !paironeselectionhedgeX
                  ? `Please select Base & Hedge Assets`
                  : `Select ${!paironeselectionbaseY ? "Base" : "Hedge"} asset`
              }
            />
          </div>
        )}
      </>
    ),
    "rollingCorrelation--component": (
      <>
        {chartData?.timeseries_data &&
        paironeselectionbaseY &&
        paironeselectionhedgeX ? (
          <CorrelationChart
            yData={chartData.timeseries_data}
            xData={chartData.timeseries_data}
            ySymbol={paironeselectionbaseY}
            xSymbol={paironeselectionhedgeX}
            liveData={liveData}
            symboldata={symboldata}
            summarydata={chartData.analytics_summary}
            windowSize={rollingwindowvalue}
            timeframeinseconds={timeframevalue}
          />
        ) : isloading ? (
          <ChartLoader isloadervisible={isloading} />
        ) : (
          <div className="flex align-items-center justify-content-center h-full">
            <Message
              severity="info"
              text={
                !paironeselectionbaseY && !paironeselectionhedgeX
                  ? `Please select Base & Hedge Assets`
                  : `Select ${!paironeselectionbaseY ? "Base" : "Hedge"} asset`
              }
            />
          </div>
        )}
      </>
    ),
  };

  const windowtitlemapper = {
    "sidebar-locked-component": "",
    "assetprice-comparision--component": "",
    "spread&zscore--component": "",
    "rollingCorrelation--component": "",
  };

  return (
    <>
      <Dock
        model={[]}
        magnification={false}
        header={timeframeselectiontemplate}
        style={{
          zIndex: 99999,
          marginLeft: "10%",
        }}
      />
      <Toast ref={notificationtoast} />
      <style>{`
        .mosaic-window-toolbar {
          min-height: 10px !important;
          height: 5px !important;
          padding: 10px 16px !important;
        }
        .hide-toolbar .mosaic-window-toolbar {
          display: none !important;
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        <Mosaic
          value={currentLayout}
          onChange={handleLayoutChange}
          renderTile={(id, path) => {
            return (
              <MosaicWindow
                path={path}
                title={
                  <>
                    <div>{windowtitlemapper[id]}</div>
                  </>
                }
                draggable={!(id.indexOf("-locked-") >= 0)}
                toolbarControls={[<></>]}
                className={!(id.indexOf("-locked-") >= 0) ? "" : "hide-toolbar"}
              >
                {ComponentMapper[id]}
              </MosaicWindow>
            );
          }}
          // Enable/disable resize
          resize={{ minimumPaneSizePercentage: 10 }}
          // CSS class for styling
          className="mosaic-blueprint-theme"
        />
      </div>
    </>
  );
};

export default App;
