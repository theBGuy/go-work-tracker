import { useAppStore } from "@/stores/main";
import { formatTime } from "@/utils/utils";
import { GetWorkTimeForRange } from "@go/main/App";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

interface RangeViewProps {
  openRangeView: boolean;
  setOpenRangeView: (value: boolean) => void;
}

const RangeView: React.FC<RangeViewProps> = ({ openRangeView, setOpenRangeView }) => {
  const today = new Date().toISOString().split("T")[0];
  const orgs = useAppStore((state) => state.organizations);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [workTimes, setWorkTimes] = useState<{ [key: string]: number } | null>(null);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const handleFetchWorkTime = () => {
    if (!startDate || !endDate || !selectedOrg) return;
    GetWorkTimeForRange(startDate, endDate, selectedOrg).then(setWorkTimes).catch(console.error);
  };

  return (
    <Dialog
      disableEscapeKeyDown
      fullWidth
      fullScreen
      open={openRangeView}
      onClose={() => setOpenRangeView(false)}
    >
      <DialogTitle>Get Work totals for a date range</DialogTitle>
      <DialogContent>
        <DialogContentText>Select Start and End dates and a Organization</DialogContentText>
        <Box sx={{ p: 3 }}>
          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={12}
              sm={6}
            >
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
            >
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: today },
                }}
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <FormControl fullWidth>
                <InputLabel id="select-organization-label">Select Organization</InputLabel>
                <Select
                  label="Select Organization"
                  labelId="select-organization-label"
                  value={selectedOrg}
                  onChange={(event) => setSelectedOrg(event.target.value as number)}
                  displayEmpty
                >
                  <MenuItem
                    value=""
                    disabled
                  >
                    Select Organization
                  </MenuItem>
                  {orgs.map((org) => (
                    <MenuItem
                      key={org.id}
                      value={org.id}
                    >
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        {workTimes && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Work Time Results</Typography>
            <Typography variant="body1">
              <strong>Total Work Time:</strong> {formatTime(workTimes.total)} seconds
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Object.entries(workTimes).map(
                ([project, time]) =>
                  project !== "total" && (
                    <Typography
                      key={project}
                      variant="body2"
                    >
                      <strong>{project}:</strong> {formatTime(time)} seconds
                    </Typography>
                  ),
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenRangeView(false)}>Cancel</Button>
        <Button
          type="submit"
          onClick={handleFetchWorkTime}
        >
          Get Work Time
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RangeView;
