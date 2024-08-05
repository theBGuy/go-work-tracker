import { useAppStore } from "@/stores/main";
import { MinimizeWindow, NormalizeWindow } from "@go/main/App";
import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTimerStore } from "../stores/timer";

const ActiveConfirmationDialog: React.FC = () => {
  const setAppMode = useAppStore((state) => state.setAppMode);
  const timerRunning = useTimerStore((state) => state.running);
  const stopTimer = useTimerStore((state) => state.stopTimer);
  const [openConfirm, setOpenConfirm] = useTimerStore((state) => [state.openConfirm, state.setOpenConfirm]);
  const [wasMinimized, setWasMinimized] = useState(false);
  const handleClose = async () => {
    setOpenConfirm(false);
    if (wasMinimized) {
      setAppMode("widget");
      setWasMinimized(false);
      await MinimizeWindow();
    }
  };

  const handleStop = async (timedOut: boolean) => {
    stopTimer();
    if (wasMinimized) {
      setWasMinimized(false);
      if (timedOut) {
        setAppMode("normal"); // User is away so when they come back, they should see the app
        await NormalizeWindow();
      }
    }
  };

  useEffect(() => {
    // TODO: maybe some sort of sound alert? or a notification? In case the user is not looking at the app
    if (openConfirm) {
      if (useAppStore.getState().appMode === "widget") {
        setWasMinimized(true);
        setAppMode("normal");
        NormalizeWindow();
      }
      const timeout = setTimeout(async () => {
        if (timerRunning) {
          await handleStop(true);
          alert("You didn't confirm within two minutes. The timer will be stopped.");
        }
      }, 1000 * 60 * 2);
      return () => clearTimeout(timeout);
    }
  }, [openConfirm]);

  return (
    <Dialog disableEscapeKeyDown open={openConfirm} onClose={handleClose}>
      <DialogTitle>Are you still working?</DialogTitle>
      <DialogActions>
        <Button onClick={handleClose}>Yes</Button>
        <Button onClick={() => handleStop(false)}>No</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActiveConfirmationDialog;
