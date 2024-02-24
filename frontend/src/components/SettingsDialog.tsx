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
  Select
} from '@mui/material';

interface SettingsDialogProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  newAlertTime: number;
  setNewAlertTime: (time: number) => void;
  handleUpdateSettings: () => void;
  handleMenuClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  showSettings,
  setShowSettings,
  newAlertTime,
  setNewAlertTime,
  handleUpdateSettings,
  handleMenuClose
}) => {
  return (
    <Dialog
      disableEscapeKeyDown
      open={showSettings}
      onClose={() => setShowSettings(false)}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Set the time interval for the `Are you still working?` notification.
        </DialogContentText>

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
        <Button onClick={handleMenuClose} color='error'>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;