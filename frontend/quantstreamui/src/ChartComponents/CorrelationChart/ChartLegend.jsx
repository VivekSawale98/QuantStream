const ChartLegend = ({
  ySymbol,
  xSymbol,
  liveData,
  hoverData,
  regressionTitle,
  summarydata,
}) => {
  const correlationPrice = hoverData
    ? hoverData.correlation?.toFixed(2)
    : liveData?.toFixed(2) || "...";

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
            style={{
              width: "14px",
              height: "2px",
              borderTop: "3px solid #be1238",
            }}
          />
          <span>Correlation</span>
        </div>
        <span style={{ fontWeight: "bold", marginLeft: "20px" }}>
          {correlationPrice}
        </span>
      </div>
    </div>
  );
};

export default ChartLegend;
