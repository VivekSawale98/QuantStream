const ChartLegend = ({
  ySymbol,
  xSymbol,
  liveData,
  hoverData,
  regressionTitle,
}) => {
  const yPrice = hoverData
    ? hoverData.yPrice?.toFixed(2)
    : liveData?.y_price?.toFixed(2) || "...";
  const xPrice = hoverData
    ? hoverData.xPrice?.toFixed(2)
    : liveData?.x_price?.toFixed(2) || "...";
  const regPrice = hoverData
    ? hoverData.regPrice?.toFixed(2)
    : liveData?.regression_line_value?.toFixed(2) || "...";

  return (
    <div
      className="shadow-1"
      style={{
        position: "absolute",
        top: "12px",
        left: "10%",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: "transparent",
        backdropFilter: "blur(4px)",
        padding: "8px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "sans-serif",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "2px",
              borderTop: "3px solid #5a6161ff",
            }}
          />
          <span>{regressionTitle}</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>
          {regPrice}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{ width: "14px", height: "14px", background: "#26a69a" }}
          />
          <span>{ySymbol?.name} (Base Asset)</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>{yPrice}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "2px",
              background: "blue",
              border: "1px solid blue",
            }}
          />
          <span>{xSymbol?.name} (Hedge Asset)</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>{xPrice}</span>
      </div>
    </div>
  );
};

export default ChartLegend;
