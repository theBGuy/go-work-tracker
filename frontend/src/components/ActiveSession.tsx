import { Card, CardContent, CardHeader, Typography, CardActions, Button, Box, IconButton, Stack } from "@mui/material";
import { formatTime } from "../utils/utils";
import { useTimerStore } from "../stores/timer";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { useAppStore } from "../stores/main";

interface activeSessionProps {
  stopTimer: () => void;
  mode?: "normal" | "mini";
}

const ActiveSession: React.FC<activeSessionProps> = ({ stopTimer, mode = "normal" }) => {
  const startTimer = useTimerStore((state) => state.startTimer);
  const elapsedTime = useTimerStore((state) => state.elapsedTime);
  const timerRunning = useTimerStore((state) => state.running);
  const org = useAppStore((state) => state.selectedOrganization);
  const proj = useAppStore((state) => state.selectedProject);

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
            padding: 1.5,
            boxShadow: 3,
            borderRadius: 4,
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <Stack>
            <Typography variant="caption">
              {org} - {proj}
            </Typography>
            <Stack direction="row" alignItems="center" flex={1} justifyContent="space-between">
              <Typography variant="body1">{timerRunning ? formatTime(elapsedTime) : "00h 00m 00s"}</Typography>
              <IconButton color="inherit" size="small" onClick={timerRunning ? stopTimer : startTimer}>
                {timerRunning ? <StopIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      )}
    </>
  );
};

export default ActiveSession;
