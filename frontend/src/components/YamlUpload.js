import React, { useState } from "react";

function YamlUpload() {
  const [yamlPath, setYamlPath] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("Validating YAML...");

    try {
      // First validate the YAML
      const validateResponse = await fetch(
        "http://localhost:8083/api/validate-yaml",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ yamlFilePath: yamlPath }),
        }
      );

      const validateData = await validateResponse.json();

      if (!validateData.valid) {
        setStatus(`Error: ${validateData.message}`);
        setIsLoading(false);
        return;
      }

      setStatus("Starting simulation...");

      // Then start the simulation
      const response = await fetch(
        "http://localhost:8083/api/process-simulation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ yamlFilePath: yamlPath }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus(`Success: ${data.message}`);
      } else {
        setStatus(`Error: ${data.message}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Start Simulation with YAML Configuration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            YAML File Path:
            <input
              type="text"
              value={yamlPath}
              onChange={(e) => setYamlPath(e.target.value)}
              placeholder="data/input_files/input.yaml"
              style={{ width: "300px", marginLeft: "10px" }}
            />
          </label>
          <p style={{ fontSize: "0.8rem", color: "#666" }}>
            You can use absolute paths or paths relative to the project root
          </p>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Start Simulation"}
        </button>
      </form>
      {status && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: status.includes("Error") ? "#ffecec" : "#eaffea",
            borderRadius: "4px",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}

export default YamlUpload;
