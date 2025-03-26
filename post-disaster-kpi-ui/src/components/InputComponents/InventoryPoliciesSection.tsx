import React, { useEffect, useState } from "react";
import { Typography, Grid, TextField, Paper } from "@mui/material";
import { Item } from "../../types/Item"; // Adjust path if needed

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
  // **New state to track manual edits**
  const [hasManualEdits, setHasManualEdits] = useState(false);

  useEffect(() => {
    if (hasManualEdits) return;

    const newBufferRatios = { ...inventoryPolicy.bufferRatios };
    const newCentralBufferRatios = { ...inventoryPolicy.centralBufferRatios };
    const newPeriodicCounts = { ...inventoryPolicy.periodicCounts };
    const newCentralPeriodicCounts = {
      ...inventoryPolicy.centralPeriodicCounts,
    };
    camps.forEach((camp) => {
      if (!newBufferRatios[camp.name]) {
        newBufferRatios[camp.name] = {};
      }
      if (!newPeriodicCounts[camp.name]) {
        newPeriodicCounts[camp.name] = {};
      }
      items.forEach((item) => {
        newBufferRatios[camp.name][item.name] = campBuffer;
        newPeriodicCounts[camp.name][item.name] = inventoryControlPeriod;
      });
    });

    items.forEach((item) => {
      newCentralBufferRatios[item.name] = centralBuffer;
      newCentralPeriodicCounts[item.name] = inventoryControlPeriod;
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
  ]); // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleBufferRatioChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    setHasManualEdits(true);
    setInventoryPolicy((prev) => ({
      ...prev,
      bufferRatios: {
        ...prev.bufferRatios,
        [campName]: { ...prev.bufferRatios[campName], [itemName]: value },
      },
    }));
  };

  const handleCentralBufferRatioChange = (itemName: string, value: string) => {
    setHasManualEdits(true);
    setInventoryPolicy((prev) => ({
      ...prev,
      centralBufferRatios: { ...prev.centralBufferRatios, [itemName]: value },
    }));
  };

  const handlePeriodicCountChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    setHasManualEdits(true);
    setInventoryPolicy((prev) => ({
      ...prev,
      periodicCounts: {
        ...prev.periodicCounts,
        [campName]: { ...prev.periodicCounts[campName], [itemName]: value },
      },
    }));
  };

  const handleCentralPeriodicCountChange = (
    itemName: string,
    value: string
  ) => {
    setHasManualEdits(true);
    setInventoryPolicy((prev) => ({
      ...prev,
      centralPeriodicCounts: {
        ...prev.centralPeriodicCounts,
        [itemName]: value,
      },
    }));
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ marginTop: 4 }}>
        Inventory Policies
      </Typography>

      {/* Buffer Ratios Section */}
      <Paper sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant="h6">Buffer Ratios</Typography>
        {camps.map((camp) => (
          <Paper key={`buffer-${camp.name}`} sx={{ padding: 2, marginTop: 4 }}>
            <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
              {camp.name}
            </Typography>
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
          </Paper>
        ))}
      </Paper>

      {/* Central Buffer Ratios Section */}
      <Paper sx={{ padding: 2, marginTop: 4 }}>
        <Typography variant="h6" sx={{ marginBottom: 2 }}>
          Central Buffer Ratios
        </Typography>
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
                value={inventoryPolicy.centralBufferRatios[item.name] || ""}
                onChange={(e) =>
                  handleCentralBufferRatioChange(item.name, e.target.value)
                }
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Periodic Counts Section */}
      <Paper sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant="h6">Periodic Counts</Typography>
        {camps.map((camp) => (
          <Paper
            key={`periodic-${camp.name}`}
            sx={{ padding: 2, marginTop: 4 }}
          >
            <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
              {camp.name}
            </Typography>
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
          </Paper>
        ))}
      </Paper>

      {/* Central Periodic Counts Section */}
      <Paper sx={{ padding: 2, marginTop: 4 }}>
        <Typography variant="h6" sx={{ marginBottom: 2 }}>
          Central Periodic Counts
        </Typography>
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
                value={inventoryPolicy.centralPeriodicCounts[item.name] || ""}
                onChange={(e) =>
                  handleCentralPeriodicCountChange(item.name, e.target.value)
                }
              />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </>
  );
};

export default InventoryPoliciesSection;
