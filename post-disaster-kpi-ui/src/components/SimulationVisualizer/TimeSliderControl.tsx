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
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";

interface TimeSliderControlProps {
  currentTime: number;
  maxTime: number;
  displayMaxTime: number;
  onTimeChange: (time: number) => void;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
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
  isRangeMode: boolean;
  onRangeModeChange: (enabled: boolean) => void;
  availableTimes: number[];
  onDownloadEnv?: () => void;
  onStopAndRestart?: () => void;
}

const TimeSliderControl: React.FC<TimeSliderControlProps> = ({
  currentTime,
  maxTime,
  displayMaxTime,
  onTimeChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
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
  isRangeMode,
  onRangeModeChange,
  availableTimes,
  onDownloadEnv,
  onStopAndRestart,
}) => {
  const formatTime = (time: number) => {
    return `${Math.floor(time)}`;
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (!isRealTimeMode && typeof newValue === "number") {
      onTimeChange(newValue);
    }
  };

  const handleStartTimeChange = (event: Event, newValue: number | number[]) => {
    if (!isRealTimeMode && isRangeMode && typeof newValue === "number") {
      onStartTimeChange(Math.min(newValue, endTime - 1));
    }
  };

  const handleEndTimeChange = (event: Event, newValue: number | number[]) => {
    if (!isRealTimeMode && isRangeMode && typeof newValue === "number") {
      onEndTimeChange(Math.max(newValue, startTime + 1));
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, mb: 3 }}>
      <Stack spacing={3}>
        {/* Mode Toggle */}
        <Box
          sx={{
            p: 2,
            bgcolor: "primary.main",
            borderRadius: 1,
            color: "white",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            {/* Left side - Action buttons */}
            <Stack direction="row" spacing={1}>
              {onDownloadEnv && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={onDownloadEnv}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.3)",
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Environment JSON
                </Button>
              )}
              {onStopAndRestart && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RestartAltIcon />}
                  onClick={onStopAndRestart}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.3)",
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Stop & Start New
                </Button>
              )}
            </Stack>

            {/* Right side - Mode controls */}
            <Stack spacing={2} alignItems="flex-end">
              <FormControlLabel
                control={
                  <Switch
                    checked={isRealTimeMode}
                    onChange={(e) => onRealTimeModeChange(e.target.checked)}
                    color="secondary"
                    sx={{
                      "& .MuiSwitch-track": {
                        bgcolor: "rgba(255,255,255,0.3)",
                      },
                      "& .MuiSwitch-thumb": {
                        bgcolor: "white",
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontWeight: 500,
                      color: "white",
                      fontSize: "0.95rem",
                    }}
                  >
                    Real-time Mode
                  </Typography>
                }
                sx={{ m: 0 }}
              />

              {!isRealTimeMode && (
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      color: "white",
                      fontSize: "0.90rem",
                      mb: 1,
                      textAlign: "right",
                    }}
                  >
                    View Mode
                  </Typography>
                  <ToggleButtonGroup
                    value={isRangeMode ? "range" : "point"}
                    exclusive
                    onChange={(e, newValue) => {
                      if (newValue !== null) {
                        onRangeModeChange(newValue === "range");
                      }
                    }}
                    size="small"
                    sx={{
                      "& .MuiToggleButton-root": {
                        color: "white",
                        borderColor: "rgba(255,255,255,0.3)",
                        "&.Mui-selected": {
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "white",
                        },
                      },
                    }}
                  >
                    <ToggleButton value="point">Single Point</ToggleButton>
                    <ToggleButton value="range">Range</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>

        {/* Time Display */}
        <Box sx={{ textAlign: "center" }}>
          {isRangeMode && !isRealTimeMode ? (
            <>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                {formatTime(startTime)} - {formatTime(endTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Range of {formatTime(maxTime)} total
              </Typography>
            </>
          ) : (
            <>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {formatTime(displayMaxTime)} total
              </Typography>
            </>
          )}
        </Box>

        {/* Time Slider */}
        <Box sx={{ px: 2 }}>
          {isRangeMode && !isRealTimeMode ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Start Time: {formatTime(startTime)}
                </Typography>
                <Slider
                  value={startTime}
                  max={displayMaxTime}
                  step={1}
                  onChange={handleStartTimeChange}
                  disabled={isRealTimeMode || displayMaxTime === 0}
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
                      bgcolor: "#4CAF50",
                    },
                    "& .MuiSlider-track": {
                      height: 6,
                      bgcolor: "#4CAF50",
                    },
                    "& .MuiSlider-rail": {
                      height: 6,
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  End Time: {formatTime(endTime)}
                </Typography>
                <Slider
                  value={endTime}
                  max={displayMaxTime}
                  step={1}
                  onChange={handleEndTimeChange}
                  disabled={isRealTimeMode || displayMaxTime === 0}
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
                      bgcolor: "#F44336",
                    },
                    "& .MuiSlider-track": {
                      height: 6,
                      bgcolor: "#F44336",
                    },
                    "& .MuiSlider-rail": {
                      height: 6,
                    },
                  }}
                />
              </Box>
            </Stack>
          ) : (
            <Slider
              value={currentTime}
              max={displayMaxTime}
              step={1}
              onChange={handleSliderChange}
              disabled={isRealTimeMode || displayMaxTime === 0}
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
          )}
        </Box>

        {/* Playback Controls */}
        {!isRealTimeMode && !isRangeMode && (
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
        {!isRealTimeMode && !isRangeMode && (
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Playback Speed: {playbackSpeed}x
            </Typography>
            <Slider
              value={playbackSpeed}
              min={0.25}
              max={16}
              step={0.25}
              onChange={(_, value) => onSpeedChange(value as number)}
              marks={[
                { value: 0.25, label: "0.25x" },
                { value: 1, label: "1x" },
                { value: 4, label: "4x" },
                { value: 16, label: "16x" },
              ]}
              size="small"
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default TimeSliderControl;
