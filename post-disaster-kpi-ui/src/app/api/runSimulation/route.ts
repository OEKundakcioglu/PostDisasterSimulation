import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const integerFields = new Set([
  // Simulation Config
  "seedDemandTime",
  "seedDemandQuantity",
  "seedItemDuration",
  "seedSupplyDisruptionTime",
  "seedSupplyDisruptionDuration",
  "seedMigrationTime",
  "seedMigrationQuantity",
  "seedFundingTime",
  "seedFundingAmount",
  "seedReplenishmentTime",
  "seedTransferTime",
  "seedTransshipmentTime",
  "inventoryControlPeriod",
  "planningHorizon",
  // Counts
  "periodicCounts",
  "centralPeriodicCounts",
  // Populations
  "initialInternalPopulation",
  "initialExternalPopulation",
  // Inventory Levels
  "initialInventory",
  "initialCentralWarehouseInventory",
  "earmarkedFunds",
  "initialEarmarkedInKind",
]);

function formatValue(key: string, value: any): string {
  if (typeof value === "boolean") {
    return value.toString();
  }

  if (integerFields.has(key)) {
    return parseInt(value).toString();
  }

  if (!isNaN(parseFloat(value))) {
    return parseFloat(value).toString();
  }

  // Return the value as is for strings
  return value;
}

/**
 * Generates the YAML content based on the user inputs.
 * @param data - The data object containing all simulation parameters.
 * @returns A string representing the generated YAML content.
 */
function generateYAML(data: any): string {
  let yamlContent = "";

  // Create maps for item and camp anchors
  const itemAnchorMap = new Map<string, string>();
  data.items.forEach((item: any) => {
    let itemAnchor = "";
    if (item.name === "HygieneKit") {
      itemAnchor = "goods";
    } else if (item.name === "Medicine") {
      itemAnchor = "medicine";
    } else {
      itemAnchor = item.name.replace(/\s+/g, "_");
    }
    itemAnchorMap.set(item.name, itemAnchor);
  });

  // Assign anchors to camps with custom names
  const campAnchorMap = new Map<string, string>();
  data.camps.forEach((camp: any) => {
    let campAnchor = "";
    switch (camp.name) {
      case "Hatay-1":
        campAnchor = "hatay1";
        break;
      case "Hatay-2":
        campAnchor = "hatay2";
        break;
      case "Hatay-3":
        campAnchor = "hatay3";
        break;
      case "Adana":
        campAnchor = "adana";
        break;
      case "Osmaniye":
        campAnchor = "osmaniye";
        break;
      case "Kilis":
        campAnchor = "kilis";
        break;
      case "Kahramanmaraş":
        campAnchor = "kahramanmaras";
        break;
      default:
        campAnchor = camp.name.replace(/\s+/g, "_");
    }
    campAnchorMap.set(camp.name, campAnchor);
  });

  // **Define Anchored Fields**
  const anchoredFields: { [key: string]: string } = {
    inventoryControlPeriod: "&period",
    campBuffer: "&campBuffer",
    centralBuffer: "&centralBuffer",
  };

  // **Update SimulationConfig**
  yamlContent += "simulationConfig:\n";
  for (const [key, value] of Object.entries(data.simulationConfig)) {
    if (key in anchoredFields) {
      yamlContent += `  ${key}: ${anchoredFields[key]} ${formatValue(
        key,
        value
      )}\n`;
    } else {
      yamlContent += `  ${key}: ${formatValue(key, value)}\n`;
    }
  }

  // items
  yamlContent += "items:\n";
  for (const item of data.items) {
    const itemAnchor = itemAnchorMap.get(item.name);
    yamlContent += `  - &${itemAnchor}\n`;
    yamlContent += `    name: ${item.name}\n`;
    yamlContent += `    isPerishable: ${item.isPerishable}\n`;
    // Numeric fields
    yamlContent += `    price: ${formatValue("price", item.price)}\n`;
    yamlContent += `    orderingCost: ${formatValue(
      "orderingCost",
      item.orderingCost
    )}\n`;
    yamlContent += `    holdingCost: ${formatValue(
      "holdingCost",
      item.holdingCost
    )}\n`;
    yamlContent += `    deprivationRate: ${formatValue(
      "deprivationRate",
      item.deprivationRate
    )}\n`;
    yamlContent += `    deprivationCoefficient: ${formatValue(
      "deprivationCoefficient",
      item.deprivationCoefficient
    )}\n`;
    yamlContent += `    referralCost: ${formatValue(
      "referralCost",
      item.referralCost
    )}\n`;

    // Include durationData if the item is perishable
    if (item.isPerishable) {
      if (!item.durationData) {
        console.error(
          `Item "${item.name}" is perishable but durationData is missing.`
        );
        throw new Error(
          `Item "${item.name}" is perishable but durationData is missing.`
        );
      }

      yamlContent += `    durationData:\n`;
      yamlContent += `      distributionType: ${item.durationData.distributionType}\n`;
      yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
        item.durationData.distributionType
      )}\n`;
      yamlContent += formatDistParameters(item.durationData.distParameters, 8);
    }

    // leadTimeData
    yamlContent += `    leadTimeData:\n`;
    yamlContent += `      distributionType: ${item.leadTimeData.distributionType}\n`;
    yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
      item.leadTimeData.distributionType
    )}\n`;
    yamlContent += formatDistParameters(item.leadTimeData.distParameters, 8);
  }

  // camps
  yamlContent += "camps:\n";
  for (const camp of data.camps) {
    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `  - &${campAnchor}\n`;
    yamlContent += `    name: ${camp.name}\n`;

    // leadTimeData
    yamlContent += `    leadTimeData:\n`;
    yamlContent += `      distributionType: ${camp.leadTimeData.distributionType}\n`;
    yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
      camp.leadTimeData.distributionType
    )}\n`;
    yamlContent += formatDistParameters(camp.leadTimeData.distParameters, 8);

    // demands
    yamlContent += `    demands:\n`;
    for (const demand of camp.demands) {
      const itemAnchor = itemAnchorMap.get(demand.item);
      yamlContent += `      - item: *${itemAnchor}\n`;
      yamlContent += `        demandTimingType: ${demand.demandTimingType}\n`;
      yamlContent += `        demandQuantityType: ${demand.demandQuantityType}\n`;

      yamlContent += `        arrivalData:\n`;
      yamlContent += `          distributionType: ${demand.arrivalData.distributionType}\n`;
      yamlContent += `          distParameters: !!data.distribution.${getDistTypeTag(
        demand.arrivalData.distributionType
      )}\n`;
      yamlContent += formatDistParameters(
        demand.arrivalData.distParameters,
        12
      );

      yamlContent += `        internalRatio: ${Number(demand.internalRatio)}\n`;
      yamlContent += `        externalRatio: ${Number(demand.externalRatio)}\n`;
    }

    yamlContent += `    campExternalDemandSatisfactionType: ${camp.campExternalDemandSatisfactionType}\n`;
    yamlContent += `    populationType: ${camp.populationType}\n`;
    yamlContent += `    initialInternalPopulation: ${Number(
      camp.initialInternalPopulation
    )}\n`;
    yamlContent += `    initialExternalPopulation: ${Number(
      camp.initialExternalPopulation
    )}\n`;
  }

  // agencies
  yamlContent += "agencies:\n";
  for (const agency of data.agencies) {
    yamlContent += `  - name: ${agency.name}\n`;
    yamlContent += `    fundingArray:\n`;
    for (const funding of agency.fundingArray) {
      yamlContent += `      - fundingType: ${funding.fundingType}\n`;

      // arrivalData
      yamlContent += `        arrivalData:\n`;
      yamlContent += `          distributionType: ${funding.arrivalData.distributionType}\n`;
      yamlContent += `          distParameters: !!data.distribution.${getDistTypeTag(
        funding.arrivalData.distributionType
      )}\n`;
      yamlContent += formatDistParameters(
        funding.arrivalData.distParameters,
        12
      );

      // amountData
      yamlContent += `        amountData:\n`;
      yamlContent += `          distributionType: ${funding.amountData.distributionType}\n`;
      yamlContent += `          distParameters: !!data.distribution.${getDistTypeTag(
        funding.amountData.distributionType
      )}\n`;
      yamlContent += formatDistParameters(
        funding.amountData.distParameters,
        12
      );
    }
  }

  // migrations
  yamlContent += "migrations:\n";
  for (const migration of data.migrations) {
    const fromCampAnchor = campAnchorMap.get(migration.fromCamp);
    const toCampAnchor = campAnchorMap.get(migration.toCamp);
    yamlContent += `  - fromCamp: *${fromCampAnchor}\n`;
    yamlContent += `    toCamp: *${toCampAnchor}\n`;
    yamlContent += `    migrationType: ${migration.migrationType}\n`;
    yamlContent += `    arrivalData:\n`;
    yamlContent += `      distributionType: ${migration.arrivalData.distributionType}\n`;
    yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
      migration.arrivalData.distributionType
    )}\n`;
    yamlContent += formatDistParameters(
      migration.arrivalData.distParameters,
      8
    );
    yamlContent += `    migrationRatio: ${Number(migration.migrationRatio)}\n`;
  }

  // **Update InventoryPolicy**
  yamlContent += "inventoryPolicy: !!simulation.decision.OrderUpToPolicy\n";

  // bufferRatios
  yamlContent += "  bufferRatios:\n";
  for (const camp of data.camps) {
    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      const itemAnchor = itemAnchorMap.get(item.name);
      yamlContent += `      *${itemAnchor}: *campBuffer\n`;
    }
  }

  // centralBufferRatios
  yamlContent += "  centralBufferRatios:\n";
  for (const item of data.items) {
    const itemAnchor = itemAnchorMap.get(item.name);
    yamlContent += `    *${itemAnchor}: *centralBuffer\n`;
  }

  // periodicCounts
  yamlContent += "  periodicCounts:\n";
  for (const camp of data.camps) {
    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      const itemAnchor = itemAnchorMap.get(item.name);
      yamlContent += `      *${itemAnchor}: *period\n`;
    }
  }

  // centralPeriodicCounts
  yamlContent += "  centralPeriodicCounts:\n";
  for (const item of data.items) {
    const itemAnchor = itemAnchorMap.get(item.name);
    yamlContent += `    *${itemAnchor}: *period\n`;
  }

  // **Update InitialState**
  yamlContent += "initialState:\n";
  yamlContent += `  availableFunds: ${parseInt(
    data.initialState.availableFunds
  )}\n`;

  // initialInventory
  yamlContent += "  initialInventory:\n";
  for (const camp of data.camps) {
    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      const itemAnchor = itemAnchorMap.get(item.name);
      yamlContent += `      *${itemAnchor}: 0\n`;
    }
  }

  // initialCentralWarehouseInventory
  yamlContent += "  initialCentralWarehouseInventory:\n";
  for (const item of data.items) {
    const itemAnchor = itemAnchorMap.get(item.name);
    yamlContent += `    *${itemAnchor}: 0\n`;
  }

  // earmarkedFunds
  yamlContent += "  earmarkedFunds:\n";
  for (const camp of data.camps) {
    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}: 0\n`;
  }

  // initialEarmarkedInKind
  yamlContent += "  initialEarmarkedInKind:\n";
  for (const camp of data.camps) {
    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      const itemAnchor = itemAnchorMap.get(item.name);
      yamlContent += `      *${itemAnchor}: 0\n`;
    }
  }

  // isItemAvailable
  yamlContent += "  isItemAvailable:\n";
  for (const item of data.items) {
    const itemAnchor = itemAnchorMap.get(item.name);
    yamlContent += `    *${itemAnchor}: true\n`;
  }

  console.log("Generated YAML Content:\n", yamlContent);
  return yamlContent;
}

/**
 * Returns the tag string for a given distribution type.
 * @param distType - The distribution type (e.g., 'TRIANGULAR', 'EXPONENTIAL').
 * @returns The corresponding tag string.
 */
function getDistTypeTag(distType: string): string {
  switch (distType) {
    case "TRIANGULAR":
      return "DistTriangular";
    case "EXPONENTIAL":
      return "DistExponential";
    case "BERNOULLI":
      return "DistBernoulli";
    case "EQUAL_SHARE":
      return "DistEqualShare";
    case "FIXED":
      return "DistFixed";
    case "UNIFORM":
      return "DistUniform";
    // Add other distribution types as needed
    default:
      return "";
  }
}

/**
 * Formats the distribution parameters into a YAML-formatted string with correct indentation.
 * @param distParams - The distribution parameters object.
 * @param indentLevel - The number of spaces to indent.
 * @returns A formatted string representing the distribution parameters.
 */
function formatDistParameters(distParams: any, indentLevel: number): string {
  let formatted = "";
  const indent = " ".repeat(indentLevel);
  for (const [key, value] of Object.entries(distParams)) {
    if (typeof value === "boolean") {
      formatted += `${indent}${key}: ${value}\n`;
    } else {
      formatted += `${indent}${key}: ${formatValue(key, value)}\n`;
    }
  }
  return formatted;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log("Received Data:", JSON.stringify(data, null, 2));

    // Generate the YAML content
    const yamlContent = generateYAML(data);

    // Define the path to the YAML file in the Java project
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
    const simulation = spawn(
      "./gradlew",
      ["run", "--quiet", "-PmainClass=Main"],
      {
        cwd: path.join(process.cwd(), ".."),
        shell: true,
        env: {
          ...process.env,
        },
      }
    );

    let output = "";

    simulation.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      output += text;
      console.log(`Simulation stdout: ${text}`);
    });

    simulation.stderr.on("data", (data: Buffer) => {
      console.error(`Simulation stderr: ${data.toString()}`);
    });

    return new Promise<NextResponse>((resolve, reject) => {
      simulation.on("close", (code) => {
        if (code === 0) {
          // Process the output and extract the results
          // Assuming the simulation outputs JSON starting with "JSON_OUTPUT_START"
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
            let simulationData;
            try {
              simulationData = JSON.parse(jsonString);
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

            // Store the data
            const dataFilePath = path.join(dataDirPath, "kpiData.json");
            fs.writeFileSync(
              dataFilePath,
              JSON.stringify(simulationData),
              "utf8"
            );

            // Respond with success
            resolve(
              NextResponse.json({
                success: true,
              })
            );
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
