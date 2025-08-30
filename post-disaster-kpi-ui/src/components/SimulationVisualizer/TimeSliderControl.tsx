"use client";

import React from "react";
import {
  Box,
  Slider,
  Typography,
  IconButton,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

interface TimeSliderControlProps {
  currentTime: number;
  maxTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  isRealTimeMode: boolean;
  onRealTimeModeChange: (enabled: boolean) => void;
  availableTimes: number[];
}

const TimeSliderControl: React.FC<TimeSliderControlProps> = ({
  currentTime,
  maxTime,
  onTimeChange,
  isPlaying,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onReset,
  playbackSpeed,
  onSpeedChange,
  isRealTimeMode,
  onRealTimeModeChange,
  availableTimes,
}) => {
  const formatTime = (time: number) => {
    return `Day ${Math.floor(time)}`;
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (!isRealTimeMode && typeof newValue === "number") {
      onTimeChange(newValue);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, mb: 3 }}>
      <Stack spacing={3}>
        {/* Mode Toggle */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Simulation Timeline
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isRealTimeMode}
                onChange={(e) => onRealTimeModeChange(e.target.checked)}
                color="primary"
              />
            }
            label="Real-time Mode"
          />
        </Box>

        {/* Time Display */}
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: "primary.main" }}
          >
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            of {formatTime(maxTime)} total
          </Typography>
        </Box>

        {/* Time Slider */}
        <Box sx={{ px: 2 }}>
          <Slider
            value={currentTime}
            max={maxTime}
            step={1}
            onChange={handleSliderChange}
            disabled={isRealTimeMode || maxTime === 0}
            marks={
              availableTimes.length < 50
                ? availableTimes.map((time) => ({
                    value: time,
                    label: time % 10 === 0 ? `${Math.floor(time)}` : "",
                  }))
                : undefined
            }
            valueLabelDisplay="auto"
            valueLabelFormat={formatTime}
            sx={{
              "& .MuiSlider-thumb": {
                width: 20,
                height: 20,
              },
              "& .MuiSlider-track": {
                height: 6,
              },
              "& .MuiSlider-rail": {
                height: 6,
              },
            }}
          />
        </Box>

        {/* Playback Controls */}
        {!isRealTimeMode && (
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1}
          >
            <IconButton
              onClick={onReset}
              disabled={currentTime === 0}
              size="large"
              sx={{ bgcolor: "action.hover" }}
            >
              <RestartAltIcon />
            </IconButton>

            <IconButton
              onClick={onPrevious}
              disabled={currentTime === 0}
              size="large"
              sx={{ bgcolor: "action.hover" }}
            >
              <SkipPreviousIcon />
            </IconButton>

            <IconButton
              onClick={isPlaying ? onPause : onPlay}
              disabled={currentTime >= maxTime}
              size="large"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
                "&:disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>

            <IconButton
              onClick={onNext}
              disabled={currentTime >= maxTime}
              size="large"
              sx={{ bgcolor: "action.hover" }}
            >
              <SkipNextIcon />
            </IconButton>
          </Stack>
        )}

        {/* Playback Speed Control */}
        {!isRealTimeMode && (
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" gutterBottom>
              Playback Speed: {playbackSpeed}x
            </Typography>
            <Slider
              value={playbackSpeed}
              min={0.25}
              max={4}
              step={0.25}
              onChange={(_, value) => onSpeedChange(value as number)}
              marks={[
                { value: 0.25, label: "0.25x" },
                { value: 0.5, label: "0.5x" },
                { value: 1, label: "1x" },
                { value: 2, label: "2x" },
                { value: 4, label: "4x" },
              ]}
              size="small"
            />
          </Box>
        )}

        {/* Timeline Info */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {isRealTimeMode
              ? "Real-time mode: Showing latest simulation data"
              : `Snapshot mode: Viewing data up to ${formatTime(currentTime)}`}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default TimeSliderControl;
