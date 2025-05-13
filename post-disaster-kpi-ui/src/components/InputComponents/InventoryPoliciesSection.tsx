import React, { useEffect, useState } from "react";
import { Typography, Grid, TextField } from "@mui/material";
import { Item } from "../../types/Item";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";

interface InventoryPolicy {
  bufferRatios: { [campName: string]: { [itemName: string]: string } };
  centralBufferRatios: { [itemName: string]: string };
  periodicCounts: { [campName: string]: { [itemName: string]: string } };
  centralPeriodicCounts: { [itemName: string]: string };
}

interface Camp {
  name: string;
}

interface Props {
  inventoryPolicy: InventoryPolicy;
  setInventoryPolicy: React.Dispatch<React.SetStateAction<InventoryPolicy>>;
  camps: Camp[];
  items: Item[];
  campBuffer: string;
  centralBuffer: string;
  inventoryControlPeriod: string;
}

const InventoryPoliciesSection: React.FC<Props> = ({
  inventoryPolicy,
  setInventoryPolicy,
  camps,
  items,
  campBuffer,
  centralBuffer,
  inventoryControlPeriod,
}) => {
  // State to track manual edits
  const [hasManualEdits, setHasManualEdits] = useState(false);

  useEffect(() => {
    if (hasManualEdits) return;

    const newBufferRatios = { ...inventoryPolicy.bufferRatios };
    const newCentralBufferRatios = { ...inventoryPolicy.centralBufferRatios };
    const newPeriodicCounts = { ...inventoryPolicy.periodicCounts };
    const newCentralPeriodicCounts = {
      ...inventoryPolicy.centralPeriodicCounts,
    };

    // Ensure values are strings
    const campBufferStr = campBuffer.toString();
    const centralBufferStr = centralBuffer.toString();
    const inventoryControlPeriodStr = inventoryControlPeriod.toString();

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

    setInventoryPolicy((prev) => ({
      ...prev,
      bufferRatios: newBufferRatios,
      centralBufferRatios: newCentralBufferRatios,
      periodicCounts: newPeriodicCounts,
      centralPeriodicCounts: newCentralPeriodicCounts,
    }));
  }, [
    campBuffer,
    centralBuffer,
    inventoryControlPeriod,
    camps,
    items,
    setInventoryPolicy,
    hasManualEdits,
    inventoryPolicy.bufferRatios,
    inventoryPolicy.centralBufferRatios,
    inventoryPolicy.periodicCounts,
    inventoryPolicy.centralPeriodicCounts,
  ]);

  const handleBufferRatioChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    // Validate that input is a valid number
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setHasManualEdits(true);
      setInventoryPolicy((prev) => ({
        ...prev,
        bufferRatios: {
          ...prev.bufferRatios,
          [campName]: { ...prev.bufferRatios[campName], [itemName]: value },
        },
      }));
    }
  };

  const handleCentralBufferRatioChange = (itemName: string, value: string) => {
    // Validate that input is a valid number
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setHasManualEdits(true);
      setInventoryPolicy((prev) => ({
        ...prev,
        centralBufferRatios: { ...prev.centralBufferRatios, [itemName]: value },
      }));
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
      setInventoryPolicy((prev) => ({
        ...prev,
        periodicCounts: {
          ...prev.periodicCounts,
          [campName]: { ...prev.periodicCounts[campName], [itemName]: value },
        },
      }));
    }
  };

  const handleCentralPeriodicCountChange = (
    itemName: string,
    value: string
  ) => {
    // Validate that input is a valid integer
    if (value === "" || /^-?\d*$/.test(value)) {
      setHasManualEdits(true);
      setInventoryPolicy((prev) => ({
        ...prev,
        centralPeriodicCounts: {
          ...prev.centralPeriodicCounts,
          [itemName]: value,
        },
      }));
    }
  };

  return (
    <>
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
                    value={
                      inventoryPolicy.bufferRatios[camp.name]?.[item.name] || ""
                    }
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
                value={inventoryPolicy.centralBufferRatios[item.name] || ""}
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
                    placeholder={inventoryControlPeriod}
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    value={
                      inventoryPolicy.periodicCounts[camp.name]?.[item.name] ||
                      ""
                    }
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
                placeholder={inventoryControlPeriod}
                type="number"
                inputProps={{ step: 1, min: 0 }}
                value={inventoryPolicy.centralPeriodicCounts[item.name] || ""}
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

export default InventoryPoliciesSection;
