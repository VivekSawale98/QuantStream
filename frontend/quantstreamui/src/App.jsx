import { Menu } from "primereact/menu";
import { useEffect, useRef, useState } from "react";
import { ShowerrorAlert, Showloader } from "./Helpers/Loaderhelper";
import { Dropdown } from "primereact/dropdown";
import { ChevronDownIcon } from "primereact/icons/chevrondown";
import { ChevronRightIcon } from "primereact/icons/chevronright";
import { Toast } from "primereact/toast";
import { SelectButton } from "primereact/selectbutton";
import { Dock } from "primereact/dock";
import { Slider } from "primereact/slider";
import { InputText } from "primereact/inputtext";
import PriceChart from "./ChartComponents/PriceChart";
import { Splitter, SplitterPanel } from "primereact/splitter";

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
  const [timeframevalue, settimeframevalue] = useState("1s");

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
              <span className="text-900">QuantStream Analytics Dashboard</span>
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
  const [ySymbol, setYSymbol] = useState("BTCUSDT");
  const [xSymbol, setXSymbol] = useState("ETHUSDT");

  const [liveData, setLiveData] = useState(null);

  const ws = useRef(null);

  const LoadLiveData = () => {
    if (ws.current) {
      ws.current.close();
      console.log("Previous WebSocket connection closed.");
    }

    if (!ySymbol || !xSymbol) return;

    const wsUrl = `ws://127.0.0.1:8000/ws/live-data/${ySymbol}/${xSymbol}`;
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
    // Construct the URL from your state variables
    const url = `http://127.0.0.1:8000/api/chart-data?y_symbol=${ySymbol}&x_symbol=${xSymbol}&timeframe=1s&window=5`;

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
    }
  };

  useEffect(() => {
    loadChartData();
  }, []);

  /////// chart dimensions manager

  const chart1ref = useRef(null);

  return (
    <>
      <Dock
        model={[]}
        magnification={false}
        header={timeframeselectiontemplate}
      />
      <Toast ref={notificationtoast} />
      <div className="w-full m-1 p-1 shadow-7 min-h-full h-full min-h-screen border-round-sm grid col">
        <div className="col-3">
          <Menu model={items} className="min-w-full min-h-full" />
        </div>
        <div className="col-9">
          <Splitter style={{ height: "100vh" }} layout="vertical">
            <SplitterPanel className="flex flex-column">
              <div className="p-p-2">
                <h3>
                  Asset Prices: {ySymbol} vs {xSymbol}
                </h3>
              </div>
              <div className="flex-grow-1">
                {chartData?.timeseries_data ? (
                  <PriceChart
                    yData={chartData.timeseries_data}
                    xData={chartData.timeseries_data}
                    ySymbol={ySymbol}
                    xSymbol={xSymbol}
                    liveData={liveData}
                  />
                ) : (
                  <div className="flex align-items-center justify-content-center h-full"></div>
                )}
              </div>
            </SplitterPanel>
            <SplitterPanel className="flex align-items-center justify-content-center">
              Panel 2
            </SplitterPanel>
          </Splitter>
        </div>
      </div>
    </>
  );
};

export default App;
