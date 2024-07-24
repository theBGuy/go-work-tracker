import { Card, CardContent, CardHeader, Typography, CardActions, Button } from "@mui/material";
import { formatTime } from "../utils/utils";
import { useTimerStore } from "../stores/timer";
import { useEffect } from "react";
import { ShowWindow, TimeElapsed } from "../../wailsjs/go/main/App";
import ActiveConfirmationDialog from "./ActiveConfirmationDialog";
import { useStore } from "../stores/main";

interface activeSessionProps {
  startTimer: () => void;
  stopTimer: () => void;
}

const ActiveSession: React.FC<activeSessionProps> = ({ startTimer, stopTimer }) => {
  const [elapsedTime, setElapsedTime] = useTimerStore((state) => [state.elapsedTime, state.setElapsedTime]);
  const timerRunning = useTimerStore((state) => state.running);
  const alertTime = useStore((state) => state.alertTime);
  const [openConfirm, setOpenConfirm] = useTimerStore((state) => [state.openConfirm, state.setOpenConfirm]);

  useEffect(() => {
    return () => {
      console.log("ActiveSession unmounted");
      stopTimer();
    };
  }, []);
  
  /**
   * Update the work time every second if the timer is running
   */
  useEffect(() => {
    if (timerRunning) {
      const interval = setInterval(() => {
        TimeElapsed().then((currentElapsedTime) => {
          setElapsedTime(currentElapsedTime);
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerRunning]);

  useEffect(() => {
    let interval: number | null | undefined = null;

    if (timerRunning && !openConfirm && alertTime > 0) {
      interval = setInterval(() => {
        ShowWindow().then(() => {
          setOpenConfirm(true);
        });
      }, 1000 * 60 * alertTime); // Show the alert every x minutes
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerRunning, openConfirm, alertTime]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* Handle confirming user still active */}
      <ActiveConfirmationDialog
        openConfirm={openConfirm}
        timerRunning={timerRunning}
        setOpenConfirm={setOpenConfirm}
        stopTimer={stopTimer}
      />
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
  );
};

export default ActiveSession;
