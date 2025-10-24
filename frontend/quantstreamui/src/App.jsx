import { Badge } from "primereact/badge";
import { Card } from "primereact/card";
import { Menu } from "primereact/menu";
import { useEffect, useRef, useState } from "react";
import { ShowerrorAlert, Showloader } from "./Helpers/Loaderhelper";
import { Dropdown } from "primereact/dropdown";
import { ChevronDownIcon } from "primereact/icons/chevrondown";
import { ChevronRightIcon } from "primereact/icons/chevronright";
import { Toast } from "primereact/toast";
import { SelectButton } from "primereact/selectbutton";

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
          <div>1 Second</div>
        </>
      ),
      value: "1s",
    },
    {
      template: (
        <>
          <div>1 Minute</div>
        </>
      ),
      value: "1m",
    },
    {
      template: (
        <>
          <div>5 Minutes</div>
        </>
      ),
      value: "5m",
    },
  ];

  const [timeframevalue, settimeframevalue] = useState("1s");

  ///////////// Sidebar ///////////////////

  ////// Templates
  const itemRenderer = (item) => (
    <div className="p-menuitem-content">
      <a className="flex align-items-center p-menuitem-link">
        <span className={item.icon} />
        <span className="mx-2">{item.label}</span>
      </a>
    </div>
  );

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
            itemTemplate={timeframeselectiontemplate}
            optionLabel="value"
            options={timeframeoptions}
          />
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
            <span className="text-black-alpha-90 font-bold">
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
      label: "PAIR SELECTION",
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
      label: "ANALYSIS PARAMETERS",
      items: [
        {
          label: "Timeframe",
          icon: "pi pi-cog",
          template: timeframeselectiontemplate,
        },
        {
          label: "Messages",
          icon: "pi pi-inbox",
          badge: 2,
          template: itemRenderer,
        },
        {
          label: "Logout",
          icon: "pi pi-sign-out",
          template: itemRenderer,
        },
      ],
    },
  ];
  return (
    <>
      <Toast ref={notificationtoast} />
      <div className="w-full m-1 p-1 shadow-7 min-h-full h-full min-h-screen border-round-sm grid col">
        <div className="col-3">
          <Menu model={items} className="min-w-full min-h-full" />
        </div>
        <div className="col-9">2</div>
      </div>
    </>
  );
};

export default App;
