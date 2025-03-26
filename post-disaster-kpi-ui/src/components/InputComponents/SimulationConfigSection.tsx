// src/app/home/InputParameters/SimulationConfigSection.tsx

import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

interface SimulationConfig {
  [key: string]: string | boolean;
}

interface Props {
  simulationConfig: SimulationConfig;
  setSimulationConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
}

const SimulationConfigSection: React.FC<Props> = ({
  simulationConfig,
  setSimulationConfig,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSimulationConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Simulation Configuration
      </Typography>
      <Grid container spacing={2}>
        {(Object.keys(simulationConfig) as Array<keyof SimulationConfig>).map(
          (key) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              {typeof simulationConfig[key] === "boolean" ? (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={simulationConfig[key] as boolean}
                      onChange={handleChange}
                      name={String(key)}
                    />
                  }
                  label={key}
                />
              ) : (
                <TextField
                  fullWidth
                  name={String(key)}
                  label={String(key)}
                  type="text"
                  value={simulationConfig[key] as string}
                  onChange={handleChange}
                />
              )}
            </Grid>
          )
        )}
      </Grid>
    </>
  );
};

export default SimulationConfigSection;
