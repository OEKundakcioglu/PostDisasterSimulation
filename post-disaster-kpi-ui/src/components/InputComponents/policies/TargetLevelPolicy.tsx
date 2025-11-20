import React from "react";
import { Grid, TextField, Typography } from "@mui/material";
import { Item } from "../../../types/Item";
import { NestedCollapsibleSection } from "../../CollapsibleSections/CollapsibleSections";
import { TargetLevelPolicy as TargetLevelPolicyType } from "@/lib/simulationInput/types";

interface Camp {
  name: string;
}

interface Props {
  policy: TargetLevelPolicyType;
  setPolicy: (policy: TargetLevelPolicyType) => void;
  camps: Camp[];
  items: Item[];
}

const TargetLevelPolicy: React.FC<Props> = ({
  policy,
  setPolicy,
  camps,
  items,
}) => {
  const handleTargetLevelChange = (
    campName: string,
    itemName: string,
    field: "internal" | "external",
    value: string
  ) => {
    // Allow values between 0 and 1 with decimals
    if (value === "" || /^0(\.\d*)?$|^1(\.0*)?$/.test(value)) {
      const numValue = parseFloat(value);
      if (value === "" || (numValue >= 0 && numValue <= 1)) {
        setPolicy({
          ...policy,
          targetLevels: {
            ...policy.targetLevels,
            [campName]: {
              ...policy.targetLevels[campName],
              [itemName]: {
                ...((policy.targetLevels[campName]?.[itemName] as {
                  internal: string;
                  external: string;
                }) || {
                  internal: "0",
                  external: "0",
                }),
                [field]: value,
              },
            },
          },
        });
      }
    }
  };

    const handleCentralTargetLevelChange = (
        itemName: string,
        field: "internal" | "external",
        value: string
    ) => {
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            const currentValues =
                typeof policy.centralTargetLevels[itemName] === "object"
                    ? policy.centralTargetLevels[itemName]
                    : { internal: "0", external: "0" };

            setPolicy({
                ...policy,
                centralTargetLevels: {
                    ...policy.centralTargetLevels,
                    [itemName]: {
                        ...currentValues,
                        [field]: value,
                    },
                },
            });
        }
    };

  const handleThresholdChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^0(\.\d*)?$|^1(\.0*)?$/.test(value)) {
      const numValue = parseFloat(value);
      if (value === "" || (numValue >= 0 && numValue <= 1)) {
        setPolicy({
          ...policy,
          thresholdRatios: {
            ...policy.thresholdRatios,
            [campName]: {
              ...(policy.thresholdRatios[campName] || {}),
              [itemName]: value,
            },
          },
        });
      }
    }
  };


  const handleInventoryControlPeriodChange = (value: string) => {
    if (value === "" || /^\d*$/.test(value)) {
      setPolicy({
        ...policy,
        inventoryControlPeriod: value,
      });
    }
  };

  const getTargetValue = (
    campName: string,
    itemName: string,
    field: "internal" | "external"
  ) => {
    const val = policy.targetLevels[campName]?.[itemName];
    if (val && typeof val === "object") {
      return val[field];
    }
    return "";
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

            {/* Camp Settings Section */}
            <NestedCollapsibleSection
                title="Camp Inventory Settings"
                level="secondary"
            >
                {camps.map((camp) => (
                    <NestedCollapsibleSection
                        key={`camp-settings-${camp.name}`}
                        title={`${camp.name} Settings`}
                        level="tertiary"
                    >
                        <Grid container spacing={2}>
                            {items.map((item) => (
                                <React.Fragment key={`${camp.name}-${item.name}-settings`}>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            {item.name}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            label="Internal Target Level"
                                            type="number"
                                            inputProps={{ step: 0.01, min: 0, max: 1 }}
                                            value={getTargetValue(camp.name, item.name, "internal")}
                                            onChange={(e) =>
                                                handleTargetLevelChange(
                                                    camp.name,
                                                    item.name,
                                                    "internal",
                                                    e.target.value
                                                )
                                            }
                                            helperText="0-1 (fraction of the camp's internal population)"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            label="External Target Level"
                                            type="number"
                                            inputProps={{ step: 0.01, min: 0, max: 1 }}
                                            value={getTargetValue(camp.name, item.name, "external")}
                                            onChange={(e) =>
                                                handleTargetLevelChange(
                                                    camp.name,
                                                    item.name,
                                                    "external",
                                                    e.target.value
                                                )
                                            }
                                            helperText="0-1 (fraction of the camp's external population)"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            label="Threshold Ratio (Sharing Cutoff)"
                                            type="number"
                                            inputProps={{ step: 0.01, min: 0, max: 1 }}
                                            value={
                                                policy.thresholdRatios[camp.name]?.[item.name] || ""
                                            }
                                            onChange={(e) =>
                                                handleThresholdChange(
                                                    camp.name,
                                                    item.name,
                                                    e.target.value
                                                )
                                            }
                                            helperText="0-1 (fraction of the camp's target level)"
                                        />
                                    </Grid>
                                </React.Fragment>
                            ))}
                        </Grid>
                    </NestedCollapsibleSection>
                ))}
            </NestedCollapsibleSection>

            {/* Central Warehouse Settings Section */}
            <NestedCollapsibleSection
                title="Central Warehouse Settings"
                level="secondary"
            >
                <Grid container spacing={2}>
                    {items.map((item) => {
                        const rawData = policy.centralTargetLevels[item.name] as any;

                        const internalVal = rawData?.internal ?? "0";
                        const externalVal = rawData?.external ?? "0";

                        return (
                            <React.Fragment key={`central-settings-${item.name}`}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {item.name}
                                    </Typography>
                                </Grid>

                                {/* Central Internal Target */}
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Central Internal Target"
                                        type="number"
                                        inputProps={{ step: 0.01, min: 0, max: 1 }}
                                        value={internalVal}
                                        onChange={(e) =>
                                            handleCentralTargetLevelChange(
                                                item.name,
                                                "internal",
                                                e.target.value
                                            )
                                        }
                                        helperText="0-1 (fraction of the internal population)"
                                    />
                                </Grid>

                                {/* Central External Target */}
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Central External Target"
                                        type="number"
                                        inputProps={{ step: 0.01, min: 0, max: 1 }}
                                        value={externalVal}
                                        onChange={(e) =>
                                            handleCentralTargetLevelChange(
                                                item.name,
                                                "external",
                                                e.target.value
                                            )
                                        }
                                        helperText="0-1 (fraction of the external population)"
                                    />
                                </Grid>
                            </React.Fragment>
                        );
                    })}
                </Grid>
            </NestedCollapsibleSection>
        </>
    );
};

export default TargetLevelPolicy;
