import React from "react";
import { Grid, TextField, Typography, Tooltip, Alert } from "@mui/material";
import { Item } from "../../../types/Item";
import { NestedCollapsibleSection } from "../../CollapsibleSections/CollapsibleSections";
import { TargetLevelPolicy as TargetLevelPolicyType } from "@/lib/simulationInput/types";

// --- TYPE DEFINITIONS ---

interface DistributionParameters {
    mean?: string;
    min?: string;
    mode?: string;
    max?: string;
    stdDev?: string;
}

interface DistributionData {
    distributionType: string;
    distParameters: DistributionParameters;
}

interface CampDemand {
    item: string;
    arrivalData: DistributionData;
    quantityData: DistributionData;
    leadTimeData: DistributionData;
    internalRatio: string;
    externalRatio: string;
}

interface Camp {
    name: string;
    initialInternalPopulation: number;
    initialExternalPopulation: number;
    demands?: CampDemand[];
}

interface Props {
    policy: TargetLevelPolicyType;
    setPolicy: (policy: TargetLevelPolicyType) => void;
    camps: Camp[];
    items: Item[];
}

// --- HELPER FUNCTIONS ---

const calculateMeanFromDistribution = (dist: DistributionData | undefined): number => {
    if (!dist || !dist.distParameters) return 0;
    const { distributionType, distParameters } = dist;
    const { mean, min, mode, max } = distParameters;

    if (distributionType === "TRIANGULAR") {
        return (parseFloat(min || "0") + parseFloat(mode || "0") + parseFloat(max || "0")) / 3;
    }
    return parseFloat(mean || "0");
};

const TargetLevelPolicy: React.FC<Props> = ({
                                                policy,
                                                setPolicy,
                                                camps,
                                                items,
                                            }) => {

    // --- HANDLERS ---

    const handleTargetLevelChange = (campName: string, itemName: string, field: "internal" | "external", value: string) => {
        // Allows any positive number (e.g., 0.5, 1.2, 5, 100.50)
        if (value === "" || /^\d*(\.\d*)?$/.test(value)) {
            setPolicy({
                ...policy,
                targetLevels: {
                    ...policy.targetLevels,
                    [campName]: {
                        ...policy.targetLevels[campName],
                        [itemName]: {
                            ...((policy.targetLevels[campName]?.[itemName] as any) || { internal: "0", external: "0" }),
                            [field]: value,
                        },
                    },
                },
            });
        }
    };

    const handleThresholdChange = (campName: string, itemName: string, value: string) => {
        // Allows any positive number
        if (value === "" || /^\d*(\.\d*)?$/.test(value)) {
            setPolicy({
                ...policy,
                thresholdRatios: {
                    ...policy.thresholdRatios,
                    [campName]: { ...(policy.thresholdRatios[campName] || {}), [itemName]: value },
                },
            });
        }
    };

    const handleInventoryControlPeriodChange = (value: string) => {
        if (value === "" || /^\d*$/.test(value)) {
            setPolicy({ ...policy, inventoryControlPeriod: value });
        }
    };

    const handleCentralTargetLevelChange = (itemName: string, field: string, value: string) => {
        setPolicy({
            ...policy,
            centralTargetLevels: {
                ...policy.centralTargetLevels,
                [itemName]: {
                    ...(policy.centralTargetLevels[itemName] as any || { internal: "0", external: "0" }),
                    [field]: value,
                },
            },
        });
    };

    const getTargetValue = (campName: string, itemName: string, field: "internal" | "external") => {
        const val = policy.targetLevels[campName]?.[itemName];
        return (val && typeof val === "object") ? val[field] : "";
    };

    return (
        <>
            <NestedCollapsibleSection title="Inventory Control Settings" level="secondary">
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            fullWidth
                            label="Inventory Control Period (days)"
                            type="number"
                            value={policy.inventoryControlPeriod || ""}
                            onChange={(e) => handleInventoryControlPeriodChange(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </NestedCollapsibleSection>

            <NestedCollapsibleSection title="Camp Inventory Settings" level="secondary">
                {/* Dynamic Policy Note for Camps */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12}>
                        <Alert severity="info">
                            <strong>Note:</strong> This policy is dynamic. Defined target ratios are preserved and scaled automatically based on population changes (i.e., migration).
                        </Alert>
                    </Grid>
                </Grid>

                {camps.map((camp) => (
                    <NestedCollapsibleSection
                        key={`camp-settings-${camp.name}`}
                        title={`${camp.name} Settings`}
                        level="tertiary"
                    >
                        <Grid container spacing={2}>
                            {items.map((item) => {
                                // --- CAMP CALCULATIONS ---
                                const demandConfig = camp.demands?.find((d) => d.item === item.name);

                                let dailyTotalDemand = 0;
                                let dailyInternalDemand = 0;
                                let dailyExternalDemand = 0;
                                let calculatedLeadTime = 0;

                                if (demandConfig) {
                                    calculatedLeadTime = calculateMeanFromDistribution(demandConfig.leadTimeData);

                                    const internalRatio = parseFloat(demandConfig.internalRatio || "0");
                                    const externalRatio = parseFloat(demandConfig.externalRatio || "0");

                                    const populationMultiplierInternal = (camp.initialInternalPopulation * internalRatio);
                                    const populationMultiplierExternal = (camp.initialExternalPopulation * externalRatio);
                                    const populationMultiplier = populationMultiplierInternal + populationMultiplierExternal;

                                    const arrivalMean = parseFloat(demandConfig.arrivalData.distParameters.mean || "0");

                                    if (arrivalMean > 0) {
                                        const frequencyPerDay = (1 / arrivalMean);
                                        const avgQuantity = 1;

                                        dailyInternalDemand = (frequencyPerDay * populationMultiplierInternal) * avgQuantity;
                                        dailyExternalDemand = (frequencyPerDay * populationMultiplierExternal) * avgQuantity;
                                        dailyTotalDemand = (frequencyPerDay * populationMultiplier) * avgQuantity;
                                    }
                                }

                                const reviewPeriod = parseFloat(policy.inventoryControlPeriod || "0");
                                const ddlt = (dailyTotalDemand * calculatedLeadTime).toFixed(2);
                                const ddpcc = (dailyTotalDemand * reviewPeriod).toFixed(2);

                                // --- CALCULATIONS: Replenishment & Threshold ---
                                const targetRatioInt = parseFloat(getTargetValue(camp.name, item.name, "internal") || "0");
                                const targetRatioExt = parseFloat(getTargetValue(camp.name, item.name, "external") || "0");
                                const thresholdRatio = parseFloat(policy.thresholdRatios[camp.name]?.[item.name] || "0");

                                // Cycle Demand (Internal vs External)
                                const cycleDemandInt = dailyInternalDemand * reviewPeriod;
                                const cycleDemandExt = dailyExternalDemand * reviewPeriod;

                                // Targets (Quantity)
                                const targetQtyInt = cycleDemandInt * targetRatioInt;
                                const targetQtyExt = cycleDemandExt * targetRatioExt;

                                // Final Metrics (Rounded Up to Integer)
                                const replenishmentTarget = Math.ceil(targetQtyInt + targetQtyExt);
                                const thresholdQuantity = Math.ceil((targetQtyInt + targetQtyExt) * thresholdRatio);

                                return (
                                    <React.Fragment key={`${camp.name}-${item.name}-settings`}>
                                        <Grid item xs={12} sx={{ mt: 2, mb: 1 }}>
                                            <Typography variant="subtitle1" style={{ fontWeight: "bold" }}>
                                                {item.name}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" display="block">
                                                <strong>Expected Daily Demand: {dailyTotalDemand.toFixed(2)} units</strong>
                                                {" "}(internal: {dailyInternalDemand.toFixed(2)}, external: {dailyExternalDemand.toFixed(2)})
                                                {" "} |
                                                (Expected Lead Time: {calculatedLeadTime.toFixed(1)} days)
                                            </Typography>
                                        </Grid>

                                        {/* Inputs */}
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <TextField
                                                fullWidth
                                                label="Internal Target Level"
                                                type="number"
                                                inputProps={{ step: 0.01, min: 0 }}
                                                value={getTargetValue(camp.name, item.name, "internal")}
                                                onChange={(e) => handleTargetLevelChange(camp.name, item.name, "internal", e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <TextField
                                                fullWidth
                                                label="External Target Level"
                                                type="number"
                                                inputProps={{ step: 0.01, min: 0 }}
                                                value={getTargetValue(camp.name, item.name, "external")}
                                                onChange={(e) => handleTargetLevelChange(camp.name, item.name, "external", e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <TextField
                                                fullWidth
                                                label="Threshold Ratio"
                                                type="number"
                                                inputProps={{ step: 0.01, min: 0 }}
                                                value={policy.thresholdRatios[camp.name]?.[item.name] || ""}
                                                onChange={(e) => handleThresholdChange(camp.name, item.name, e.target.value)}
                                            />
                                        </Grid>

                                        {/* Read-Only Calculated Fields */}
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <Tooltip title={`Daily Demand (${dailyTotalDemand.toFixed(2)}) * Lead Time (${calculatedLeadTime.toFixed(2)})`}>
                                                <TextField
                                                    fullWidth
                                                    label="Demand During Lead Time"
                                                    value={ddlt}
                                                    disabled
                                                    InputProps={{ readOnly: true, style: { backgroundColor: "#f5f5f5" } }}
                                                    variant="filled"
                                                />
                                            </Tooltip>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <Tooltip title={`Daily Demand (${dailyTotalDemand.toFixed(2)}) * Control Period (${reviewPeriod})`}>
                                                <TextField
                                                    fullWidth
                                                    label="Demand During Cycle"
                                                    value={ddpcc}
                                                    disabled
                                                    InputProps={{ readOnly: true, style: { backgroundColor: "#f5f5f5" } }}
                                                    variant="filled"
                                                />
                                            </Tooltip>
                                        </Grid>

                                        {/* Replenishment & Threshold Outputs (Rounded Up Integers) */}
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <Tooltip title="(Cycle Internal Demand * Int Ratio) + (Cycle External Demand * Ext Ratio)">
                                                <TextField
                                                    fullWidth
                                                    label="Replenishment Target"
                                                    value={replenishmentTarget}
                                                    disabled
                                                    InputProps={{ readOnly: true, style: { backgroundColor: "#e8f5e9" } }}
                                                    variant="filled"
                                                />
                                            </Tooltip>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={2.4}>
                                            <Tooltip title="Replenishment Target * Threshold Ratio">
                                                <TextField
                                                    fullWidth
                                                    label="Threshold Quantity"
                                                    value={thresholdQuantity}
                                                    disabled
                                                    InputProps={{ readOnly: true, style: { backgroundColor: "#ffebee" } }}
                                                    variant="filled"
                                                />
                                            </Tooltip>
                                        </Grid>
                                    </React.Fragment>
                                );
                            })}
                        </Grid>
                    </NestedCollapsibleSection>
                ))}
            </NestedCollapsibleSection>

            {/* Central Warehouse Settings */}
            <NestedCollapsibleSection title="Central Warehouse Settings" level="secondary">
                {/* Dynamic Policy Note for Central */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12}>
                        <Alert severity="info">
                            <strong>Note:</strong> This policy is dynamic. Aggregated targets will adjust automatically as camp populations change over time.
                        </Alert>
                    </Grid>
                </Grid>

                <Grid container spacing={2}>
                    {items.map((item) => {
                        // --- CENTRAL AGGREGATION CALCULATIONS ---
                        let totalDailyDemand = 0;
                        let totalDailyInternal = 0;
                        let totalDailyExternal = 0;

                        camps.forEach(camp => {
                            const demandConfig = camp.demands?.find((d) => d.item === item.name);
                            if (demandConfig) {
                                const internalRatio = parseFloat(demandConfig.internalRatio || "0");
                                const externalRatio = parseFloat(demandConfig.externalRatio || "0");

                                const populationMultiplierInternal = (camp.initialInternalPopulation * internalRatio);
                                const populationMultiplierExternal = (camp.initialExternalPopulation * externalRatio);
                                const populationMultiplier = populationMultiplierInternal + populationMultiplierExternal;

                                const arrivalMean = parseFloat(demandConfig.arrivalData.distParameters.mean || "0");

                                if (arrivalMean > 0) {
                                    const frequencyPerDay = (1 / arrivalMean);
                                    const avgQuantity = 1;

                                    const dailyInternal = (frequencyPerDay * populationMultiplierInternal) * avgQuantity;
                                    const dailyExternal = (frequencyPerDay * populationMultiplierExternal) * avgQuantity;
                                    const dailyTotal = (frequencyPerDay * populationMultiplier) * avgQuantity;

                                    totalDailyInternal += dailyInternal;
                                    totalDailyExternal += dailyExternal;
                                    totalDailyDemand += dailyTotal;
                                }
                            }
                        });

                        const reviewPeriod = parseFloat(policy.inventoryControlPeriod || "0");
                        const supplierLeadTime = calculateMeanFromDistribution((item as any).leadTimeData);

                        const ddpccCentral = (totalDailyDemand * reviewPeriod).toFixed(2);
                        const ddltCentral = (totalDailyDemand * supplierLeadTime).toFixed(2);

                        // --- CENTRAL CALCULATIONS ---
                        const centralIntRatio = parseFloat((policy.centralTargetLevels[item.name] as any)?.internal || "0");
                        const centralExtRatio = parseFloat((policy.centralTargetLevels[item.name] as any)?.external || "0");

                        const centralCycleInt = totalDailyInternal * reviewPeriod;
                        const centralCycleExt = totalDailyExternal * reviewPeriod;

                        // Final Central Target (Rounded Up to Integer)
                        const centralRepTarget = Math.ceil((centralCycleInt * centralIntRatio) + (centralCycleExt * centralExtRatio));

                        return (
                            <React.Fragment key={`central-${item.name}`}>
                                {/* Title and Stats */}
                                <Grid item xs={12} sx={{ mt: 3, mb: 1, borderBottom: '1px solid #eee', pb: 1 }}>
                                    <Typography variant="subtitle1" style={{ fontWeight: "bold" }}>
                                        {item.name}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" display="block">
                                        <strong>Total Daily Demand from All Camps: {totalDailyDemand.toFixed(2)} units</strong>
                                        {' '}(Internal: {totalDailyInternal.toFixed(2)}, External: {totalDailyExternal.toFixed(2)})
                                        {" "} |
                                        (Supplier Lead Time: {supplierLeadTime.toFixed(1)} days)
                                    </Typography>
                                </Grid>

                                {/* Inputs */}
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Central Internal Target"
                                        type="number"
                                        inputProps={{ step: 0.01, min: 0 }}
                                        value={(policy.centralTargetLevels[item.name] as any)?.internal || 0}
                                        onChange={(e) => handleCentralTargetLevelChange(item.name, 'internal', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Central External Target"
                                        type="number"
                                        inputProps={{ step: 0.01, min: 0 }}
                                        value={(policy.centralTargetLevels[item.name] as any)?.external || 0}
                                        onChange={(e) => handleCentralTargetLevelChange(item.name, 'external', e.target.value)}
                                    />
                                </Grid>

                                {/* Read-Only Calculated Fields (Central) */}
                                <Grid item xs={12} sm={6} md={2}>
                                    <Tooltip title={`Total Aggregated Daily Demand (${totalDailyDemand.toFixed(2)}) * Supplier Lead Time (${supplierLeadTime.toFixed(2)})`}>
                                        <TextField
                                            fullWidth
                                            label="Demand During Lead Time"
                                            value={ddltCentral}
                                            disabled
                                            InputProps={{ readOnly: true, style: { backgroundColor: "#f5f5f5" } }}
                                            variant="filled"
                                        />
                                    </Tooltip>
                                </Grid>

                                <Grid item xs={12} sm={6} md={2}>
                                    <Tooltip title={`Total Aggregated Daily Demand (${totalDailyDemand.toFixed(2)}) * Control Period (${reviewPeriod})`}>
                                        <TextField
                                            fullWidth
                                            label="Agg. Demand During Cycle"
                                            value={ddpccCentral}
                                            disabled
                                            InputProps={{ readOnly: true, style: { backgroundColor: "#f5f5f5" } }}
                                            variant="filled"
                                        />
                                    </Tooltip>
                                </Grid>

                                {/* Central Replenishment Target (Integer) */}
                                <Grid item xs={12} sm={6} md={2}>
                                    <Tooltip title="(Agg. Cycle Int * Int Ratio) + (Agg. Cycle Ext * Ext Ratio)">
                                        <TextField
                                            fullWidth
                                            label="Replenishment Target"
                                            value={centralRepTarget}
                                            disabled
                                            InputProps={{ readOnly: true, style: { backgroundColor: "#e8f5e9" } }}
                                            variant="filled"
                                        />
                                    </Tooltip>
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