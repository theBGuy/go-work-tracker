import { useAppStore } from "@/stores/main";
import { useTimerStore } from "@/stores/timer";
import { formatTime } from "@/utils/utils";
import { MinimizeWindow, NormalizeWindow } from "@go/main/App";
import OpenInFull from "@mui/icons-material/OpenInFull";
import OpenInNew from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

interface activeSessionProps {
  stopTimer: () => void;
  mode?: "normal" | "mini";
}

const ActiveSession: React.FC<activeSessionProps> = ({ stopTimer, mode = "normal" }) => {
  const startTimer = useTimerStore((state) => state.startTimer);
  const elapsedTime = useTimerStore((state) => state.elapsedTime);
  const timerRunning = useTimerStore((state) => state.running);
  const org = useAppStore((state) => state.activeOrg);
  const proj = useAppStore((state) => state.activeProj);
  const appMode = useAppStore((state) => state.appMode);
  const setAppMode = useAppStore((state) => state.setAppMode);

  const minimize = async () => {
    setAppMode("widget");
    await MinimizeWindow();
  };

  const maximize = async () => {
    setAppMode("normal");
    await NormalizeWindow();
  };

  return (
    <>
      {appMode === "normal" &&
        (mode === "normal" ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Card sx={{ display: "inline-block", transform: "scale(0.9)", minWidth: 180, borderRadius: 2 }}>
              <Tooltip title="Open in widget mode" placement="right">
                <IconButton sx={{ position: "absolute", top: -5, right: -5 }} onClick={minimize}>
                  <OpenInNew />
                </IconButton>
              </Tooltip>
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
          </Box>
        ) : (
          // sorta hate how this looks
          <Paper
            sx={{
              position: "fixed",
              bottom: 70,
              left: 5,
              padding: 1.5,
              boxShadow: 3,
              borderRadius: 4,
              zIndex: 1000,
            }}
          >
            <Stack>
              <Typography variant="caption">
                {org?.name} - {proj?.name}
              </Typography>
              <Stack direction="row" alignItems="center" flex={1} justifyContent="space-between">
                <Typography variant="body1">{timerRunning ? formatTime(elapsedTime) : "00h 00m 00s"}</Typography>
                <IconButton color="inherit" size="small" onClick={timerRunning ? stopTimer : startTimer}>
                  {timerRunning ? <StopIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        ))}
      {appMode === "widget" && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <Box sx={{ padding: 1.5 }}>
            <Tooltip title="Open in normal mode" placement="right">
              <IconButton sx={{ position: "absolute", top: -5, right: -5 }} onClick={maximize}>
                <OpenInFull />
              </IconButton>
            </Tooltip>
            <Stack>
              <Typography variant="caption">
                {org?.name} - {proj?.name}
              </Typography>
              <Stack direction="row" alignItems="center" flex={1} justifyContent="space-between">
                <Typography variant="body1">{timerRunning ? formatTime(elapsedTime) : "00h 00m 00s"}</Typography>
                <IconButton color="inherit" size="small" onClick={timerRunning ? stopTimer : startTimer}>
                  {timerRunning ? <StopIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ActiveSession;
