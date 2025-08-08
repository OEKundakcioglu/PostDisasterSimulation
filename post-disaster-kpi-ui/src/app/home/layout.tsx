// app/home/layout.tsx

"use client";

import React, { PropsWithChildren, useMemo } from "react";
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
import theme from "@/app/theme";

// ------------------ constants ------------------
const GITHUB_REPO_URL =
  "https://github.com/OEKundakcioglu/PostDisasterSimulation";
const PROF_PAGE_URL = "http://erhun.me";

// ------------------ component ------------------
const HomeLayout: React.FC<PropsWithChildren> = ({ children }) => {
  const headerTitle = useMemo(() => "Post Disaster Simulation", []);

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "primary.main" }}>
        <Toolbar>
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: ".05rem",
              color: "primary.contrastText",
            }}
          >
            {headerTitle}
          </Typography>

          <IconButton
            aria-label="GitHub repository"
            color="inherit"
            component="a"
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="large"
          >
            <GitHubIcon />
          </IconButton>

          <Typography
            variant="body2"
            sx={{ color: "primary.contrastText", ml: 2 }}
          >
            Prepared by the Research Group of{" "}
            <Link
              href={PROF_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: "primary.contrastText",
                textDecorationColor: "primary.contrastText",
              }}
            >
              Prof. Erhun Kundakcıoğlu
            </Link>
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{ p: 4, bgcolor: "background.default", minHeight: "100vh" }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default HomeLayout;
