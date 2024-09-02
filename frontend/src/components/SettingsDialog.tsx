import { NumberInput } from "@/components/styled/NumberInput";
import { useAppStore } from "@/stores/main";
import CloseIcon from "@mui/icons-material/Close";
import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
} from "@mui/material";
import { useRef } from "react";

import { toast } from "react-toastify";

interface SettingsDialogProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  handleMenuClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ showSettings, setShowSettings, handleMenuClose }) => {
  const alertTime = useAppStore((state) => state.alertTime);
  const setAlertTime = useAppStore((state) => state.setAlertTime);
  const orginalAlertTime = useRef(alertTime);
  const enableColorOnDarkMode = useAppStore((state) => state.enableColorOnDark);
  const toggleEnableColorOnDark = useAppStore((state) => state.toggleEnableColorOnDark);
  const checkForAlertTimeChange = () => {
    if (orginalAlertTime.current !== alertTime) {
      orginalAlertTime.current = alertTime;
      if (alertTime === 0) {
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
            `Are you still working?` interval set to every {alertTime} minutes
          </div>
        );
      }
    }
  };
  const handleClose = () => {
    setShowSettings(false);
    checkForAlertTimeChange();
  };

  return (
    <Dialog disableEscapeKeyDown open={showSettings} onClose={handleClose}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={(theme) => ({
            position: "absolute",
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          })}
        >
          <CloseIcon />
        </IconButton>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="alert-time-select" shrink>
            Confirmation Popup Interval (minutes)
          </InputLabel>
          <NumberInput
            aria-label="Alert Time"
            value={alertTime}
            min={0}
            max={120}
            step={5}
            onChange={(_event, value) => setAlertTime(value as number)}
            onBlur={checkForAlertTimeChange}
          />
          <FormHelperText>Set the time interval for the `Are you still working?` notification.</FormHelperText>
          <FormHelperText>Set to 0 to disable the confirmation popup</FormHelperText>
        </FormControl>

        <FormControl sx={{ mt: 2 }}>
          <FormControlLabel
            value="start"
            control={<Checkbox checked={enableColorOnDarkMode} onChange={toggleEnableColorOnDark} />}
            label="Enable color on dark mode"
            labelPlacement="start"
          />
        </FormControl>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
