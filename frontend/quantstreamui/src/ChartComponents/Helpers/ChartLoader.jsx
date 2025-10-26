import React, { useState, useEffect } from "react";

const loaders = ["loader1.gif", "loader2.gif", "loader3.gif"];

const ChartLoader = ({ isloadervisible }) => {
  const [selectedLoader, setSelectedLoader] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * loaders.length);
    setSelectedLoader(loaders[randomIndex]);
  }, []);

  return isloadervisible ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#f8f9fa",
      }}
    >
      <img
        src={selectedLoader}
        alt="Loading..."
        style={{ width: "96px", height: "96px" }}
      />
      <p
        style={{
          marginTop: "20px",
          color: "#6c757d",
          fontFamily: "sans-serif",
          fontWeight: "bold",
        }}
      >
        Fetching and analyzing market data...
      </p>
    </div>
  ) : (
    <></>
  );
};

export default ChartLoader;
