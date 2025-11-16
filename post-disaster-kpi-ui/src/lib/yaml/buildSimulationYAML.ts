/*
 * YAML builder for simulation input.
 * Focus: readability, testability, separation from route handler.
 */
import { Item } from "@/types/Item";
import {
  SimulationConfig,
  Camp,
  Agency,
  Migration,
  InventoryPolicy,
  InitialState,
  AgencyFunding,
  SupplyDisruption,
  OrderUpToPolicy,
  TargetLevelPolicy,
} from "@/types/Simulation";

// Public shape consumed by builder
export interface SimulationInputDTO {
  simulationConfig: SimulationConfig & Record<string, unknown>;
  items: Item[];
  camps: Camp[];
  agencies?: Agency[];
  migrations?: MigrationWithOptionalQuantity[];
  supplyDisruptions?: SupplyDisruption[];
  inventoryPolicy?: InventoryPolicy;
  initialState: InitialState;
}

// Extended migration to tolerate optional quantityData
interface MigrationWithOptionalQuantity extends Migration {
  quantityData?: {
    distributionType: string;
    distParameters: Record<string, unknown>;
  };
}

// Integer-like keys (kept string in UI but numeric in YAML)
const INT_KEYS = new Set<string>([
  "planningHorizon",
  "initialInternalPopulation",
  "initialExternalPopulation",
]);

const DIST_TAG: Record<string, string> = {
  TRIANGULAR: "DistTriangular",
  EXPONENTIAL: "DistExponential",
  BERNOULLI: "DistBernoulli",
  EQUAL_SHARE: "DistEqualShare",
  FIXED: "DistFixed",
  UNIFORM: "DistUniform",
  NORMAL: "DistNormal",
};

const ANCHORED_FIELDS: Record<string, string> = {
  campBuffer: "&campBuffer",
  centralBuffer: "&centralBuffer",
};

interface AnchorMaps {
  item: Map<string, string>;
  camp: Map<string, string>;
}

export function buildSimulationYAML(data: SimulationInputDTO): string {
  const anchors: AnchorMaps = { item: new Map(), camp: new Map() };
  data.items.forEach((i) => {
    if (i.name) anchors.item.set(i.name, anchorName(i.name));
  });
  data.camps.forEach((c) => {
    if (c.name) anchors.camp.set(c.name, anchorName(c.name));
  });

  let out = "";
  out += section(
    "simulationConfig",
    buildSimulationConfig(data.simulationConfig, data.inventoryPolicy)
  );
  out += section("items", buildItems(data, anchors));
  out += section("camps", buildCamps(data, anchors));
  if (data.agencies?.length)
    out += section("agencies", buildAgencies(data, anchors));
  if (data.migrations?.length)
    out += section("migrations", buildMigrations(data, anchors));
  if (data.supplyDisruptions?.length)
    out += section(
      "supplyStatusSwitches",
      buildSupplyDisruptions(data, anchors)
    );
  out += sectionRaw(buildInventoryPolicy(data, anchors));
  out += sectionRaw(buildInitialState(data, anchors));

  return out.trimEnd() + "\n"; // ensure final newline
}

// ------------------ Builders ------------------
function buildSimulationConfig(
  cfg: Record<string, unknown>,
  inventoryPolicy?: InventoryPolicy
): string {
  const filtered = Object.entries(cfg).filter(
    ([k]) => k !== "inventoryControlType" && k !== "inventoryControlPeriod"
  );

  const lines = ["  inventoryControlType: PERIODIC"];

  // Add inventoryControlPeriod from the inventory policy
  if (inventoryPolicy?.inventoryControlPeriod) {
    lines.push(
      `  inventoryControlPeriod: ${inventoryPolicy.inventoryControlPeriod}`
    );
  }

  filtered.forEach(([k, v]) => {
    lines.push(`  ${k}: ${formatValue(k, v, ANCHORED_FIELDS[k])}`);
  });

  return lines.join("\n") + "\n";
}

function buildItems(data: SimulationInputDTO, a: AnchorMaps): string {
  return data.items
    .map((item) => {
      if (!item.name) return "";
      const anchor = a.item.get(item.name);
      const lines: string[] = [
        `  - &${anchor}`,
        `    name: ${item.name}`,
        `    isPerishable: ${item.isPerishable}`,
        `    price: ${formatNumber(item.price)}`,
        `    orderingCost: ${formatNumber(item.orderingCost)}`,
        `    holdingCost: ${formatNumber(item.holdingCost)}`,
        `    deprivationRate: ${formatNumber(item.deprivationRate)}`,
        `    deprivationCoefficient: ${formatNumber(
          item.deprivationCoefficient
        )}`,
        `    referralCost: ${formatNumber(item.referralCost)}`,
      ];
      if (item.isPerishable && item.durationData) {
        lines.push("    durationData:");
        lines.push(
          `      distributionType: ${item.durationData.distributionType}`
        );
        lines.push(
          `      distParameters: !!data.distribution.${distTag(
            item.durationData.distributionType
          )}`
        );
        lines.push(
          formatDistParameters(
            item.durationData.distParameters as Record<string, unknown>,
            8,
            item.durationData.distributionType
          )
        );
      }
      if (item.leadTimeData) {
        lines.push("    leadTimeData:");
        lines.push(
          `      distributionType: ${item.leadTimeData.distributionType}`
        );
        lines.push(
          `      distParameters: !!data.distribution.${distTag(
            item.leadTimeData.distributionType
          )}`
        );
        lines.push(
          formatDistParameters(
            item.leadTimeData.distParameters as Record<string, unknown>,
            8,
            item.leadTimeData.distributionType
          )
        );
      }
      return lines.filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function buildCamps(data: SimulationInputDTO, a: AnchorMaps): string {
  return data.camps
    .map((camp) => {
      if (!camp.name) return "";
      const cA = a.camp.get(camp.name);
      const lines: string[] = [
        `  - &${cA}`,
        `    name: ${camp.name}`,
        "    leadTimeData:",
        `      distributionType: ${camp.leadTimeData.distributionType}`,
        `      distParameters: !!data.distribution.${distTag(
          camp.leadTimeData.distributionType
        )}`,
        formatDistParameters(
          camp.leadTimeData.distParameters as Record<string, unknown>,
          8,
          camp.leadTimeData.distributionType
        ),
      ];
      if (camp.demands?.length) {
        lines.push("    demands:");
        camp.demands.forEach((d) => {
          if (!d.item) return;
          const iA = a.item.get(d.item);
          lines.push(`      - item: *${iA}`);
          lines.push(`        demandTimingType: ${d.demandTimingType}`);
          lines.push(`        demandQuantityType: ${d.demandQuantityType}`);
          lines.push("        arrivalData:");
          lines.push(
            `          distributionType: ${d.arrivalData.distributionType}`
          );
          lines.push(
            `          distParameters: !!data.distribution.${distTag(
              d.arrivalData.distributionType
            )}`
          );
          lines.push(
            formatDistParameters(
              d.arrivalData.distParameters as Record<string, unknown>,
              12,
              d.arrivalData.distributionType
            )
          );
          lines.push(`        internalRatio: ${formatNumber(d.internalRatio)}`);
          lines.push(`        externalRatio: ${formatNumber(d.externalRatio)}`);
        });
      }
      lines.push(
        `    initialInternalPopulation: ${formatInt(
          camp.initialInternalPopulation
        )}`
      );
      lines.push(
        `    initialExternalPopulation: ${formatInt(
          camp.initialExternalPopulation
        )}`
      );
      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function buildAgencies(data: SimulationInputDTO, a: AnchorMaps): string {
  return data
    .agencies!.map((agency) => {
      if (!agency.name) return "";
      const lines: string[] = [`  - name: ${agency.name}`];
      if (agency.fundingArray?.length) {
        lines.push("    fundingArray:");
        agency.fundingArray.forEach((f) => {
          lines.push(`      - fundingType: ${f.fundingType}`);
          addOptionalFundingItemRef(f, a, lines);
          addOptionalFundingCampRef(f, a, lines);
          lines.push("        arrivalData:");
          lines.push(
            `          distributionType: ${f.arrivalData.distributionType}`
          );
          lines.push(
            `          distParameters: !!data.distribution.${distTag(
              f.arrivalData.distributionType
            )}`
          );
          lines.push(
            formatDistParameters(
              f.arrivalData.distParameters as Record<string, unknown>,
              12,
              f.arrivalData.distributionType
            )
          );
          lines.push("        amountData:");
          lines.push(
            `          distributionType: ${f.amountData.distributionType}`
          );
          lines.push(
            `          distParameters: !!data.distribution.${distTag(
              f.amountData.distributionType
            )}`
          );
          lines.push(
            formatDistParameters(
              f.amountData.distParameters as Record<string, unknown>,
              12,
              f.amountData.distributionType
            )
          );
        });
      }
      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function addOptionalFundingItemRef(
  f: AgencyFunding,
  a: AnchorMaps,
  lines: string[]
) {
  const itemRef = (f as unknown as { item?: string }).item;
  if (
    (f.fundingType === "INKIND_REGULAR" ||
      f.fundingType === "INKIND_EARMARKED") &&
    itemRef
  ) {
    const iA = a.item.get(itemRef);
    if (iA) lines.push(`        item: *${iA}`);
  }
}
function addOptionalFundingCampRef(
  f: AgencyFunding,
  a: AnchorMaps,
  lines: string[]
) {
  const campRef = (f as unknown as { camp?: string }).camp;
  if (
    (f.fundingType === "MONETARY_EARMARKED" ||
      f.fundingType === "INKIND_EARMARKED") &&
    campRef
  ) {
    const cA = a.camp.get(campRef);
    if (cA) lines.push(`        camp: *${cA}`);
  }
}

function buildMigrations(data: SimulationInputDTO, a: AnchorMaps): string {
  return data
    .migrations!.map((m) => {
      const type = String(m.migrationType);
      if (
        (!m.fromCamp && !type.includes("_TO_SYSTEM")) ||
        (!m.toCamp && !type.includes("_FROM_SYSTEM"))
      )
        return ""; // invalid
      const lines: string[] = [`  - migrationType: ${m.migrationType}`];
      if (!type.includes("_TO_SYSTEM") && m.fromCamp) {
        const fc = a.camp.get(m.fromCamp);
        if (fc) lines.push(`    fromCamp: *${fc}`);
      }
      if (!type.includes("_FROM_SYSTEM") && m.toCamp) {
        const tc = a.camp.get(m.toCamp);
        if (tc) lines.push(`    toCamp: *${tc}`);
      }
      lines.push("    arrivalData:");
      lines.push(`      distributionType: ${m.arrivalData.distributionType}`);
      lines.push(
        `      distParameters: !!data.distribution.${distTag(
          m.arrivalData.distributionType
        )}`
      );
      lines.push(
        formatDistParameters(
          m.arrivalData.distParameters as Record<string, unknown>,
          8,
          m.arrivalData.distributionType
        )
      );
      if (type.includes("_TO_SYSTEM") && m.quantityData) {
        lines.push("    quantityData:");
        lines.push(
          `      distributionType: ${m.quantityData.distributionType}`
        );
        lines.push(
          `      distParameters: !!data.distribution.${distTag(
            m.quantityData.distributionType
          )}`
        );
        lines.push(
          formatDistParameters(
            m.quantityData.distParameters as Record<string, unknown>,
            8,
            m.quantityData.distributionType
          )
        );
      }
      lines.push(
        `    migrationRatio: ${formatNumber(m.migrationRatio || 0.05)}`
      );
      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function buildSupplyDisruptions(
  data: SimulationInputDTO,
  a: AnchorMaps
): string {
  return data
    .supplyDisruptions!.map((sd) => {
      if (!sd.item) return "";
      const iA = a.item.get(sd.item);
      if (!iA) return "";

      const lines: string[] = [`  - item: *${iA}`];

      // Disruption arrival data
      lines.push("    disruptionArrivalData:");
      lines.push(
        `      distributionType: ${sd.disruptionArrivalData.distributionType}`
      );
      lines.push(
        `      distParameters: !!data.distribution.${distTag(
          sd.disruptionArrivalData.distributionType
        )}`
      );
      lines.push(
        formatDistParameters(
          sd.disruptionArrivalData.distParameters as Record<string, unknown>,
          8,
          sd.disruptionArrivalData.distributionType
        )
      );

      // Recovery arrival data
      lines.push("    recoveryArrivalData:");
      lines.push(
        `      distributionType: ${sd.recoveryArrivalData.distributionType}`
      );
      lines.push(
        `      distParameters: !!data.distribution.${distTag(
          sd.recoveryArrivalData.distributionType
        )}`
      );
      lines.push(
        formatDistParameters(
          sd.recoveryArrivalData.distParameters as Record<string, unknown>,
          8,
          sd.recoveryArrivalData.distributionType
        )
      );

      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function buildInventoryPolicy(data: SimulationInputDTO, a: AnchorMaps): string {
  const ip = data.inventoryPolicy;
  if (!ip) {
    return buildOrderUpToPolicy(data, a);
  }

  if (ip.policyType === "ORDER_UP_TO") {
    return buildOrderUpToPolicy(data, a, ip);
  } else if (ip.policyType === "TARGET_LEVEL") {
    return buildTargetLevelPolicy(data, a, ip);
  }

  return buildOrderUpToPolicy(data, a);
}

function buildOrderUpToPolicy(
  data: SimulationInputDTO,
  a: AnchorMaps,
  ip?: Partial<OrderUpToPolicy>
): string {
  let out = "inventoryPolicy: !!simulation.decision.OrderUpToPolicy\n";

  const period = ip?.inventoryControlPeriod || "5";
  out += `  inventoryControlPeriod: &period ${period}\n`;

  out += "  bufferRatios:\n";
  data.camps.forEach((c) => {
    if (!c.name) return;
    const cA = a.camp.get(c.name);
    out += `    *${cA}:\n`;
    data.items.forEach((i) => {
      if (!i.name) return;
      const iA = a.item.get(i.name);
      const v = ip?.bufferRatios?.[c.name]?.[i.name] ?? "*campBuffer";
      out += `      *${iA}: ${v}\n`;
    });
  });
  out += "  centralBufferRatios:\n";
  data.items.forEach((i) => {
    if (!i.name) return;
    const iA = a.item.get(i.name);
    const v = ip?.centralBufferRatios?.[i.name] ?? "*centralBuffer";
    out += `    *${iA}: ${v}\n`;
  });
  out += "  periodicCounts:\n";
  data.camps.forEach((c) => {
    if (!c.name) return;
    const cA = a.camp.get(c.name);
    out += `    *${cA}:\n`;
    data.items.forEach((i) => {
      if (!i.name) return;
      const iA = a.item.get(i.name);
      const v = ip?.periodicCounts?.[c.name]?.[i.name] ?? "*period";
      out += `      *${iA}: ${v}\n`;
    });
  });
  out += "  centralPeriodicCounts:\n";
  data.items.forEach((i) => {
    if (!i.name) return;
    const iA = a.item.get(i.name);
    const v = ip?.centralPeriodicCounts?.[i.name] ?? "*period";
    out += `    *${iA}: ${v}\n`;
  });
  return out;
}

function buildTargetLevelPolicy(
  data: SimulationInputDTO,
  a: AnchorMaps,
  ip?: Partial<TargetLevelPolicy>
): string {
  let out = "inventoryPolicy: !!simulation.decision.TargetLevelPolicy\n";

  const period = ip?.inventoryControlPeriod || "5";
  out += `  inventoryControlPeriod: ${period}\n`;

  const threshold = ip?.threshold ?? "0";
  out += `  threshold: ${formatNumber(threshold)}\n`;
  out += "  targetLevels:\n";
  data.camps.forEach((c) => {
    if (!c.name) return;
    const cA = a.camp.get(c.name);
    out += `    *${cA}:\n`;
    data.items.forEach((i) => {
      if (!i.name) return;
      const iA = a.item.get(i.name);
      const targetLevel = ip?.targetLevels?.[c.name]?.[i.name];
      // Handle new structure with internal/external or legacy single value
      if (
        targetLevel &&
        typeof targetLevel === "object" &&
        "internal" in targetLevel
      ) {
        out += `      *${iA}:\n`;
        out += `        internal: ${formatNumber(targetLevel.internal)}\n`;
        out += `        external: ${formatNumber(targetLevel.external)}\n`;
      } else {
        // Legacy format or default
        out += `      *${iA}: ${formatInt(targetLevel ?? "0")}\n`;
      }
    });
  });
  out += "  centralTargetLevels:\n";
  data.items.forEach((i) => {
    if (!i.name) return;
    const iA = a.item.get(i.name);
    const v = ip?.centralTargetLevels?.[i.name] ?? "0";
    out += `    *${iA}: ${formatInt(v)}\n`;
  });
  return out;
}

function buildInitialState(data: SimulationInputDTO, a: AnchorMaps): string {
  const s = data.initialState;
  let out = "initialState:\n";
  out += `  availableFunds: ${formatInt(s.availableFunds)}\n`;
  out += "  initialInventory:\n";
  data.camps.forEach((c) => {
    if (!c.name) return;
    const cA = a.camp.get(c.name);
    out += `    *${cA}:\n`;
    data.items.forEach((i) => {
      if (!i.name) return;
      const iA = a.item.get(i.name);
      const v = s.initialInventory?.[c.name]?.[i.name] ?? 0;
      out += `      *${iA}: ${formatInt(v)}\n`;
    });
  });
  out += "  initialCentralWarehouseInventory:\n";
  data.items.forEach((i) => {
    if (!i.name) return;
    const iA = a.item.get(i.name);
    const v = s.initialCentralWarehouseInventory?.[i.name] ?? 0;
    out += `    *${iA}: ${formatInt(v)}\n`;
  });
  out += "  earmarkedFunds:\n";
  data.camps.forEach((c) => {
    if (!c.name) return;
    const cA = a.camp.get(c.name);
    const v = s.earmarkedFunds?.[c.name] ?? 0;
    out += `    *${cA}: ${formatInt(v)}\n`;
  });
  out += "  isItemAvailable:\n";
  data.items.forEach((i) => {
    if (!i.name) return;
    const iA = a.item.get(i.name);
    const v = s.isItemAvailable?.[i.name] ?? true;
    out += `    *${iA}: ${v}\n`;
  });
  return out;
}

// ------------------ Small helpers ------------------
function anchorName(name: string) {
  return name.replace(/\s+/g, "_").toLowerCase();
}
function section(name: string, body: string) {
  return `${name}:\n${body.trimEnd()}\n\n`;
}
function sectionRaw(body: string) {
  return `${body.trimEnd()}\n\n`;
}
function distTag(t: string) {
  return DIST_TAG[t] || "DistFixed";
}
function formatValue(key: string, value: unknown, anchor?: string) {
  if (anchor) return `${anchor} ${formatPrimitive(key, value)}`;
  return formatPrimitive(key, value);
}
function formatPrimitive(key: string, value: unknown) {
  if (value === undefined || value === null) return ""; // caller decides to include key
  if (typeof value === "boolean") return String(value);
  if (INT_KEYS.has(key)) return String(parseInt(String(value), 10));
  const num = Number(value);
  if (Number.isFinite(num) && !Number.isNaN(num)) return String(num);
  return String(value);
}
function formatNumber(v: unknown) {
  const num = Number(v);
  return Number.isFinite(num) ? String(num) : "0";
}
function formatInt(v: unknown) {
  return String(parseInt(String(v ?? "0"), 10) || 0);
}
function formatDistParameters(
  params: Record<string, unknown>,
  indent: number,
  type?: string
) {
  if (!params) return "";
  const pad = " ".repeat(indent);
  if (type === "NORMAL") {
    const { mean = 0, stdDev = 1 } = params as {
      mean?: number | string;
      stdDev?: number | string;
    };
    return `${pad}[${mean}, ${stdDev}]\n`;
  }
  let out = "";
  for (const [k, val] of Object.entries(params)) {
    if (k === "initialArrival" && typeof val === "boolean") {
      out += `${pad}${k}: ${val}\n`;
    } else if (val !== undefined && val !== null) {
      out += `${pad}${k}: ${formatNumber(val)}\n`;
    }
  }
  return out;
}
