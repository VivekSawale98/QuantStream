import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Chip } from "primereact/chip";
import { SelectButton } from "primereact/selectbutton";
import { useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { Showloader } from "../Helpers/Loaderhelper";

const AlertCreationForm = ({
  isalertformvisible,
  setisalertformvisible,
  baseasset,
  hedgeasset,
  setalertdata,
}) => {
  const [conditionvalue, setconditionvalue] = useState(">");
  const [alertvalue, setalertvalue] = useState(2.0);

  const conditionOptions = [
    { icon: "pi pi-arrow-up-right", name: "Greater Than", value: ">" },
    { icon: "pi pi-arrow-down-right", name: "Less Than", value: "<" },
  ];

  const conditionTemplate = (option) => {
    return (
      <>
        <i className={option.icon}></i>&nbsp;
        <span>{option.name}</span>
      </>
    );
  };

  const submitdata = async () => {
    let requestbody = {
      symbol_pair: `${baseasset?.symbol}/${hedgeasset?.symbol}`,
      metric: "Z-Score",
      condition: conditionvalue == null ? 2 : conditionvalue,
      value: alertvalue,
    };

    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestbody),
    };
    let fetchcreatalert = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/alerts`,
      options
    );

    if (!fetchcreatalert.ok) {
      ShowerrorAlert(
        "Unable to create Alert",
        "please refresh the page and try again"
      );
    }
    let maindata = await fetchcreatalert.json();
    setalertdata((val) => {
      let data = JSON.parse(JSON.stringify(val));

      let isalertexist = data.filter((val) => {
        return val.id == maindata?.id;
      });

      if (!(isalertexist != null && isalertexist.length > 0)) {
        data.push(maindata);
      }

      return data;
    });

    setisalertformvisible(false);
  };

  return (
    <>
      {baseasset && hedgeasset ? (
        <Dialog
          header={
            <>
              <div className="flex flex-row justify-content-center">
                <i className="pi pi-bell" style={{ fontSize: "1.5rem" }}></i>
                <div>&nbsp;&nbsp;Create Alert</div>
              </div>
            </>
          }
          visible={isalertformvisible}
          style={{ width: "85vw", zIndex: 99999999999 }}
          breakpoints={{ "960px": "75vw", "641px": "100vw" }}
          onHide={() => {
            if (!isalertformvisible) return;
            setisalertformvisible(false);
          }}
          position="top"
        >
          <>
            <div className="flex flex-column">
              <div className="flex flex-row justify-content-center">
                <div className="flex flex-row">
                  <div className="mt-auto mb-auto font-bold">Base Asset:</div>
                  <div>
                    &nbsp;
                    <Chip label={baseasset?.name} image={baseasset?.link} />
                  </div>
                </div>
                &nbsp; &nbsp;
                <div className="flex flex-row">
                  <div className="mt-auto mb-auto font-bold">Hedge Asset:</div>
                  <div>
                    &nbsp;
                    <Chip label={hedgeasset?.name} image={hedgeasset?.link} />
                  </div>
                </div>
              </div>
              <br />
              <br />
              <div className="font-bold flex flex-column xl:flex-row lg:flex-column md:flex-column sm:flex-column ">
                <span className="mt-auto mb-auto">
                  Send me an alert when the Z-Score is
                </span>
                &nbsp; &nbsp;
                <SelectButton
                  value={conditionvalue}
                  onChange={(e) => setconditionvalue(e.value)}
                  itemTemplate={conditionTemplate}
                  optionLabel="value"
                  options={conditionOptions}
                  className="md:my-2"
                />
                <div>
                  <InputNumber
                    inputId="horizontal-buttons"
                    value={alertvalue}
                    onValueChange={(e) => {
                      if (!e.value) {
                        setalertvalue(2);
                      } else {
                        setalertvalue(e.value);
                      }
                    }}
                    showButtons
                    buttonLayout="horizontal"
                    step={0.1}
                    decrementButtonClassName="p-button-danger"
                    incrementButtonClassName="p-button-success"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                    mode="decimal"
                    className="w-1 max-w-1rem my-2 md:my-2 "
                    max={5.0}
                    min={0.5}
                  />
                </div>
              </div>
              <div className="flex flex-row justify-content-center mt-4">
                <Button
                  label="Save"
                  icon="pi pi-check"
                  onClick={() => {
                    submitdata();
                  }}
                />
                <Button
                  label="Cancel"
                  icon="pi pi-times"
                  className="ml-2"
                  onClick={() => {
                    setisalertformvisible(false);
                  }}
                />
              </div>
            </div>
          </>
        </Dialog>
      ) : (
        <></>
      )}
    </>
  );
};

export default AlertCreationForm;
