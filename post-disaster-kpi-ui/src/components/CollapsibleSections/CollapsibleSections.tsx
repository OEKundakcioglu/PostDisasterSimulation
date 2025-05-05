import React, { useState } from "react";
import { Box, Typography, IconButton, Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

export const CollapsibleSection = ({
  title,
  children,
}: CollapsibleSectionProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mb: 3, border: "1px solid #e0e0e0", borderRadius: 1 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          bgcolor: "#f5f5f5",
          borderBottom: expanded ? "1px solid #e0e0e0" : "none",
          cursor: "pointer", // Add pointer cursor to indicate clickable
        }}
        onClick={() => setExpanded(!expanded)} // Make entire header clickable
      >
        <Typography variant="h6">{title}</Typography>
        <IconButton
          size="small"
          aria-expanded={expanded}
          aria-label="show more"
          onClick={(e) => {
            e.stopPropagation(); // Prevent double toggling when clicking the button
            setExpanded(!expanded);
          }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
};

export interface NestedCollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  level?: "secondary" | "tertiary";
}

export const NestedCollapsibleSection = ({
  title,
  children,
  level = "secondary",
}: NestedCollapsibleSectionProps) => {
  const [expanded, setExpanded] = useState(false);

  const getBgColor = () => {
    switch (level) {
      case "secondary":
        return "#f9f9f9";
      case "tertiary":
        return "#ffffff";
      default:
        return "#f9f9f9";
    }
  };

  const getBorderStyle = () => {
    switch (level) {
      case "secondary":
        return "1px solid #e8e8e8";
      case "tertiary":
        return "1px dashed #eeeeee";
      default:
        return "1px solid #e8e8e8";
    }
  };

  return (
    <Box sx={{ mb: 2, border: getBorderStyle(), borderRadius: 1 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 1.5,
          bgcolor: getBgColor(),
          borderBottom: expanded ? getBorderStyle() : "none",
          cursor: "pointer", // Add pointer cursor to indicate clickable
        }}
        onClick={() => setExpanded(!expanded)} // Make entire header clickable
      >
        <Typography variant={level === "secondary" ? "subtitle1" : "subtitle2"}>
          {title}
        </Typography>
        <IconButton
          size="small"
          aria-expanded={expanded}
          aria-label="show more"
          onClick={(e) => {
            e.stopPropagation(); // Prevent double toggling when clicking the button
            setExpanded(!expanded);
          }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 1.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
};
