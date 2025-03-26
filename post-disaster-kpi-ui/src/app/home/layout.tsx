// app/home/layout.tsx

"use client";

import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Link,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import "@fontsource/merriweather";
import "@fontsource/open-sans";
import theme from "../theme";

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ backgroundColor: theme.palette.primary.main }}
      >
        <Toolbar>
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              fontFamily: theme.typography.fontFamily,
              fontWeight: "bold",
              letterSpacing: "0.05rem",
              color: theme.palette.primary.contrastText,
            }}
          >
            Post Disaster Simulation
          </Typography>

          {/* GitHub Icon and Link */}
          <IconButton
            color="inherit"
            component="a"
            href="https://github.com/OEKundakcioglu/PostDisasterSimulation"
            target="_blank"
            rel="noopener"
          >
            <GitHubIcon />
          </IconButton>

          {/* Link to Prof. Erhun's page */}
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.primary.contrastText,
              marginLeft: 2,
            }}
          >
            Prepared by the Research Group of{" "}
            <Link
              href="http://erhun.me"
              target="_blank"
              rel="noopener"
              sx={{ color: theme.palette.primary.contrastText }}
            >
              Prof. Erhun Kundakcıoğlu
            </Link>
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          padding: "30px",
          backgroundColor: theme.palette.background.default,
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default HomeLayout;
