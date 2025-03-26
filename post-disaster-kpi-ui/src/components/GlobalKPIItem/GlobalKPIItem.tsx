// components/GlobalKPIItem.tsx

import React from "react";
import { Grid, Card, CardContent, Typography, useTheme } from "@mui/material";

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
  const theme = useTheme();

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        <CardContent>
          <Typography
            variant="subtitle1"
            sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{ color: theme.palette.text.primary, fontWeight: 700 }}
          >
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
