const ChartLegend = ({
  ySymbol,
  xSymbol,
  liveData,
  hoverData,
  regressionTitle,
  summarydata,
}) => {
  const spreadPrice = hoverData
    ? hoverData.spreadPrice?.toFixed(2)
    : liveData?.spread?.toFixed(2) || "...";
  const zscorePrice = hoverData
    ? hoverData.zscorePrice?.toFixed(2)
    : liveData?.z_score?.toFixed(2) || "...";

  return (
    <div
      className="shadow-1"
      style={{
        position: "absolute",
        top: "12px",
        left: "20%",
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
            style={{ width: "14px", height: "14px", background: "#26a69a" }}
          />
          <span>Spread Amount for {ySymbol?.name}</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>
          {spreadPrice}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "2px",
              borderTop: "3px solid #be1238",
            }}
          />
          <span>Spread Mean</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>
          {summarydata?.spread_mean
            ? summarydata?.spread_mean.toFixed(2)
            : "..."}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "2px",
              borderTop: "3px solid #5a6161ff",
            }}
          />
          <span>Z-Score</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>
          {zscorePrice}
        </span>
      </div>
    </div>
  );
};

export default ChartLegend;
