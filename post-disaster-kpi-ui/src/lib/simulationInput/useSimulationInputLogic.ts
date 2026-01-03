// Custom hook containing all the logic from the original InputParameters component
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Item } from "@/types/Item";
import {
  SimulationConfig,
  Camp,
  Agency,
  Migration,
  InventoryPolicy,
  InitialState,
  CampDemand,
  AgencyFunding,
  DistBlock,
  SupplyDisruption,
} from "./types";
import {
  DEFAULT_SIMULATION_CONFIG,
  DEFAULT_ITEMS,
  DEFAULT_CAMPS,
  DEFAULT_AGENCIES,
  DEFAULT_MIGRATIONS,
  DEFAULT_SUPPLY_DISRUPTIONS,
  DEFAULT_INVENTORY_POLICY,
  DEFAULT_INITIAL_STATE,
  LS_KEYS,
} from "./constants";
import { deepClone, ensureNumericValues, loadSavedConfig } from "./utils";
import { validateDistribution } from "./validation";

export const useSimulationInputLogic = () => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(
    DEFAULT_SIMULATION_CONFIG
  );
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [camps, setCamps] = useState<Camp[]>(DEFAULT_CAMPS);
  const [agencies, setAgencies] = useState<Agency[]>(DEFAULT_AGENCIES);
  const [migrations, setMigrations] = useState<Migration[]>(DEFAULT_MIGRATIONS);
  const [supplyDisruptions, setSupplyDisruptions] = useState<
    SupplyDisruption[]
  >(DEFAULT_SUPPLY_DISRUPTIONS);
  const [inventoryPolicy, setInventoryPolicy] = useState<InventoryPolicy>(
    DEFAULT_INVENTORY_POLICY
  );
  const [initialState, setInitialState] = useState<InitialState>(
    DEFAULT_INITIAL_STATE
  );

  const prevItemsRef = useRef<Item[]>([]);
  const availabilityRef = useRef(initialState.isItemAvailable);
  const prevCampsRef = useRef<Camp[]>([]); // for detecting renames vs deletions
  const campRenameDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const prevErrorRef = useRef<string | null>(null);
  const prevIssueCountRef = useRef<number>(0);

  // Scroll to top on new errors or first appearance of validation issues
  useEffect(() => {
    const hasNewError = error && error !== prevErrorRef.current;
    const issuesAppeared =
      prevIssueCountRef.current === 0 && validationIssues.length > 0;
    if (hasNewError || issuesAppeared) {
      try {
        // Use setTimeout to ensure the error is rendered before scrolling
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      } catch {
        // no-op (SSR or unavailable)
      }
    }
    prevErrorRef.current = error;
    prevIssueCountRef.current = validationIssues.length;
  }, [error, validationIssues]);

  // --------------------------------------------------
  // Effect: Sync camp demands + item availability with items
  // --------------------------------------------------
  useEffect(() => {
    availabilityRef.current = initialState.isItemAvailable;
  }, [initialState.isItemAvailable]);

    useEffect(() => {
        const currentNames = new Set(items.map((i: Item) => i.name).filter(Boolean));

        // Always prune demands whose item is not in items
        setCamps((oldCamps: Camp[]) =>
            oldCamps.map((camp: Camp) => {
                const pruned = camp.demands.filter(
                    (d: CampDemand) => !d.item || currentNames.has(d.item)
                );
                return pruned === camp.demands ? camp : { ...camp, demands: pruned };
            })
        );

        // Availability normalization (same as you already have)
        const nextAvailability: Record<string, boolean> = {};
        items.forEach((it: Item) => {
            if (it.name) nextAvailability[it.name] = availabilityRef.current[it.name] ?? true;
        });

        const currentAvail = availabilityRef.current;
        let changed =
            Object.keys(nextAvailability).length !== Object.keys(currentAvail).length;

        if (!changed) {
            for (const k of Object.keys(nextAvailability)) {
                if (currentAvail[k] !== nextAvailability[k]) {
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            setInitialState((prev: InitialState) => ({
                ...prev,
                isItemAvailable: nextAvailability,
            }));
        }

        prevItemsRef.current = deepClone(items);
    }, [items]);

  // --------------------------------------------------
  // Effect: Load / restore configuration once on mount
  // --------------------------------------------------
    useEffect(() => {
        const shouldPreserve =
            localStorage.getItem(LS_KEYS.preserveFlag) === "true";

        if (shouldPreserve) {
            const saved = loadSavedConfig();
            if (saved) {
                if (saved.simulationConfig) setSimulationConfig(saved.simulationConfig);
                if (saved.items) setItems(saved.items);
                if (saved.camps) setCamps(saved.camps);
                if (saved.agencies) setAgencies(saved.agencies);
                if (saved.migrations) setMigrations(saved.migrations);
                if (saved.inventoryPolicy) setInventoryPolicy(saved.inventoryPolicy);
                if (saved.initialState) setInitialState(saved.initialState);
            }
        } else {
            // Fresh start: ensure nothing stale leaks into payload
            try {
                localStorage.removeItem(LS_KEYS.simulationInput);
                localStorage.removeItem(LS_KEYS.currentSimulation);
            } catch {
                // no-op
            }

            setSimulationConfig(DEFAULT_SIMULATION_CONFIG);
            setItems(DEFAULT_ITEMS);
            setCamps(DEFAULT_CAMPS);
            setAgencies(DEFAULT_AGENCIES);
            setMigrations(DEFAULT_MIGRATIONS);
            setSupplyDisruptions(DEFAULT_SUPPLY_DISRUPTIONS);
            setInventoryPolicy(DEFAULT_INVENTORY_POLICY);
            setInitialState(DEFAULT_INITIAL_STATE);
        }

        if (shouldPreserve) localStorage.removeItem(LS_KEYS.preserveFlag);
    }, []);

  // --------------------------------------------------
  // Migration camp reference maintenance (non-destructive)
  // --------------------------------------------------
  useEffect(() => {
    // Build rename map: detect single (or multiple) renames where counts unchanged and names mostly same.
    const prev = prevCampsRef.current;
    const prevNames = new Set(prev.map((c) => c.name).filter(Boolean));
    const currentNames = new Set(camps.map((c) => c.name).filter(Boolean));
    const removed = Array.from(prevNames).filter((n) => !currentNames.has(n));
    const added = Array.from(currentNames).filter((n) => !prevNames.has(n));
    // Normalize helper (trim + case-insensitive) so minor edits don't look like deletions
    const normalize = (s: string) => s.trim().toLowerCase();
    // If we see exactly one removed and zero added, we may be mid-rename (user editing the text field)
    if (removed.length === 1 && added.length === 0) {
      // Delay processing to allow the new name to appear
      if (campRenameDebounceRef.current)
        clearTimeout(campRenameDebounceRef.current);
      campRenameDebounceRef.current = setTimeout(() => {
        // Re-run logic after debounce by updating ref and triggering effect manually via a dummy state toggle pattern if needed
        prevCampsRef.current = prev; // keep previous snapshot so next effect run still sees rename pair
        setCamps((c) => [...c]); // force re-render/effect
      }, 600);
      return; // Skip immediate blanking
    }
    const renameMap: Record<string, string> = {};
    // Heuristic: if same counts and removed/added sizes match (often 1), map pairwise by index
    if (
      prev.length === camps.length &&
      removed.length === added.length &&
      removed.length > 0 &&
      removed.length <= 3
    ) {
      for (let i = 0; i < removed.length; i++) {
        // If normalized strings match (e.g., trimming or case change) treat as rename
        if (normalize(removed[i]) === normalize(added[i])) continue; // no actual rename change needed
        renameMap[removed[i]] = added[i];
      }
    } else if (removed.length === 1 && added.length === 1) {
      if (normalize(removed[0]) !== normalize(added[0])) {
        renameMap[removed[0]] = added[0];
      }
    }
    // If camp count did not decrease and we didn't detect a rename, skip blanking entirely to avoid false positives
    if (
      camps.length >= prev.length &&
      Object.keys(renameMap).length === 0 &&
      removed.length === 0
    ) {
      prevCampsRef.current = camps; // still advance snapshot
      return;
    }
    const campNames = new Set(camps.map((c: Camp) => c.name).filter(Boolean));
    setMigrations((prevMigs: Migration[]) => {
      let renamed = false;
      // Remove migrations that reference deleted camps
      const filtered = prevMigs
        .map((m: Migration) => {
          let fromCamp = m.fromCamp;
          let toCamp = m.toCamp;
          // Attempt rename substitution first
          if (fromCamp && renameMap[fromCamp]) {
            fromCamp = renameMap[fromCamp];
            renamed = true;
          }
          if (toCamp && renameMap[toCamp]) {
            toCamp = renameMap[toCamp];
            renamed = true;
          }
          return { ...m, fromCamp, toCamp };
        })
        .filter((m: Migration) => {
          const type = m.migrationType || "";
          const within = type.includes("_WITHIN_SYSTEM");
          const toSystem = type.includes("_TO_SYSTEM");
          const fromSystem = type.includes("_FROM_SYSTEM");
          // Remove if any referenced camp is missing
          if (within) {
            return campNames.has(m.fromCamp) && campNames.has(m.toCamp);
          } else if (toSystem) {
            return campNames.has(m.toCamp);
          } else if (fromSystem) {
            return campNames.has(m.fromCamp);
          }
          return true;
        });
      if (prevMigs.length !== filtered.length) {
        setValidationIssues((iss) => [
          ...iss,
          "Removed migrations referencing deleted camps after camp removal",
        ]);
      } else if (renamed) {
        setValidationIssues((iss) => [
          ...iss,
          "Updated migration camp references after camp rename",
        ]);
      }
      return filtered;
    });
    prevCampsRef.current = camps;
  }, [camps]);

  const normalizeInventoryPolicy = useCallback(() => {
    setInventoryPolicy((prev: InventoryPolicy) => {
      const next = deepClone(prev);

      // Get valid camp and item names (non-empty)
      const validCampNames = new Set(
        camps.map((c: Camp) => c.name).filter(Boolean)
      );
      const validItemNames = new Set(
        items.map((i: Item) => i.name).filter(Boolean)
      );

      if (next.policyType === "ORDER_UP_TO") {
        const newBufferRatios: Record<string, Record<string, string>> = {};
        validCampNames.forEach((campName) => {
          newBufferRatios[campName] = {};
          validItemNames.forEach((itemName) => {
            newBufferRatios[campName][itemName] =
              next.bufferRatios[campName]?.[itemName] ?? "0";
          });
        });
        next.bufferRatios = newBufferRatios;

        // Clean up periodicCounts: remove stale camps/items, add missing ones
        const newPeriodicCounts: Record<string, Record<string, string>> = {};
        validCampNames.forEach((campName) => {
          newPeriodicCounts[campName] = {};
          validItemNames.forEach((itemName) => {
            newPeriodicCounts[campName][itemName] =
              next.periodicCounts[campName]?.[itemName] ?? "0";
          });
        });
        next.periodicCounts = newPeriodicCounts;

        // Clean up centralBufferRatios: remove stale items, add missing ones
        const newCentralBufferRatios: Record<string, string> = {};
        validItemNames.forEach((itemName) => {
          newCentralBufferRatios[itemName] =
            next.centralBufferRatios[itemName] ?? "0";
        });
        next.centralBufferRatios = newCentralBufferRatios;

        // Clean up centralPeriodicCounts: remove stale items, add missing ones
        const newCentralPeriodicCounts: Record<string, string> = {};
        validItemNames.forEach((itemName) => {
          newCentralPeriodicCounts[itemName] =
            next.centralPeriodicCounts[itemName] ?? "0";
        });
        next.centralPeriodicCounts = newCentralPeriodicCounts;
      } else if (next.policyType === "TARGET_LEVEL") {
        const newTargetLevels: Record<
          string,
          Record<string, { s_reorderPoint?: string; S_targetRatio?: string; S_targetLevel?: string; rationingThreshold?: string }>
        > = {};
        validCampNames.forEach((campName) => {
          newTargetLevels[campName] = {};
          validItemNames.forEach((itemName) => {
            const existingVal = next.targetLevels[campName]?.[itemName];
            if (typeof existingVal === "object" && existingVal !== null) {
              newTargetLevels[campName][itemName] = existingVal;
            } else {
              newTargetLevels[campName][itemName] = {
                s_reorderPoint: "0",
                S_targetRatio: "1.5",
                S_targetLevel: "0",
                rationingThreshold: "0",
              };
            }
          });
        });
        next.targetLevels = newTargetLevels;

          const newCentralTargetLevels: Record<
              string,
              { s_reorderPoint?: string; S_targetRatio?: string; S_targetLevel?: string }
          > = {};

          validItemNames.forEach((itemName) => {
              const existingVal = next.centralTargetLevels[itemName];

              if (typeof existingVal === "object" && existingVal !== null) {
                  newCentralTargetLevels[itemName] = existingVal;
              } else {
                  newCentralTargetLevels[itemName] = {
                      s_reorderPoint: "0",
                      S_targetRatio: "1.5",
                      S_targetLevel: "0",
                  };
              }
          });
          next.centralTargetLevels = newCentralTargetLevels;
      }

      return next;
    });
  }, [camps, items]);

  // --------------------------------------------------
  // Initial State normalization (auto-complete & prune)
  // --------------------------------------------------
  const computeNormalizedInitialState = useCallback(
    (prev: InitialState): InitialState => {
      const campNames = new Set(camps.map((c: Camp) => c.name).filter(Boolean));
      const itemNames = new Set(items.map((i: Item) => i.name).filter(Boolean));
      const next: InitialState = deepClone(prev);

      // initialInventory: add missing camps/items, remove stale
      const newInitialInventory: Record<string, Record<string, string>> = {};
      campNames.forEach((campName) => {
        const existing = next.initialInventory[campName] || {};
        const newItems: Record<string, string> = {};
        itemNames.forEach((itemName) => {
          newItems[itemName] = existing[itemName] ?? "0";
        });
        newInitialInventory[campName] = newItems;
      });
      next.initialInventory = newInitialInventory;

      // initialCentralWarehouseInventory
      const newCentral: Record<string, string> = {};
      itemNames.forEach((itemName) => {
        newCentral[itemName] =
          next.initialCentralWarehouseInventory[itemName] ?? "0";
      });
      next.initialCentralWarehouseInventory = newCentral;

      // earmarkedFunds
      const newEarmarkedFunds: Record<string, string> = {};
      campNames.forEach((campName) => {
        newEarmarkedFunds[campName] = next.earmarkedFunds[campName] ?? "0";
      });
      next.earmarkedFunds = newEarmarkedFunds;

      // isItemAvailable
      const newAvailability: Record<string, boolean> = {};
      itemNames.forEach((itemName) => {
        newAvailability[itemName] = next.isItemAvailable[itemName] ?? true; // default available
      });
      next.isItemAvailable = newAvailability;

      return next;
    },
    [camps, items]
  );

  const normalizeInitialState = useCallback(() => {
    setInitialState((prev: InitialState) =>
      computeNormalizedInitialState(prev)
    );
  }, [computeNormalizedInitialState]);

  // Auto normalize when camps/items change
  useEffect(() => {
    normalizeInitialState();
    normalizeInventoryPolicy();
  }, [normalizeInitialState, normalizeInventoryPolicy]);

  // --------------------------------------------------
  // Validate inputs
  // --------------------------------------------------
  const validateInputs = useCallback(
    (stateOverride?: InitialState): string[] => {
      const issues: string[] = [];
      const currentInitialState = stateOverride || initialState;

      // Uniqueness checks
      const unique = (arr: string[], label: string) => {
        const seen = new Set<string>();
        arr.forEach((v: string) => {
          if (!v) return;
          if (seen.has(v)) issues.push(`${label} '${v}' duplicated`);
          else seen.add(v);
        });
      };
      unique(
        items.map((i: Item) => i.name),
        "Item"
      );
      unique(
        camps.map((c: Camp) => c.name),
        "Camp"
      );
      unique(
        agencies.map((a: Agency) => a.name),
        "Agency"
      );

      // Check simulation size limits
      if (items.length > 10) {
        issues.push(
          `Too many items (${items.length}). Maximum allowed: 10 items.`
        );
      }
      if (camps.length > 20) {
        issues.push(
          `Too many camps (${camps.length}). Maximum allowed: 20 camps.`
        );
      }
      const planningHorizon = parseInt(
        simulationConfig.planningHorizon?.toString() || "0"
      );
      if (planningHorizon > 2000) {
        issues.push(
          `Planning horizon too large (${planningHorizon}). Maximum allowed: 2000 time units.`
        );
      }

      // Check population sizes
      let totalPopulation = 0;
      camps.forEach((camp: Camp, i: number) => {
        const internal = parseInt(
          camp.initialInternalPopulation?.toString() || "0"
        );
        const external = parseInt(
          camp.initialExternalPopulation?.toString() || "0"
        );

        if (internal > 1000000) {
          issues.push(
            `Camp '${
              camp.name || i + 1
            }' internal population too large (${internal}). Maximum allowed: 1,000,000.`
          );
        }
        if (external > 10000000) {
          issues.push(
            `Camp '${
              camp.name || i + 1
            }' external population too large (${external}). Maximum allowed: 10,000,000.`
          );
        }

        totalPopulation += internal + external;
      });

      if (totalPopulation > 50000000) {
        issues.push(
          `Total population too large (${totalPopulation}). Maximum allowed: 50,000,000.`
        );
      }

      // Items
      items.forEach((it: Item, i: number) => {
        if (!it.name) issues.push(`Item ${i + 1} missing name`);
        const numericKeys: string[] = [
          "price",
          "orderingCost",
          "holdingCost",
          "deprivationRate",
          "deprivationCoefficient",
          "referralCost",
        ];
        numericKeys.forEach((k: string) => {
          const v = (it as unknown as Record<string, unknown>)[k];
          if (v === undefined || v === null || v === "")
            issues.push(`Item ${it.name || i + 1}: ${k} missing`);
          else if (isNaN(Number(v)))
            issues.push(`Item ${it.name}: ${k} not numeric`);
          else if (Number(v) < 0) issues.push(`Item ${it.name}: ${k} negative`);
        });
        // lead time distribution required
        issues.push(
          ...validateDistribution(
            it.leadTimeData as unknown as DistBlock,
            `Item ${it.name} leadTimeData`
          )
        );
        if (it.isPerishable) {
          const dur = (it as unknown as Record<string, unknown>)[
            "durationData"
          ] as DistBlock | undefined;
          if (!dur)
            issues.push(`Item ${it.name} perishable but durationData missing`);
          else
            issues.push(
              ...validateDistribution(dur, `Item ${it.name} durationData`)
            );
        }
      });

      // Camps & Demands
      camps.forEach((c: Camp, i: number) => {
        if (!c.name) issues.push(`Camp ${i + 1} is missing a name`);
        if (
          c.initialInternalPopulation === undefined ||
          c.initialInternalPopulation === "" ||
          isNaN(Number(c.initialInternalPopulation)) ||
          Number(c.initialInternalPopulation) < 0
        )
          issues.push(`Camp ${c.name || i + 1}: internal population invalid`);
        if (
          c.initialExternalPopulation === undefined ||
          c.initialExternalPopulation === "" ||
          isNaN(Number(c.initialExternalPopulation)) ||
          Number(c.initialExternalPopulation) < 0
        )
          issues.push(`Camp ${c.name || i + 1}: external population invalid`);

        c.demands.forEach((d: CampDemand, di: number) => {
          if (!d.item)
            issues.push(`Camp ${c.name}: demand ${di + 1} missing item`);
          issues.push(
            ...validateDistribution(
              d.arrivalData as unknown as DistBlock,
              `Camp ${c.name} / ${d.item || "demand"} arrivalData`
            )
          );
          // demand lead time
          if (d.leadTimeData) {
            issues.push(
              ...validateDistribution(
                d.leadTimeData as unknown as DistBlock,
                `Camp ${c.name} / ${d.item || "demand"} leadTimeData`
              )
            );
          }
        });
      });

      // Migrations
      migrations.forEach((m: Migration, i: number) => {
        const type = m.migrationType || "";
        const ctx = `Migration ${i + 1}`;
        if (!type) issues.push(`${ctx} missing type`);
        const toSystem = type.includes("_TO_SYSTEM");
        const fromSystem = type.includes("_FROM_SYSTEM");
        const within = type.includes("_WITHIN_SYSTEM");

        // Validate camp existence
        if (m.fromCamp && !camps.some((camp) => camp.name === m.fromCamp)) {
          issues.push(
            `${ctx} references non-existent fromCamp '${m.fromCamp}'`
          );
        }
        if (m.toCamp && !camps.some((camp) => camp.name === m.toCamp)) {
          issues.push(`${ctx} references non-existent toCamp '${m.toCamp}'`);
        }

        if (within) {
          if (!m.fromCamp) issues.push(`${ctx} missing fromCamp`);
          if (!m.toCamp) issues.push(`${ctx} missing toCamp`);
          if (m.fromCamp && m.toCamp && m.fromCamp === m.toCamp)
            issues.push(`${ctx} has identical from/to camp`);
        } else if (toSystem) {
          if (!m.toCamp)
            issues.push(`${ctx} missing toCamp (required for *_TO_SYSTEM)`);
        } else if (fromSystem) {
          if (!m.fromCamp)
            issues.push(`${ctx} missing fromCamp (required for *_FROM_SYSTEM)`);
        }
        issues.push(
          ...validateDistribution(
            m.arrivalData as unknown as DistBlock,
            `${ctx} arrivalData`
          )
        );
        if (toSystem) {
          issues.push(
            ...validateDistribution(
              m.quantityData as DistBlock | undefined,
              `${ctx} quantityData`
            )
          );
        } else {
          if (m.migrationRatio === undefined || m.migrationRatio === null)
            issues.push(`${ctx} missing migrationRatio`);
          else if (
            isNaN(Number(m.migrationRatio)) ||
            Number(m.migrationRatio) < 0 ||
            Number(m.migrationRatio) > 1
          )
            issues.push(`${ctx} migrationRatio must be 0-1`);
        }
      });

      // Agencies / Funding
      agencies.forEach((a: Agency, ai: number) => {
        if (!a.name) issues.push(`Agency ${ai + 1} missing name`);
        (a.fundingArray || []).forEach((f: AgencyFunding, fi: number) => {
          const fctx = `Agency ${a.name || ai + 1} funding ${fi + 1}`;
          if (!f.fundingType) issues.push(`${fctx} missing type`);
          issues.push(
            ...validateDistribution(
              f.arrivalData as unknown as DistBlock,
              `${fctx} arrivalData`
            )
          );
          issues.push(
            ...validateDistribution(
              f.amountData as unknown as DistBlock,
              `${fctx} amountData`
            )
          );
          if (f.fundingType?.includes("EARMARKED")) {
            if (!f.camp && !f.item)
              issues.push(`${fctx} earmarked requires camp or item`);
          }
        });
      });

      // Inventory Policy completeness
      if (inventoryPolicy.policyType === "ORDER_UP_TO") {
        if (
          !inventoryPolicy.inventoryControlPeriod ||
          isNaN(Number(inventoryPolicy.inventoryControlPeriod)) ||
          Number(inventoryPolicy.inventoryControlPeriod) <= 0
        )
          issues.push("Order Up To Policy: Inventory control period invalid");

        camps.forEach((c: Camp) =>
          items.forEach((it: Item) => {
            const br = inventoryPolicy.bufferRatios?.[c.name]?.[it.name];
            const pc = inventoryPolicy.periodicCounts?.[c.name]?.[it.name];
            if (br === undefined)
              issues.push(
                `Inventory policy bufferRatio missing for ${c.name}/${it.name}`
              );
            else if (isNaN(Number(br)) || Number(br) < 0)
              issues.push(
                `Inventory policy bufferRatio invalid for ${c.name}/${it.name}`
              );
            if (pc === undefined)
              issues.push(
                `Inventory policy periodicCount missing for ${c.name}/${it.name}`
              );
            else if (!/^\d+$/.test(String(pc)) || Number(pc) < 0)
              issues.push(
                `Inventory policy periodicCount invalid for ${c.name}/${it.name}`
              );
          })
        );
        items.forEach((it: Item) => {
          const cbr = inventoryPolicy.centralBufferRatios?.[it.name];
          const cpc = inventoryPolicy.centralPeriodicCounts?.[it.name];
          if (cbr === undefined)
            issues.push(`Central bufferRatio missing for ${it.name}`);
          else if (isNaN(Number(cbr)) || Number(cbr) < 0)
            issues.push(`Central bufferRatio invalid for ${it.name}`);
          if (cpc === undefined)
            issues.push(`Central periodicCount missing for ${it.name}`);
          else if (!/^\d+$/.test(String(cpc)) || Number(cpc) < 0)
            issues.push(`Central periodicCount invalid for ${it.name}`);
        });
      }
      else if (inventoryPolicy.policyType === "TARGET_LEVEL") {
        if (
            !inventoryPolicy.inventoryControlPeriod ||
            isNaN(Number(inventoryPolicy.inventoryControlPeriod)) ||
            Number(inventoryPolicy.inventoryControlPeriod) <= 0
        )
            issues.push("Target Level Policy: Inventory control period invalid");

        camps.forEach((c: Camp) =>
            items.forEach((it: Item) => {
                // Validate Target Level
                const tl = inventoryPolicy.targetLevels?.[c.name]?.[it.name];
                if (tl === undefined) {
                    issues.push(`Target level missing for ${c.name}/${it.name}`);
                } else if (typeof tl === "object") {
                    // Validate s_reorderPoint
                    if (tl.s_reorderPoint !== undefined && (
                        !/^\d*\.?\d+$/.test(String(tl.s_reorderPoint)) ||
                        Number(tl.s_reorderPoint) < 0
                    ))
                        issues.push(
                            `Reorder point invalid for ${c.name}/${it.name} (must be positive)`
                        );
                    // Validate S_targetRatio
                    if (tl.S_targetRatio !== undefined && (
                        !/^\d*\.?\d+$/.test(String(tl.S_targetRatio)) ||
                        Number(tl.S_targetRatio) < 0
                    ))
                        issues.push(
                            `Target ratio invalid for ${c.name}/${it.name} (must be positive)`
                        );
                } else if (!/^\d+$/.test(String(tl)) || Number(tl) < 0) {
                    issues.push(`Target level invalid for ${c.name}/${it.name}`);
                }

                // Validate Threshold Ratio
                const tr = inventoryPolicy.thresholdRatios?.[c.name]?.[it.name];
                if (tr === undefined) {
                    issues.push(`Threshold ratio missing for ${c.name}/${it.name}`);
                } else if (isNaN(Number(tr)) || Number(tr) < 0) { // GÜNCELLEME: > 1 kontrolü kaldırıldı
                    issues.push(
                        `Threshold ratio for ${c.name}/${it.name} must be positive`
                    );
                }
            })
        );

        items.forEach((it: Item) => {
            const ctl = inventoryPolicy.centralTargetLevels?.[it.name];
            if (ctl === undefined) {
                issues.push(`Central target level missing for ${it.name}`);
            } else if (typeof ctl === 'object') {
                if (ctl.s_reorderPoint !== undefined && (
                    !/^\d*\.?\d+$/.test(String(ctl.s_reorderPoint)) ||
                    Number(ctl.s_reorderPoint) < 0
                )) {
                    issues.push(`Central reorder point for ${it.name} must be positive`);
                }
                if (ctl.S_targetRatio !== undefined && (
                    !/^\d*\.?\d+$/.test(String(ctl.S_targetRatio)) ||
                    Number(ctl.S_targetRatio) < 0
                )) {
                    issues.push(`Central target ratio for ${it.name} must be positive`);
                }
            } else {
                issues.push(`Central target level format invalid for ${it.name}`);
            }
        });

      }

      // Initial State
      if (
        currentInitialState.availableFunds === undefined ||
        currentInitialState.availableFunds === "" ||
        isNaN(Number(currentInitialState.availableFunds)) ||
        Number(currentInitialState.availableFunds) < 0
      )
        issues.push("Initial availableFunds invalid");
      // Ensure all items have availability flags
      items.forEach((it: Item) => {
        if (currentInitialState.isItemAvailable[it.name] === undefined)
          issues.push(`Initial availability missing for item ${it.name}`);
      });

      // Simulation config
      if (
        !simulationConfig.planningHorizon ||
        isNaN(Number(simulationConfig.planningHorizon)) ||
        Number(simulationConfig.planningHorizon) <= 0
      )
        issues.push("Planning horizon invalid");

      return issues;
    },
    [
      items,
      camps,
      agencies,
      migrations,
      inventoryPolicy,
      initialState,
      simulationConfig,
    ]
  );

  // --------------------------------------------------
  // Submit handler
  // --------------------------------------------------
  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      normalizeInventoryPolicy();
      // Compute & apply normalized initial state before validation
      const normalizedState = computeNormalizedInitialState(initialState);
      setInitialState(normalizedState); // update react state for UI consistency
      const issues = validateInputs(normalizedState);
      setValidationIssues(issues);
      if (issues.length) {
        setError(
          `Cannot start simulation. Please fix: \n- ${issues.join("\n- ")}`
        );
        // Scroll to top immediately when validation errors are found
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          // no-op (SSR or unavailable)
        }
        return;
      }
      const dataToSend = deepClone({
        simulationConfig,
        items,
        camps,
        agencies,
        migrations,
        supplyDisruptions,
        inventoryPolicy,
        initialState: normalizedState,
      });
      dataToSend.agencies?.forEach((agency: Agency) =>
        agency.fundingArray?.forEach((f: AgencyFunding) => {
          if (f.item === "") f.item = undefined;
          if (f.camp === "") f.camp = undefined;
        })
      );
      localStorage.setItem(LS_KEYS.simulationInput, JSON.stringify(dataToSend));
      localStorage.setItem(
        LS_KEYS.currentSimulation,
        JSON.stringify(dataToSend)
      );
      const processedData = ensureNumericValues(dataToSend);
      const createResp = await fetch("/api/simulations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });
      const createJson = await createResp.json();
      if (!createResp.ok) {
        if (createResp.status === 507) {
          setError(
            `Memory Limit Exceeded: ${createJson.error}\n\nPlease try:\n• Reducing population sizes\n• Decreasing planning horizon\n• Using fewer camps or items`
          );
        } else {
          setError(createJson.error || "Failed to create simulation session");
        }
        // Scroll to top when API errors occur
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          // no-op (SSR or unavailable)
        }
        return;
      }
      const sessionId = createJson.id;
      const startResp = await fetch(
        `/api/simulations/start?id=${encodeURIComponent(sessionId)}`,
        { method: "POST" }
      );
      const startJson = await startResp.json();
      if (!startResp.ok) {
        if (startResp.status === 507) {
          setError(
            `Memory Limit Exceeded During Execution: ${startJson.error}\n\nThe simulation started but ran out of memory. Please try:\n• Reducing population sizes\n• Decreasing planning horizon\n• Using fewer camps or items`
          );
        } else {
          setError(startJson.error || "Failed to start simulation");
        }
        // Scroll to top when simulation start errors occur
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          // no-op (SSR or unavailable)
        }
        return;
      }
      localStorage.setItem("activeSimulationSessionId", sessionId);
      setSuccessMessage("Simulation started successfully! Redirecting ...");
      router.push(
        `/home/RealTimeVisualization?sessionId=${encodeURIComponent(sessionId)}`
      );
    } catch (e) {
      console.error("Failed to run simulation:", e);
      setError("An unexpected error occurred. Please try again.");
      // Scroll to top when unexpected errors occur
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        // no-op (SSR or unavailable)
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    validateInputs,
    normalizeInventoryPolicy,
    computeNormalizedInitialState,
    simulationConfig,
    items,
    camps,
    agencies,
    migrations,
    supplyDisruptions,
    inventoryPolicy,
    initialState,
    router,
  ]);

  return {
    // State
    isLoading,
    error,
    successMessage,
    validationIssues,
    simulationConfig,
    items,
    camps,
    agencies,
    migrations,
    supplyDisruptions,
    inventoryPolicy,
    initialState,
    // Setters
    setIsLoading,
    setError,
    setSuccessMessage,
    setValidationIssues,
    setSimulationConfig,
    setItems,
    setCamps,
    setAgencies,
    setMigrations,
    setSupplyDisruptions,
    setInventoryPolicy,
    setInitialState,
    // Actions
    handleSubmit,
    // Router
    router,
  };
};
