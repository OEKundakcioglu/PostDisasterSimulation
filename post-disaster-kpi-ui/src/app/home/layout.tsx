"use client"; // This marks the file as a client component
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";
// Import premium fonts
import "@fontsource/merriweather";
import "@fontsource/open-sans";

const theme = createTheme({
  palette: {
    primary: {
      main: "#A27A55", // Soft Beige tone for primary accents
      contrastText: "#ffffff", // White text for contrast
    },
    secondary: {
      main: "#D4AF37", // Classy Gold
      contrastText: "#ffffff",
    },
    background: {
      default: "#F8F1E9", // Soft beige for a fancy background
      paper: "#FAF3E3", // Lighter beige for cards and content areas
    },
    text: {
      primary: "#5A4B3D", // Deep brown for classy text
      secondary: "#7A7265", // Softer brown for secondary text
    },
  },
  typography: {
    fontFamily: "'Merriweather', 'Open Sans', 'Roboto', sans-serif",
    h1: {
      fontFamily: "'Merriweather', serif",
      fontSize: "2.5rem",
      fontWeight: 700,
      color: "#5A4B3D", // Classy deep brown
    },
    h2: {
      fontFamily: "'Merriweather', serif",
      fontSize: "2rem",
      fontWeight: 600,
      color: "#5A4B3D",
    },
    h4: {
      fontFamily: "'Merriweather', serif",
      fontSize: "1.75rem",
      fontWeight: 600,
      color: "#5A4B3D",
    },
    h5: {
      fontFamily: "'Merriweather', serif",
      fontSize: "1.5rem",
      fontWeight: 500,
      color: "#5A4B3D",
    },
    body1: {
      fontSize: "1rem",
      color: "#7A7265", // Softer brown for body text
    },
    button: {
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: "0.05rem",
    },
  },
  shape: {
    borderRadius: 10, // Slightly rounded corners for a more refined look
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "12px 24px",
        },
        containedPrimary: {
          backgroundColor: "#A27A55", // Fancy beige for buttons
          color: "#ffffff", // White text on buttons
          "&:hover": {
            backgroundColor: "#8F6B49", // Darker beige on hover
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          padding: "24px",
          backgroundColor: "#FAF3E3", // Light beige for cards
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)", // Softer shadow for a more elegant feel
        },
      },
    },
  },
});

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      {/* Elegant, minimal top navigation bar */}
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
              fontFamily: theme.typography.h1.fontFamily,
              fontWeight: theme.typography.h1.fontWeight,
              letterSpacing: "0.05rem",
              color: theme.palette.primary.contrastText,
            }}
          >
            Post Disaster Simulation
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Box
        sx={{
          padding: "30px",
          backgroundColor: theme.palette.background.default, // Fancy beige background
          minHeight: "100vh", // Ensure full height coverage
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default HomeLayout;
