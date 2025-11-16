import React, { useEffect, useState } from "react";
import { Grid, TextField } from "@mui/material";
import { Item } from "../../../types/Item";
import { NestedCollapsibleSection } from "../../CollapsibleSections/CollapsibleSections";
import { OrderUpToPolicy as OrderUpToPolicyType } from "@/lib/simulationInput/types";

interface Camp {
  name: string;
}

interface Props {
  policy: OrderUpToPolicyType;
  setPolicy: (policy: OrderUpToPolicyType) => void;
  camps: Camp[];
  items: Item[];
  campBuffer: string;
  centralBuffer: string;
}

const OrderUpToPolicy: React.FC<Props> = ({
  policy,
  setPolicy,
  camps,
  items,
  campBuffer,
  centralBuffer,
}) => {
  const [hasManualEdits, setHasManualEdits] = useState(false);

  useEffect(() => {
    if (hasManualEdits) return;

    const shouldUpdate = () => {
      const campBufferStr = campBuffer.toString();
      const centralBufferStr = centralBuffer.toString();
      const inventoryControlPeriodStr =
        policy.inventoryControlPeriod.toString();

      for (const camp of camps) {
        if (
          !policy.bufferRatios[camp.name] ||
          !policy.periodicCounts[camp.name]
        ) {
          return true;
        }
        for (const item of items) {
          if (
            policy.bufferRatios[camp.name][item.name] !== campBufferStr ||
            policy.periodicCounts[camp.name][item.name] !==
              inventoryControlPeriodStr
          ) {
            return true;
          }
        }
      }

      for (const item of items) {
        if (
          policy.centralBufferRatios[item.name] !== centralBufferStr ||
          policy.centralPeriodicCounts[item.name] !== inventoryControlPeriodStr
        ) {
          return true;
        }
      }

      return false;
    };

    if (!shouldUpdate()) return;

    const newBufferRatios = { ...policy.bufferRatios };
    const newCentralBufferRatios = { ...policy.centralBufferRatios };
    const newPeriodicCounts = { ...policy.periodicCounts };
    const newCentralPeriodicCounts = {
      ...policy.centralPeriodicCounts,
    };

    const campBufferStr = campBuffer.toString();
    const centralBufferStr = centralBuffer.toString();
    const inventoryControlPeriodStr = policy.inventoryControlPeriod.toString();

    camps.forEach((camp) => {
      if (!newBufferRatios[camp.name]) {
        newBufferRatios[camp.name] = {};
      }
      if (!newPeriodicCounts[camp.name]) {
        newPeriodicCounts[camp.name] = {};
      }
      items.forEach((item) => {
        newBufferRatios[camp.name][item.name] = campBufferStr;
        newPeriodicCounts[camp.name][item.name] = inventoryControlPeriodStr;
      });
    });

    items.forEach((item) => {
      newCentralBufferRatios[item.name] = centralBufferStr;
      newCentralPeriodicCounts[item.name] = inventoryControlPeriodStr;
    });

    setPolicy({
      ...policy,
      bufferRatios: newBufferRatios,
      centralBufferRatios: newCentralBufferRatios,
      periodicCounts: newPeriodicCounts,
      centralPeriodicCounts: newCentralPeriodicCounts,
    });
  }, [
    campBuffer,
    centralBuffer,
    policy.inventoryControlPeriod,
    camps,
    items,
    hasManualEdits,
    setPolicy,
    policy,
  ]);

  const handleBufferRatioChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setHasManualEdits(true);
      setPolicy({
        ...policy,
        bufferRatios: {
          ...policy.bufferRatios,
          [campName]: { ...policy.bufferRatios[campName], [itemName]: value },
        },
      });
    }
  };

  const handleCentralBufferRatioChange = (itemName: string, value: string) => {
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setHasManualEdits(true);
      setPolicy({
        ...policy,
        centralBufferRatios: {
          ...policy.centralBufferRatios,
          [itemName]: value,
        },
      });
    }
  };

  const handlePeriodicCountChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    // Validate that input is a valid integer
    if (value === "" || /^-?\d*$/.test(value)) {
      setHasManualEdits(true);
      setPolicy({
        ...policy,
        periodicCounts: {
          ...policy.periodicCounts,
          [campName]: { ...policy.periodicCounts[campName], [itemName]: value },
        },
      });
    }
  };

  const handleCentralPeriodicCountChange = (
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^-?\d*$/.test(value)) {
      setHasManualEdits(true);
      setPolicy({
        ...policy,
        centralPeriodicCounts: {
          ...policy.centralPeriodicCounts,
          [itemName]: value,
        },
      });
    }
  };

  const handleInventoryControlPeriodChange = (value: string) => {
    if (value === "" || /^\d*$/.test(value)) {
      setHasManualEdits(true);
      setPolicy({
        ...policy,
        inventoryControlPeriod: value,
      });
    }
  };

  return (
    <>
      {/* Inventory Control Period Field */}
      <NestedCollapsibleSection
        title="Inventory Control Settings"
        level="secondary"
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Inventory Control Period (days)"
              type="number"
              inputProps={{ step: 1, min: 1 }}
              value={policy.inventoryControlPeriod || ""}
              onChange={(e) =>
                handleInventoryControlPeriodChange(e.target.value)
              }
              helperText="How often (in days) to review and reorder inventory"
            />
          </Grid>
        </Grid>
      </NestedCollapsibleSection>

      {/* Buffer Ratios Section */}
      <NestedCollapsibleSection title="Buffer Ratios" level="secondary">
        {camps.map((camp) => (
          <NestedCollapsibleSection
            key={`buffer-${camp.name}`}
            title={`${camp.name} Buffer Ratios`}
            level="tertiary"
          >
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={`${camp.name}-${item.name}-buffer`}
                >
                  <TextField
                    fullWidth
                    label={`${item.name} Buffer Ratio`}
                    placeholder={campBuffer}
                    type="number"
                    inputProps={{ step: 0.01, min: 0 }}
                    value={policy.bufferRatios[camp.name]?.[item.name] || ""}
                    onChange={(e) =>
                      handleBufferRatioChange(
                        camp.name,
                        item.name,
                        e.target.value
                      )
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </NestedCollapsibleSection>
        ))}
      </NestedCollapsibleSection>

      {/* Central Buffer Ratios Section */}
      <NestedCollapsibleSection title="Central Buffer Ratios" level="secondary">
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={`central-buffer-${item.name}`}
            >
              <TextField
                fullWidth
                label={`${item.name} Central Buffer Ratio`}
                placeholder={centralBuffer}
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
                value={policy.centralBufferRatios[item.name] || ""}
                onChange={(e) =>
                  handleCentralBufferRatioChange(item.name, e.target.value)
                }
              />
            </Grid>
          ))}
        </Grid>
      </NestedCollapsibleSection>

      {/* Periodic Counts Section */}
      <NestedCollapsibleSection title="Periodic Counts" level="secondary">
        {camps.map((camp) => (
          <NestedCollapsibleSection
            key={`periodic-${camp.name}`}
            title={`${camp.name} Periodic Counts`}
            level="tertiary"
          >
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={`${camp.name}-${item.name}-periodic`}
                >
                  <TextField
                    fullWidth
                    label={`${item.name} Periodic Count`}
                    placeholder={policy.inventoryControlPeriod}
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    value={policy.periodicCounts[camp.name]?.[item.name] || ""}
                    onChange={(e) =>
                      handlePeriodicCountChange(
                        camp.name,
                        item.name,
                        e.target.value
                      )
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </NestedCollapsibleSection>
        ))}
      </NestedCollapsibleSection>

      {/* Central Periodic Counts Section */}
      <NestedCollapsibleSection
        title="Central Periodic Counts"
        level="secondary"
      >
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={`central-periodic-${item.name}`}
            >
              <TextField
                fullWidth
                label={`${item.name} Central Periodic Count`}
                placeholder={policy.inventoryControlPeriod}
                type="number"
                inputProps={{ step: 1, min: 0 }}
                value={policy.centralPeriodicCounts[item.name] || ""}
                onChange={(e) =>
                  handleCentralPeriodicCountChange(item.name, e.target.value)
                }
              />
            </Grid>
          ))}
        </Grid>
      </NestedCollapsibleSection>
    </>
  );
};

export default OrderUpToPolicy;
