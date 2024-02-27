// ActiveConfirmationDialog.tsx
import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogActions, Button } from '@mui/material';

interface ActiveConfirmationDialogProps {
  openConfirm: boolean;
  timerRunning: boolean;
  setOpenConfirm: (value: boolean) => void;
  stopTimer: () => void;
}

const ActiveConfirmationDialog: React.FC<ActiveConfirmationDialogProps> = ({
  openConfirm,
  timerRunning,
  setOpenConfirm,
  stopTimer
}) => {
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
    <Dialog
      disableEscapeKeyDown
      open={openConfirm}
      onClose={() => setOpenConfirm(false)}
    >
      <DialogTitle>Are you still working?</DialogTitle>
      <DialogActions>
        <Button onClick={() => setOpenConfirm(false)}>Yes</Button>
        <Button onClick={() => stopTimer()}>No</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActiveConfirmationDialog;