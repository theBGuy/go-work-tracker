import React, { useEffect } from "react";
import { Dialog, DialogTitle, DialogActions, Button } from "@mui/material";
import { useTimerStore } from "../stores/timer";

const ActiveConfirmationDialog: React.FC = () => {
  const timerRunning = useTimerStore((state) => state.running);
  const stopTimer = useTimerStore((state) => state.stopTimer);
  const [openConfirm, setOpenConfirm] = useTimerStore((state) => [state.openConfirm, state.setOpenConfirm]);

  useEffect(() => {
    // TODO: maybe some sort of sound alert? or a notification? In case the user is not looking at the app
    if (openConfirm) {
      const timeout = setTimeout(() => {
        if (timerRunning) {
          stopTimer();
          alert("You didn't confirm within two minutes. The timer will be stopped.");
        }
      }, 1000 * 60 * 2);
      return () => clearTimeout(timeout);
    }
  }, [openConfirm]);

  return (
    <Dialog disableEscapeKeyDown open={openConfirm} onClose={() => setOpenConfirm(false)}>
      <DialogTitle>Are you still working?</DialogTitle>
      <DialogActions>
        <Button onClick={() => setOpenConfirm(false)}>Yes</Button>
        <Button onClick={() => stopTimer()}>No</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActiveConfirmationDialog;
