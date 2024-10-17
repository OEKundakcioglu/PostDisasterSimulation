import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

interface SimulationConfig {
  [key: string]: string; // All values are strings from the frontend
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const simulationConfig = (await request.json()) as SimulationConfig;

    // Generate the YAML content based on the simulationConfig
    const yamlContent = generateYAML(simulationConfig);

    // Define the path to the YAML file
    const yamlFilePath = path.join(
      process.cwd(),
      "..",
      "src",
      "main",
      "java",
      "data",
      "input_files",
      "azizi.yaml"
    );

    // Write the YAML file
    fs.writeFileSync(yamlFilePath, yamlContent, "utf8");

    // Run the Java simulation
    const simulation = spawn("gradle", ["run", "--quiet", "-PmainClass=Main"], {
      cwd: path.join(process.cwd(), ".."), // Adjusted path
      shell: true, // For Windows compatibility
    });

    let output = "";

    simulation.stdout.on("data", (data) => {
      output += data.toString();
      console.log(`Simulation stdout: ${data.toString()}`);
    });

    simulation.stderr.on("data", (data) => {
      console.error(`Simulation stderr: ${data.toString()}`);
    });

    return new Promise<NextResponse>((resolve, reject) => {
      simulation.on("close", (code) => {
        if (code === 0) {
          // Rest of your code remains the same
          // Parse the output to find the JSON data
          const jsonMarker = "JSON_OUTPUT_START";
          const jsonStartIndex = output.indexOf(jsonMarker);
          if (jsonStartIndex !== -1) {
            const jsonString = output
              .substring(jsonStartIndex + jsonMarker.length)
              .trim();
            if (!jsonString) {
              console.error("No JSON output from simulation");
              return resolve(
                NextResponse.json(
                  { error: "No JSON output from simulation" },
                  { status: 500 }
                )
              );
            }
            let data;
            try {
              data = JSON.parse(jsonString);
            } catch (err) {
              console.error("Error parsing JSON output from simulation:", err);
              return resolve(
                NextResponse.json(
                  { error: "Failed to parse simulation output" },
                  { status: 500 }
                )
              );
            }

            // Ensure the data directory exists
            const dataDirPath = path.join(process.cwd(), "data");
            if (!fs.existsSync(dataDirPath)) {
              fs.mkdirSync(dataDirPath);
            }

            // Store the data in a temporary file for the KPIPage to access
            const dataFilePath = path.join(dataDirPath, "kpiData.json");
            fs.writeFileSync(dataFilePath, JSON.stringify(data), "utf8");

            resolve(NextResponse.json({ success: true }));
          } else {
            console.error("JSON marker not found in simulation output");
            resolve(
              NextResponse.json(
                { error: "Failed to parse simulation output" },
                { status: 500 }
              )
            );
          }
        } else {
          console.error("Simulation failed with exit code:", code);
          reject(new Error("Simulation failed"));
        }
      });

      simulation.on("error", (error) => {
        console.error("Error running simulation:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error running simulation:", error);
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
}

function generateYAML(simulationConfig: SimulationConfig): string {
  const baseYamlFilePath = path.join(
    process.cwd(),
    "..",
    "src",
    "main",
    "java",
    "data",
    "input_files",
    "azizi_base.yaml"
  );

  if (!fs.existsSync(baseYamlFilePath)) {
    throw new Error(`Base YAML file not found at ${baseYamlFilePath}`);
  }

  const baseYamlContent = fs.readFileSync(baseYamlFilePath, "utf8");

  // Extract the simulationConfig section
  const simulationConfigMatch = baseYamlContent.match(
    /simulationConfig:\s*([\s\S]*?)(?=\n\w|$)/
  );
  if (!simulationConfigMatch) {
    throw new Error("simulationConfig section not found in base YAML");
  }
  const simulationConfigSection = simulationConfigMatch[0];

  // Update the simulationConfig section
  const updatedSimulationConfigSection = updateSimulationConfigSection(
    simulationConfigSection,
    simulationConfig
  );

  // Replace the old simulationConfig section with the updated one
  const updatedYamlContent = baseYamlContent.replace(
    simulationConfigSection,
    updatedSimulationConfigSection
  );

  return updatedYamlContent;
}

function updateSimulationConfigSection(
  simulationConfigSection: string,
  newConfig: SimulationConfig
): string {
  const lines = simulationConfigSection.split("\n");
  const updatedLines = lines.map((line) => {
    // Preserve anchor definitions (lines containing '&')
    if (line.includes("&")) {
      return line;
    }
    // Match lines that may be commented out and have a parameter
    const paramMatch = line.match(/^(\s*)#?\s*(\w+):/);
    if (paramMatch) {
      const indent = paramMatch[1]; // Capture indentation
      const paramName = paramMatch[2];
      if (newConfig.hasOwnProperty(paramName)) {
        let value = newConfig[paramName];
        // Special handling for inventoryControlPeriod to include &period
        if (paramName === "inventoryControlPeriod") {
          value = `&period ${value}`;
        }
        // Reconstruct the line with indentation and updated value
        return `${indent}${paramName}: ${value}`;
      } else {
        // If parameter is not in newConfig, keep the line as is (commented or not)
        return line;
      }
    } else {
      // Lines that don't match parameters are left unchanged
      return line;
    }
  });
  return updatedLines.join("\n");
}
