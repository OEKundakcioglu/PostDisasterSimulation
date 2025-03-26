// theme.ts

import { createTheme } from "@mui/material/styles";
import "@fontsource/merriweather";
import "@fontsource/open-sans";

// Extend the Palette interface
declare module "@mui/material/styles" {
  interface Palette {
    customColors: {
      deprivationCost: string;
    };
  }
  interface PaletteOptions {
    customColors?: {
      deprivationCost?: string;
    };
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#7253ed",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#bfa5cc",
      contrastText: "#ffffff",
    },
    error: {
      main: "#e74c3c",
    },
    warning: {
      main: "#f1c40f",
    },
    background: {
      default: "#f8f8f8",
      paper: "#ffffff",
    },
    text: {
      primary: "#27262b",
      secondary: "#5c5962",
    },
    // Add your custom colors here
    customColors: {
      deprivationCost: "#5dc0d4",
    },
  },
  typography: {
    fontFamily: "'Merriweather', 'Open Sans', 'Roboto', sans-serif",
  },
});

export default theme;
