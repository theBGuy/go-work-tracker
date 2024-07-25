import { Card, CardContent, CardHeader, Typography, CardActions, Button, Box, IconButton } from "@mui/material";
import { formatTime } from "../utils/utils";
import { useTimerStore } from "../stores/timer";
import { useEffect } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";

interface activeSessionProps {
  stopTimer: () => void;
  mode?: "normal" | "mini";
}

const ActiveSession: React.FC<activeSessionProps> = ({ stopTimer, mode = "normal" }) => {
  const startTimer = useTimerStore((state) => state.startTimer);
  const elapsedTime = useTimerStore((state) => state.elapsedTime);
  const timerRunning = useTimerStore((state) => state.running);
  
  useEffect(() => {
    console.log("ActiveSession mounted");
    console.log(`Timer running: ${timerRunning}, Elapsed time: ${elapsedTime}`);

    return () => {
      console.log("ActiveSession unmounted");
      console.log(`Timer running: ${timerRunning}, Elapsed time: ${elapsedTime}`);
    };
  }, []);

  return (
    <>
      {mode === "normal" ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Card sx={{ display: "inline-block", transform: "scale(0.9)" }}>
            <CardContent>
              <CardHeader title="Current Work Session" />
              <Typography variant="h5" component="h2">
                {timerRunning ? formatTime(elapsedTime) : "00h 00m 00s"}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end" }}>
              {timerRunning ? (
                <Button onClick={stopTimer} color="error">
                  Stop Timer
                </Button>
              ) : (
                <Button onClick={startTimer}>Start Timer</Button>
              )}
            </CardActions>
          </Card>
        </div>
        ) : (
          // sorta hate how this looks
          <Box
            sx={{
            position: "fixed",
            bottom: 70,
            left: 5,
            alignItems: "center",
            padding: 2,
            boxShadow: 3,
            borderRadius: 12,
            zIndex: 1000,
            display: "flex",
            flexDirection: "row",
            backgroundColor: "rgba(0, 0, 0, 0.5)"
          }}
          >
            <Typography variant="body1">
              {timerRunning ? formatTime(elapsedTime) : "00h 00m 00s"}
            </Typography>
            <IconButton color="inherit" size="small" onClick={timerRunning ? stopTimer : startTimer}>
              {timerRunning ? <StopIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Box>
        )}
    </>
  );
};

export default ActiveSession;
