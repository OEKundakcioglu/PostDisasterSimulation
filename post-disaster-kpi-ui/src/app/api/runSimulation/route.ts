import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Fields that should be treated as integers in the YAML output
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
  // Populations
  "initialInternalPopulation",
  "initialExternalPopulation",
]);

/**
 * Format values appropriately for YAML output
 */
function formatValue(key: string, value: any): string {
  if (value === undefined || value === null) return "";

  if (typeof value === "boolean") {
    return value.toString();
  }

  if (integerFields.has(key)) {
    return parseInt(value).toString();
  }

  if (!isNaN(parseFloat(value))) {
    return parseFloat(value).toString();
  }

  return value;
}

/**
 * Generates the YAML content based on the user inputs.
 */
function generateYAML(data: any): string {
  let yamlContent = "";

  // Create maps for item and camp anchors
  const itemAnchorMap = new Map<string, string>();
  const campAnchorMap = new Map<string, string>();

  // Generate item anchors (used for references throughout the YAML)
  data.items.forEach((item: any) => {
    // Clean name for anchor use
    let itemAnchor = item.name.replace(/\s+/g, "_").toLowerCase();
    itemAnchorMap.set(item.name, itemAnchor);
  });

  // Generate camp anchors
  data.camps.forEach((camp: any) => {
    // Clean name for anchor use
    let campAnchor = camp.name.replace(/\s+/g, "_").toLowerCase();
    campAnchorMap.set(camp.name, campAnchor);
  });

  // Define anchored fields used throughout YAML
  const anchoredFields: { [key: string]: string } = {
    inventoryControlPeriod: "&period",
    campBuffer: "&campBuffer",
    centralBuffer: "&centralBuffer",
  };

  // SIMULATION CONFIG SECTION
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

  // ITEMS SECTION
  yamlContent += "items:\n";
  for (const item of data.items) {
    if (!item.name) continue; // Skip items without names

    const itemAnchor = itemAnchorMap.get(item.name);
    yamlContent += `  - &${itemAnchor}\n`;
    yamlContent += `    name: ${item.name}\n`;
    yamlContent += `    isPerishable: ${item.isPerishable}\n`;
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

    // Duration data (only for perishable items)
    if (item.isPerishable && item.durationData) {
      yamlContent += `    durationData:\n`;
      yamlContent += `      distributionType: ${item.durationData.distributionType}\n`;
      yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
        item.durationData.distributionType
      )}\n`;
      yamlContent += formatDistParameters(
        item.durationData.distParameters,
        8,
        item.durationData.distributionType
      );
    }

    // Lead time data
    yamlContent += `    leadTimeData:\n`;
    yamlContent += `      distributionType: ${item.leadTimeData.distributionType}\n`;
    yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
      item.leadTimeData.distributionType
    )}\n`;
    yamlContent += formatDistParameters(
      item.leadTimeData.distParameters,
      8,
      item.leadTimeData.distributionType
    );
  }

  // CAMPS SECTION
  yamlContent += "camps:\n";
  for (const camp of data.camps) {
    if (!camp.name) continue; // Skip camps without names

    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `  - &${campAnchor}\n`;
    yamlContent += `    name: ${camp.name}\n`;

    // Lead time data
    yamlContent += `    leadTimeData:\n`;
    yamlContent += `      distributionType: ${camp.leadTimeData.distributionType}\n`;
    yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
      camp.leadTimeData.distributionType
    )}\n`;
    yamlContent += formatDistParameters(
      camp.leadTimeData.distParameters,
      8,
      camp.leadTimeData.distributionType
    );

    // Demands
    if (camp.demands && camp.demands.length > 0) {
      yamlContent += `    demands:\n`;
      for (const demand of camp.demands) {
        if (!demand.item) continue; // Skip demands without items

        const itemAnchor = itemAnchorMap.get(demand.item);
        yamlContent += `      - item: *${itemAnchor}\n`;
        yamlContent += `        demandTimingType: ${demand.demandTimingType}\n`;
        yamlContent += `        demandQuantityType: ${demand.demandQuantityType}\n`;

        // Arrival data
        yamlContent += `        arrivalData:\n`;
        yamlContent += `          distributionType: ${demand.arrivalData.distributionType}\n`;
        yamlContent += `          distParameters: !!data.distribution.${getDistTypeTag(
          demand.arrivalData.distributionType
        )}\n`;
        yamlContent += formatDistParameters(
          demand.arrivalData.distParameters,
          12,
          demand.arrivalData.distributionType
        );

        // Ratios
        yamlContent += `        internalRatio: ${parseFloat(
          demand.internalRatio || "0"
        )}\n`;
        yamlContent += `        externalRatio: ${parseFloat(
          demand.externalRatio || "0"
        )}\n`;
      }
    }

    // Camp properties
    yamlContent += `    campExternalDemandSatisfactionType: ${camp.campExternalDemandSatisfactionType}\n`;

    // Add threshold only if needed
    if (
      camp.campExternalDemandSatisfactionType === "THRESHOLD" &&
      camp.externalDemandSatisfactionThreshold
    ) {
      yamlContent += `    externalDemandSatisfactionThreshold: ${parseFloat(
        camp.externalDemandSatisfactionThreshold
      )}\n`;
    }

    yamlContent += `    populationType: ${camp.populationType}\n`;
    yamlContent += `    initialInternalPopulation: ${parseInt(
      camp.initialInternalPopulation || "0"
    )}\n`;
    yamlContent += `    initialExternalPopulation: ${parseInt(
      camp.initialExternalPopulation || "0"
    )}\n`;
  }

  // AGENCIES SECTION
  if (data.agencies && data.agencies.length > 0) {
    yamlContent += "agencies:\n";
    for (const agency of data.agencies) {
      if (!agency.name) continue; // Skip agencies without names

      yamlContent += `  - name: ${agency.name}\n`;

      // Funding array
      if (agency.fundingArray && agency.fundingArray.length > 0) {
        yamlContent += `    fundingArray:\n`;
        for (const funding of agency.fundingArray) {
          yamlContent += `      - fundingType: ${funding.fundingType}\n`;

          // Add item reference for in-kind donations
          if (
            (funding.fundingType === "INKIND_REGULAR" ||
              funding.fundingType === "INKIND_EARMARKED") &&
            funding.item
          ) {
            const itemAnchor = itemAnchorMap.get(funding.item);
            if (itemAnchor) {
              // Use "item:" to match Java property name
              yamlContent += `        item: *${itemAnchor}\n`;
            }
          }

          // Add camp reference for earmarked funding
          if (
            (funding.fundingType === "MONETARY_EARMARKED" ||
              funding.fundingType === "INKIND_EARMARKED") &&
            funding.camp
          ) {
            const campAnchor = campAnchorMap.get(funding.camp);
            if (campAnchor) {
              yamlContent += `        camp: *${campAnchor}\n`;
            }
          }

          // Arrival data
          yamlContent += `        arrivalData:\n`;
          yamlContent += `          distributionType: ${funding.arrivalData.distributionType}\n`;
          yamlContent += `          distParameters: !!data.distribution.${getDistTypeTag(
            funding.arrivalData.distributionType
          )}\n`;
          yamlContent += formatDistParameters(
            funding.arrivalData.distParameters,
            12,
            funding.arrivalData.distributionType
          );

          // Amount data
          yamlContent += `        amountData:\n`;
          yamlContent += `          distributionType: ${funding.amountData.distributionType}\n`;
          yamlContent += `          distParameters: !!data.distribution.${getDistTypeTag(
            funding.amountData.distributionType
          )}\n`;
          yamlContent += formatDistParameters(
            funding.amountData.distParameters,
            12,
            funding.amountData.distributionType
          );
        }
      }
    }
  }

  // MIGRATIONS SECTION
  if (data.migrations && data.migrations.length > 0) {
    yamlContent += "migrations:\n";
    for (const migration of data.migrations) {
      // Skip migrations with missing source/destination camps when needed
      if (
        (!migration.fromCamp &&
          !migration.migrationType.includes("_TO_SYSTEM")) ||
        (!migration.toCamp && !migration.migrationType.includes("_FROM_SYSTEM"))
      ) {
        continue;
      }

      yamlContent += `  - migrationType: ${migration.migrationType}\n`;

      // Add fromCamp only if applicable
      if (
        !migration.migrationType.includes("_TO_SYSTEM") &&
        migration.fromCamp
      ) {
        const fromCampAnchor = campAnchorMap.get(migration.fromCamp);
        if (fromCampAnchor) {
          yamlContent += `    fromCamp: *${fromCampAnchor}\n`;
        }
      }

      // Add toCamp only if applicable
      if (
        !migration.migrationType.includes("_FROM_SYSTEM") &&
        migration.toCamp
      ) {
        const toCampAnchor = campAnchorMap.get(migration.toCamp);
        if (toCampAnchor) {
          yamlContent += `    toCamp: *${toCampAnchor}\n`;
        }
      }

      // Arrival data
      yamlContent += `    arrivalData:\n`;
      yamlContent += `      distributionType: ${migration.arrivalData.distributionType}\n`;
      yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
        migration.arrivalData.distributionType
      )}\n`;
      yamlContent += formatDistParameters(
        migration.arrivalData.distParameters,
        8,
        migration.arrivalData.distributionType
      );

      // Add quantity data only for *_TO_SYSTEM migration types
      if (
        migration.migrationType.includes("_TO_SYSTEM") &&
        migration.quantityData
      ) {
        yamlContent += `    quantityData:\n`;
        yamlContent += `      distributionType: ${migration.quantityData.distributionType}\n`;
        yamlContent += `      distParameters: !!data.distribution.${getDistTypeTag(
          migration.quantityData.distributionType
        )}\n`;
        yamlContent += formatDistParameters(
          migration.quantityData.distParameters,
          8,
          migration.quantityData.distributionType
        );
      }

      // Migration ratio
      yamlContent += `    migrationRatio: ${parseFloat(
        migration.migrationRatio || "0.05"
      )}\n`;
    }
  }

  // INVENTORY POLICY SECTION
  yamlContent += "inventoryPolicy: !!simulation.decision.OrderUpToPolicy\n";

  // Buffer ratios (using parameters from simulation config)
  yamlContent += "  bufferRatios:\n";
  for (const camp of data.camps) {
    if (!camp.name) continue;

    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      if (!item.name) continue;

      const itemAnchor = itemAnchorMap.get(item.name);
      // Use either specific value from inventoryPolicy or the global campBuffer
      const bufferValue =
        data.inventoryPolicy?.bufferRatios?.[camp.name]?.[item.name] ||
        "*campBuffer";
      yamlContent += `      *${itemAnchor}: ${bufferValue}\n`;
    }
  }

  // Central buffer ratios
  yamlContent += "  centralBufferRatios:\n";
  for (const item of data.items) {
    if (!item.name) continue;

    const itemAnchor = itemAnchorMap.get(item.name);
    // Use either specific value from inventoryPolicy or the global centralBuffer
    const bufferValue =
      data.inventoryPolicy?.centralBufferRatios?.[item.name] ||
      "*centralBuffer";
    yamlContent += `    *${itemAnchor}: ${bufferValue}\n`;
  }

  // Periodic counts
  yamlContent += "  periodicCounts:\n";
  for (const camp of data.camps) {
    if (!camp.name) continue;

    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      if (!item.name) continue;

      const itemAnchor = itemAnchorMap.get(item.name);
      // Use either specific value from inventoryPolicy or the global inventory control period
      const periodValue =
        data.inventoryPolicy?.periodicCounts?.[camp.name]?.[item.name] ||
        "*period";
      yamlContent += `      *${itemAnchor}: ${periodValue}\n`;
    }
  }

  // Central periodic counts
  yamlContent += "  centralPeriodicCounts:\n";
  for (const item of data.items) {
    if (!item.name) continue;

    const itemAnchor = itemAnchorMap.get(item.name);
    // Use either specific value from inventoryPolicy or the global inventory control period
    const periodValue =
      data.inventoryPolicy?.centralPeriodicCounts?.[item.name] || "*period";
    yamlContent += `    *${itemAnchor}: ${periodValue}\n`;
  }

  // INITIAL STATE SECTION
  yamlContent += "initialState:\n";
  yamlContent += `  availableFunds: ${parseInt(
    data.initialState.availableFunds || "0"
  )}\n`;

  // Initial inventory
  yamlContent += "  initialInventory:\n";
  for (const camp of data.camps) {
    if (!camp.name) continue;

    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      if (!item.name) continue;

      const itemAnchor = itemAnchorMap.get(item.name);
      const inventoryValue =
        data.initialState.initialInventory?.[camp.name]?.[item.name] || "0";
      yamlContent += `      *${itemAnchor}: ${parseInt(inventoryValue)}\n`;
    }
  }

  // Initial central warehouse inventory
  yamlContent += "  initialCentralWarehouseInventory:\n";
  for (const item of data.items) {
    if (!item.name) continue;

    const itemAnchor = itemAnchorMap.get(item.name);
    const inventoryValue =
      data.initialState.initialCentralWarehouseInventory?.[item.name] || "0";
    yamlContent += `    *${itemAnchor}: ${parseInt(inventoryValue)}\n`;
  }

  // Earmarked funds
  yamlContent += "  earmarkedFunds:\n";
  for (const camp of data.camps) {
    if (!camp.name) continue;

    const campAnchor = campAnchorMap.get(camp.name);
    const fundsValue = data.initialState.earmarkedFunds?.[camp.name] || "0";
    yamlContent += `    *${campAnchor}: ${parseInt(fundsValue)}\n`;
  }

  // Initial earmarked in-kind
  yamlContent += "  initialEarmarkedInKind:\n";
  for (const camp of data.camps) {
    if (!camp.name) continue;

    const campAnchor = campAnchorMap.get(camp.name);
    yamlContent += `    *${campAnchor}:\n`;
    for (const item of data.items) {
      if (!item.name) continue;

      const itemAnchor = itemAnchorMap.get(item.name);
      const inKindValue =
        data.initialState.initialEarmarkedInKind?.[camp.name]?.[item.name] ||
        "0";
      yamlContent += `      *${itemAnchor}: ${parseInt(inKindValue)}\n`;
    }
  }

  // Item availability
  yamlContent += "  isItemAvailable:\n";
  for (const item of data.items) {
    if (!item.name) continue;

    const itemAnchor = itemAnchorMap.get(item.name);
    const isAvailable =
      data.initialState.isItemAvailable?.[item.name] !== undefined
        ? data.initialState.isItemAvailable[item.name]
        : true;
    yamlContent += `    *${itemAnchor}: ${isAvailable}\n`;
  }

  return yamlContent;
}

/**
 * Returns the distribution type tag based on the distribution type.
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
    case "NORMAL":
      return "DistNormal";
    default:
      console.warn(`Unknown distribution type: ${distType}`);
      return "DistFixed"; // Default to fixed distribution
  }
}

/**
 * Formats the distribution parameters into a YAML-formatted string with proper constructor handling.
 */
function formatDistParameters(
  distParams: any,
  indentLevel: number,
  distributionType?: string
): string {
  if (!distParams) return "";

  let formatted = "";
  const indent = " ".repeat(indentLevel);

  // Special handling for DistNormal which needs constructor parameters
  if (distributionType === "NORMAL") {
    const mean = distParams.mean || "0";
    const stdDev = distParams.stdDev || "1";
    return `${indent}[${mean}, ${stdDev}]\n`; // Only return the parameter array, not the tag
  }

  // Standard parameter formatting for other distribution types
  for (const [key, value] of Object.entries(distParams)) {
    if (key === "initialArrival" && typeof value === "boolean") {
      formatted += `${indent}${key}: ${value}\n`;
    } else if (value !== undefined && value !== null) {
      formatted += `${indent}${key}: ${formatValue(key, value)}\n`;
    }
  }

  return formatted;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log("Processing simulation input data");

    const yamlContent = generateYAML(data);

    // Define path to YAML file
    const yamlFilePath = path.join(
      process.cwd(),
      "..",
      "src",
      "main",
      "java",
      "data",
      "input_files",
      "input.yaml"
    );

    // Write the YAML file
    fs.writeFileSync(yamlFilePath, yamlContent, "utf8");
    console.log(`YAML file written to ${yamlFilePath}`);

    // Get API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.warn(
        "NEXT_PUBLIC_API_URL is not defined. Simulation will run without visualization."
      );
    }

    // Call Spring Boot API
    const springBootUrl = apiUrl ? `${apiUrl}/simulate/logs` : "";
    if (springBootUrl) {
      console.log("Starting simulation via API at:", springBootUrl);

      try {
        const springBootResponse = await fetch(springBootUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!springBootResponse.ok) {
          console.warn(
            `Spring Boot API returned ${springBootResponse.status}. Continuing with visualization anyway.`
          );
        } else {
          console.log("Simulation started successfully");
        }
      } catch (apiError) {
        console.error("Error calling Spring Boot API:", apiError);
        console.warn("Continuing with visualization despite API error");
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      redirectToVisualization: true,
      visualizationUrl: "/home/RealTimeVisualization",
      message: "Simulation data processed. Proceeding to visualization.",
    });
  } catch (error: any) {
    console.error("Error during simulation setup:", error);
    return NextResponse.json(
      {
        error: `Failed to setup simulation: ${error.message}`,
        success: false,
      },
      { status: 500 }
    );
  }
}
