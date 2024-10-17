// components/GlobalKPIItem.tsx
import React from "react";
import { Grid, Card, CardContent, Typography } from "@mui/material";

interface GlobalKPIItemProps {
  title: string;
  value: number;
  isCurrency?: boolean;
}

const GlobalKPIItem: React.FC<GlobalKPIItemProps> = ({
  title,
  value,
  isCurrency = true,
}) => {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card variant="outlined">
        <CardContent>
          <Typography
            color="textSecondary"
            gutterBottom
            sx={{ fontWeight: 600, color: "#2C3E50" }}
          >
            {title}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isCurrency
              ? value.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 2,
                })
              : value.toLocaleString()}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default GlobalKPIItem;
