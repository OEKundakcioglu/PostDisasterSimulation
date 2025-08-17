import React from "react";
import { Grid, TextField, Checkbox, FormControlLabel } from "@mui/material";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";

interface InitialState {
  availableFunds: string;
  initialInventory: { [campName: string]: { [itemName: string]: string } };
  initialCentralWarehouseInventory: { [itemName: string]: string };
  earmarkedFunds: { [campName: string]: string };
  initialEarmarkedInKind: {
    [campName: string]: { [itemName: string]: string };
  };
  isItemAvailable: { [itemName: string]: boolean };
}

interface Camp {
  name: string;
}

interface Item {
  name: string;
}

interface Props {
  initialState: InitialState;
  setInitialState: React.Dispatch<React.SetStateAction<InitialState>>;
  camps: Camp[];
  items: Item[];
}

const InitialStateSection: React.FC<Props> = ({
  initialState,
  setInitialState,
  camps,
  items,
}) => {
  const handleAvailableFundsChange = (value: string) => {
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setInitialState((prev) => ({
        ...prev,
        availableFunds: value,
      }));
    }
  };

  const handleInitialInventoryChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^\d*$/.test(value)) {
      const newInitialInventory = { ...initialState.initialInventory };
      if (!newInitialInventory[campName]) {
        newInitialInventory[campName] = {};
      }
      newInitialInventory[campName][itemName] = value;
      setInitialState((prev) => ({
        ...prev,
        initialInventory: newInitialInventory,
      }));
    }
  };

  const handleCentralWarehouseInventoryChange = (
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^\d*$/.test(value)) {
      const newCentralWarehouseInventory = {
        ...initialState.initialCentralWarehouseInventory,
      };
      newCentralWarehouseInventory[itemName] = value;
      setInitialState((prev) => ({
        ...prev,
        initialCentralWarehouseInventory: newCentralWarehouseInventory,
      }));
    }
  };

  const handleEarmarkedFundsChange = (campName: string, value: string) => {
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      const newEarmarkedFunds = { ...initialState.earmarkedFunds };
      newEarmarkedFunds[campName] = value;
      setInitialState((prev) => ({
        ...prev,
        earmarkedFunds: newEarmarkedFunds,
      }));
    }
  };

  const handleInitialEarmarkedInKindChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^\d*$/.test(value)) {
      const newInitialEarmarkedInKind = {
        ...initialState.initialEarmarkedInKind,
      };
      if (!newInitialEarmarkedInKind[campName]) {
        newInitialEarmarkedInKind[campName] = {};
      }
      newInitialEarmarkedInKind[campName][itemName] = value;
      setInitialState((prev) => ({
        ...prev,
        initialEarmarkedInKind: newInitialEarmarkedInKind,
      }));
    }
  };

  const handleIsItemAvailableChange = (itemName: string, checked: boolean) => {
    const newIsItemAvailable = { ...initialState.isItemAvailable };
    newIsItemAvailable[itemName] = checked;
    setInitialState((prev) => ({
      ...prev,
      isItemAvailable: newIsItemAvailable,
    }));
  };

  return (
    <>
      {/* Available Funds */}
      <NestedCollapsibleSection title="Available Funds" level="secondary">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Available Funds"
              type="number"
              inputProps={{ step: 0.01, min: 0 }}
              value={initialState.availableFunds}
              onChange={(e) => handleAvailableFundsChange(e.target.value)}
            />
          </Grid>
        </Grid>
      </NestedCollapsibleSection>

      {/* Initial Inventory */}
      <NestedCollapsibleSection title="Initial Inventory" level="secondary">
        {camps.map((camp) => (
          <NestedCollapsibleSection
            key={`inventory-${camp.name}`}
            title={`Camp: ${camp.name}`}
            level="tertiary"
          >
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={`${camp.name}-${item.name}`}
                >
                  <TextField
                    fullWidth
                    label={`${item.name} Initial Quantity`}
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    value={
                      initialState.initialInventory[camp.name]?.[item.name] ||
                      "0"
                    }
                    onChange={(e) =>
                      handleInitialInventoryChange(
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

      {/* Initial Central Warehouse Inventory */}
      <NestedCollapsibleSection
        title="Initial Central Warehouse Inventory"
        level="secondary"
      >
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={`central-${item.name}`}>
              <TextField
                fullWidth
                label={`${item.name} Central Inventory`}
                type="number"
                inputProps={{ step: 1, min: 0 }}
                value={
                  initialState.initialCentralWarehouseInventory[item.name] ||
                  "0"
                }
                onChange={(e) =>
                  handleCentralWarehouseInventoryChange(
                    item.name,
                    e.target.value
                  )
                }
              />
            </Grid>
          ))}
        </Grid>
      </NestedCollapsibleSection>

      {/* Earmarked Funds */}
      <NestedCollapsibleSection title="Earmarked Funds" level="secondary">
        <Grid container spacing={2}>
          {camps.map((camp) => (
            <Grid item xs={12} sm={6} md={4} key={`earmarked-${camp.name}`}>
              <TextField
                fullWidth
                label={`${camp.name} Earmarked Funds`}
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
                value={initialState.earmarkedFunds[camp.name] || "0"}
                onChange={(e) =>
                  handleEarmarkedFundsChange(camp.name, e.target.value)
                }
              />
            </Grid>
          ))}
        </Grid>
      </NestedCollapsibleSection>

      {/* Initial Earmarked In-Kind */}
      <NestedCollapsibleSection
        title="Initial Earmarked In-Kind"
        level="secondary"
      >
        {camps.map((camp) => (
          <NestedCollapsibleSection
            key={`in-kind-${camp.name}`}
            title={`Camp: ${camp.name}`}
            level="tertiary"
          >
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={`${camp.name}-${item.name}-in-kind`}
                >
                  <TextField
                    fullWidth
                    label={`${item.name} In-Kind`}
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    value={
                      initialState.initialEarmarkedInKind[camp.name]?.[
                        item.name
                      ] || "0"
                    }
                    onChange={(e) =>
                      handleInitialEarmarkedInKindChange(
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

      {/* Is Item Available */}
      <NestedCollapsibleSection title="Item Availability" level="secondary">
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={`availability-${item.name}`}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={initialState.isItemAvailable[item.name] || false}
                    onChange={(e) =>
                      handleIsItemAvailableChange(item.name, e.target.checked)
                    }
                  />
                }
                label={`${item.name} Available`}
              />
            </Grid>
          ))}
        </Grid>
      </NestedCollapsibleSection>
    </>
  );
};

export default InitialStateSection;
