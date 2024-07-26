import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

import { toast } from "react-toastify";

interface SettingsDialogProps {
  showSettings: boolean;
  alertTime: number;
  newAlertTime: number;
  setShowSettings: (show: boolean) => void;
  setAlertTime: (time: number) => void;
  setNewAlertTime: (time: number) => void;
  handleMenuClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  showSettings,
  alertTime,
  newAlertTime,
  setShowSettings,
  setAlertTime,
  setNewAlertTime,
  handleMenuClose,
}) => {
  const handleUpdateSettings = () => {
    handleMenuClose();
    setShowSettings(false);
    if (newAlertTime !== alertTime) {
      setAlertTime(newAlertTime);
      if (newAlertTime === 0) {
        toast.success(
          <div>
            Settings updated! <br />
            `Are you still working?` notification disabled
          </div>
        );
      } else {
        toast.success(
          <div>
            Settings updated! <br />
            `Are you still working?` interval set to every {newAlertTime} minutes
          </div>
        );
      }
    }
  };

  return (
    <Dialog disableEscapeKeyDown open={showSettings} onClose={() => setShowSettings(false)}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <DialogContentText>Set the time interval for the `Are you still working?` notification.</DialogContentText>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="alert-time-select">Confirmation Popup Interval (minutes)</InputLabel>
          <Select
            value={newAlertTime}
            label="Confirmation Popup Interval (minutes)"
            labelId="alert-time-select"
            autoWidth
            onChange={(event) => setNewAlertTime(event.target.value as number)}
          >
            {[0, 1, 5, 10, 15, 30, 60].map((minutes) => (
              <MenuItem key={minutes} value={minutes}>
                {minutes}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleUpdateSettings}>Save</Button>
        <Button onClick={handleMenuClose} color="error">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
