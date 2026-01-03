import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from "@mui/material";
import { Item } from "../../types/Item";
import {
  InventoryPolicy,
  InventoryPolicyType,
  OrderUpToPolicy as OrderUpToPolicyType,
  TargetLevelPolicy as TargetLevelPolicyType,
  Camp,
} from "@/lib/simulationInput/types";
import OrderUpToPolicy from "./policies/OrderUpToPolicy";
import TargetLevelPolicy from "./policies/TargetLevelPolicy";

interface Props {
  inventoryPolicy: InventoryPolicy;
  setInventoryPolicy: React.Dispatch<React.SetStateAction<InventoryPolicy>>;
  camps: Camp[];
  items: Item[];
  campBuffer: string;
  centralBuffer: string;
}

const InventoryPoliciesSection: React.FC<Props> = ({
  inventoryPolicy,
  setInventoryPolicy,
  camps,
  items,
  campBuffer,
  centralBuffer,
}) => {
  const handlePolicyTypeChange = (newType: InventoryPolicyType) => {
    if (newType === inventoryPolicy.policyType) return;

    if (newType === "ORDER_UP_TO") {
      const newPolicy: OrderUpToPolicyType = {
        policyType: "ORDER_UP_TO",
        inventoryControlPeriod: inventoryPolicy.inventoryControlPeriod || "5",
        bufferRatios: {},
        centralBufferRatios: {},
        periodicCounts: {},
        centralPeriodicCounts: {},
      };

      camps.forEach((camp) => {
        newPolicy.bufferRatios[camp.name] = {};
        newPolicy.periodicCounts[camp.name] = {};
        items.forEach((item) => {
          newPolicy.bufferRatios[camp.name][item.name] = campBuffer;
          newPolicy.periodicCounts[camp.name][item.name] =
            newPolicy.inventoryControlPeriod;
        });
      });

      items.forEach((item) => {
        newPolicy.centralBufferRatios[item.name] = centralBuffer;
        newPolicy.centralPeriodicCounts[item.name] =
          newPolicy.inventoryControlPeriod;
      });

      setInventoryPolicy(newPolicy);
    } else if (newType === "TARGET_LEVEL") {
      const newPolicy: TargetLevelPolicyType = {
        policyType: "TARGET_LEVEL",
        inventoryControlPeriod: inventoryPolicy.inventoryControlPeriod || "5",
        targetLevels: {},
        centralTargetLevels: {},
        thresholdRatios: {},
      };

      camps.forEach((camp) => {
        newPolicy.targetLevels[camp.name] = {};
        newPolicy.thresholdRatios[camp.name] = {};
        items.forEach((item) => {
          newPolicy.targetLevels[camp.name][item.name] = {
            s_reorderPoint: "0",
            S_targetRatio: "1.5",
            S_targetLevel: "0",
            rationingThreshold: "0",
          };
          newPolicy.thresholdRatios[camp.name][item.name] = "0.2";
        });
      });

        items.forEach((item) => {
            newPolicy.centralTargetLevels[item.name]  = {
                s_reorderPoint: "0",
                S_targetRatio: "1.5",
                S_targetLevel: "0",
            };
        });

      setInventoryPolicy(newPolicy);
    }
  };

  return (
    <>
      {/* Policy Type Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="policy-type-label">Inventory Policy Type</InputLabel>
          <Select
            labelId="policy-type-label"
            id="policy-type-select"
            value={inventoryPolicy.policyType}
            label="Inventory Policy Type"
            onChange={(e) =>
              handlePolicyTypeChange(e.target.value as InventoryPolicyType)
            }
          >
            <MenuItem value="ORDER_UP_TO">Order Up To Policy</MenuItem>
            <MenuItem value="TARGET_LEVEL">Target Level Policy</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {inventoryPolicy.policyType === "ORDER_UP_TO"
            ? "Order inventory up to a target level based on buffer ratios and periodic review."
            : "Maintain inventory at target levels."}
        </Typography>
      </Box>

      {/* Render the appropriate policy component */}
      {inventoryPolicy.policyType === "ORDER_UP_TO" && (
        <OrderUpToPolicy
          policy={inventoryPolicy}
          setPolicy={(policy) => setInventoryPolicy(policy)}
          camps={camps}
          items={items}
          campBuffer={campBuffer}
          centralBuffer={centralBuffer}
        />
      )}

      {inventoryPolicy.policyType === "TARGET_LEVEL" && (
        <TargetLevelPolicy
          policy={inventoryPolicy}
          setPolicy={(policy) => setInventoryPolicy(policy)}
          camps={camps}
          items={items}
        />
      )}
    </>
  );
};

export default InventoryPoliciesSection;
