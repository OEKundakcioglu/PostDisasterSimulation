// components/KPIContent.tsx
import React from "react";
import { Box, Typography, Grid } from "@mui/material";
import GlobalKPIItem from "../GlobalKPIItem/GlobalKPIItem";
import CampKPITable from "../CampKPITable/CampKPITable";
import { KPIData } from "../../types/kpiTypes";

interface KPIContentProps {
  kpiData: KPIData;
}

const KPIContent: React.FC<KPIContentProps> = ({ kpiData }) => {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Simulation KPIs
      </Typography>

      {/* Display Global KPIs */}
      <Typography variant="h5" gutterBottom>
        Global KPIs
      </Typography>
      <Grid container spacing={2} sx={{ marginBottom: 4 }}>
        <GlobalKPIItem
          title="Total Replenishment Cost"
          value={kpiData.globalKPIs.totalReplenishmentCostSummation}
        />
        <GlobalKPIItem
          title="Total Ordering Cost"
          value={kpiData.globalKPIs.totalOrderingCostSummation}
        />
        <GlobalKPIItem
          title="Total Deprivation Cost"
          value={kpiData.globalKPIs.totalDeprivationCostSummation}
        />
        <GlobalKPIItem
          title="Total Referral Cost"
          value={kpiData.globalKPIs.totalReferralCostSummation}
        />
        <GlobalKPIItem
          title="Total Holding Cost"
          value={kpiData.globalKPIs.totalHoldingCostSummation}
        />
        <GlobalKPIItem
          title="Total Deprived Population"
          value={kpiData.globalKPIs.totalDeprivedPopulation}
          isCurrency={false}
        />
        <GlobalKPIItem
          title="Total Referral Population"
          value={kpiData.globalKPIs.totalReferralPopulation}
          isCurrency={false}
        />
        <GlobalKPIItem
          title="Total Funding Spent"
          value={kpiData.globalKPIs.totalFundingSpent}
        />
      </Grid>

      {/* Display Camp KPIs */}
      {Object.keys(kpiData.camps).map((campName) => (
        <Box key={campName} sx={{ marginBottom: 6 }}>
          <Typography variant="h5" gutterBottom>
            {campName}
          </Typography>
          <CampKPITable campKPI={kpiData.camps[campName]} />
        </Box>
      ))}
    </Box>
  );
};

export default KPIContent;
