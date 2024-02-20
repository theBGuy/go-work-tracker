import {useEffect, useState, useRef} from 'react';
import './App.css';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Select,
  MenuItem,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Menu,
  Tooltip,
  ListItemIcon,
  InputLabel,
  FormControl
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GitHubIcon from '@mui/icons-material/GitHub';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  StartTimer,
  StopTimer,
  TimeElapsed,
  GetWorkTime,
  GetOrganizations,
  SetOrganization,
  RenameOrganization,
  DeleteOrganization,
  ExportCSVByMonth,
  ExportCSVByYear,
  GetYearlyWorkTime,
  GetMonthlyWorkTime,
  GetVersion,
  UpdateAvailable,
  ShowWindow,
  ConfirmAction
} from "../wailsjs/go/main/App";

function App() {
  // Misc Info
  const [version, setVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // Variables for timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [workTime, setWorkTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimeRef = useRef(elapsedTime);
  const [alertTime, setAlertTime] = useState(30); // Default to 30 minutes
  const [newAlertTime, setNewAlertTime] = useState(alertTime);
  const [openConfirm, setOpenConfirm] = useState(false);

  useEffect(() => {
    GetVersion().then(setVersion);
    UpdateAvailable().then(setUpdateAvailable);
    setUpdateAvailable(true);
  }, []);

  // Variables for handling work time totals
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyWorkTime, setYearlyWorkTime] = useState(0);
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<number[]>([]);
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  const currentDayRef = useRef(currentDay);

  // Variables for handling organizations
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [newOrganization, setNewOrganization] = useState('');
  const [openNewOrg, setopenNewOrg] = useState(false);
  const [openRename, setOpenRename] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [exportStatus, setExportStatus] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const currentYear = new Date().getFullYear();
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const currentMonth = new Date().getMonth();
  const years = Array.from({length: currentYear - 1999}, (_, i) => 2000 + i);

  useEffect(() => {
    currentDayRef.current = currentDay;
  }, [currentDay]);

  const formatTime = (timeInSeconds: number) => {
    let hours = String(Math.floor(timeInSeconds / 3600)).padStart(2, '0');
    let minutes = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(2, '0');
    let seconds = String(Math.floor(timeInSeconds % 60)).padStart(2, '0');
  
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const dateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return dateString;
  };

  const handleDialogClose = (canceled?: boolean, rename?: boolean) => {
    if (newOrganization === '' && organizations.length === 0) {
      toast.error("Organization name cannot be empty");
      return;
    }
    const setDialog = rename ? setOpenRename : setopenNewOrg;
    if (canceled) {
      setDialog(false);
      return;
    }
    (
      rename
      ? RenameOrganization(selectedOrganization, newOrganization)
      : SetOrganization(newOrganization)
    ).then(() => {
      setOrganizations(orgs => [...orgs, newOrganization]);
      setNewOrganization('');
      setSelectedOrganization(newOrganization);
      setDialog(false);
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setShowSettings(false);
    setopenNewOrg(false);
    setOpenRename(false);
  };

  const startTimer = () => {
    StartTimer(selectedOrganization).then(() => {
      setTimerRunning(true);
    });
  };

  const stopTimer = async () => {
    await StopTimer(selectedOrganization);
    GetYearlyWorkTime(selectedYear, selectedOrganization)
      .then(setYearlyWorkTime);
    GetMonthlyWorkTime(selectedYear, selectedOrganization)
      .then(setMonthlyWorkTimes);
    setTimerRunning(false);
    setElapsedTime(0);
    setOpenConfirm(false);
  };
  
  const exportYearlyCSV = () => {
    setExportStatus("Exporting...");
    ExportCSVByYear(selectedOrganization, selectedYear).then((path) => {
      setExportStatus("Export complete!");
      toast.success("Yearly CSV export complete! File saved to " + path);
    });
  };
  
  const exportMonthlyCSV = (month: number) => {
    setExportStatus("Exporting...");
    ExportCSVByMonth(selectedOrganization, selectedYear, month).then((path) => {
      setExportStatus("Export complete!");
      toast.success("Monthly CSV export complete! File saved to " + path);
    });
  };
    
  const setOrganization = async (newOrganization: string) => {
    if (timerRunning) {
      await stopTimer();
    }
    SetOrganization(newOrganization).then(() => {
      setSelectedOrganization(newOrganization);
    });
  };

  const handleRenameOrganization = () => {
    handleMenuClose();
    setOpenRename(true);
  };

  const handleDeleteOrganization = () => {
    // if (window.confirm("Are you sure you want to delete this organization?") === false) {
    //   return;
    // }
    ConfirmAction(`Delete ${selectedOrganization}`, "Are you sure you want to delete this organization?").then((confirmed) => {
      if (confirmed === false) {
        return;
      }
      handleMenuClose();
      if (organizations.length === 1) {
        toast.error("You cannot delete the last organization");
        return;
      }
      DeleteOrganization(selectedOrganization).then(() => {
        setOrganizations(orgs => orgs.filter(org => org !== selectedOrganization));
        setSelectedOrganization(organizations[0]);
      });
      SetOrganization(selectedOrganization);
    });
  };

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

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
  }, [elapsedTime]);

  /**
   * Get organizations defined in database when the app loads
   * If no organizations are defined, prompt the user to create one
   */
  useEffect(() => {
    GetOrganizations().then(orgs => {
      if (orgs.length === 0) {
        setopenNewOrg(true);
      } else {
        setOrganizations(orgs);
        setSelectedOrganization(orgs[0]);
      }
    });
  }, []);

  /**
   * Get the work time for the current day when the app loads
   * This is used to display today's total work time and updates if the user switches organizations
   */
  useEffect(() => {
    GetWorkTime(dateString(), selectedOrganization)
      .then(workTimeInSeconds => setWorkTime(workTimeInSeconds));
  }, [selectedOrganization]);

  /**
   * Check the day every minute and update the day if it changes
   * Update workTime when the day changes and reset the timer
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentDayRef.current !== new Date().getDate()) {
        setCurrentDay(new Date().getDate());
        GetWorkTime(dateString(), selectedOrganization)
          .then(workTimeInSeconds => setWorkTime(workTimeInSeconds));
      }
    }, 1000 * 5);
    return () => clearInterval(interval);
  }, [selectedOrganization]);

  /**
   * Get the yearly and monthly work times when the app loads
   * This is used to display the yearly and monthly totals in the dropdown table
   * It updates if the user switches organizations or current display year
   */
  useEffect(() => {
    GetYearlyWorkTime(selectedYear, selectedOrganization)
      .then(setYearlyWorkTime);
    GetMonthlyWorkTime(selectedYear, selectedOrganization)
      .then(setMonthlyWorkTimes);
  }, [selectedYear, selectedOrganization]);

  /**
   * Update the work time every second if the timer is running
   */
  useEffect(() => {
    if (timerRunning) {
      const interval = setInterval(() => {
        TimeElapsed().then(currentElapsedTime => {
          setWorkTime(prevWorkTime => prevWorkTime + (currentElapsedTime - elapsedTimeRef.current));
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
    <div id="App">
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            sx={{ mr: 2 }}
            onClick={handleMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Dropdown menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {/* <MenuItem onClick={() => setShowSettings(true)}>Settings</MenuItem> */}
            <MenuItem onClick={() => setShowSettings(true)}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={() => setopenNewOrg(true)}>Add New Organization</MenuItem>
            <MenuItem onClick={handleRenameOrganization}>Rename Current Organization</MenuItem>
            <MenuItem onClick={handleDeleteOrganization}>Delete Current Organization</MenuItem>
          </Menu>
          
          {/* Our App Title */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Work Hours Tracker
          </Typography>

          {/* Dropdown to select organization */}
          <Select
            value={selectedOrganization}
            onChange={(event) => setOrganization(event.target.value as string)}
          >
            {organizations.map((org) => (
              <MenuItem key={org} value={org}>
                {org}
              </MenuItem>
            ))}
          </Select>
        </Toolbar>
      </AppBar>
      
      {/* The main portion, our timer */}
      <h2>Work total for month of {months[currentMonth]}: {formatTime(monthlyWorkTimes[currentMonth])}</h2>
      <h2>Today's Work Total: {formatTime(workTime)}</h2>
      <div>
        <p>Current work session: {timerRunning ? formatTime(elapsedTime) : '00h 00m 00s'}</p>
          {timerRunning ? (
            <Button onClick={stopTimer}>Stop Timer</Button>
          ) : (
            <Button onClick={startTimer}>Start Timer</Button>
          )}
      </div>
      
      {/* Table to display our totals */}
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value as number)}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
          <Typography mt={2} sx={{ flexGrow: 1 }}>
            Total Work Time: {formatTime(yearlyWorkTime)}
          </Typography>
          <Button onClick={exportYearlyCSV}>Export Yearly CSV</Button>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Work Time</TableCell>
                  <TableCell align="right">Export</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyWorkTimes.map((workTime, index) => (
                  <TableRow key={index}>
                    <TableCell component="th" scope="row">{months[index]}</TableCell>
                    <TableCell align="right">{formatTime(workTime)}</TableCell>
                    <TableCell align="right">
                      <Button onClick={() => exportMonthlyCSV(index + 1)}>Export Monthly CSV</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Handle confirming user still active */}
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

      {/* Handle settings dialog */}
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

          {/* TODO: Are there other configurable settings we need? */}
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            {/* Dropdown to select alert time interval */}
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
      
      {/* Handle creating a new organization */}
      <Dialog
        disableEscapeKeyDown
        open={openNewOrg}
        onClose={() => handleDialogClose()}
      >
        <DialogTitle>Add New Organization</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the name of the new organization.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Organization Name"
            type="text"
            fullWidth
            value={newOrganization}
            onChange={(event) => setNewOrganization(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose(false)}>Confirm</Button>
          {organizations.length >= 1 && (
            <Button onClick={() => handleDialogClose(true)} color='error'>Close</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Handle renaming current organization */}
      <Dialog
        disableEscapeKeyDown
        open={openRename}
        onClose={() => handleDialogClose(false, true)}
      >
        <DialogTitle>Rename Organization</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the new name of the organization.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Organization Name"
            type="text"
            fullWidth
            value={newOrganization}
            onChange={(event) => setNewOrganization(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose(false, true)}>Confirm</Button>
          <Button onClick={() => handleDialogClose(true, true)} color='error'>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notifcation container */}
      <ToastContainer />

      <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar>
          {updateAvailable && (
            <Typography variant="h6" component="div">
              <Tooltip title="Restart to apply update" placement="top-end">
                <IconButton color="inherit">
                  <SystemUpdateIcon />
                </IconButton>
              </Tooltip>
                UPDATE AVAILABLE
            </Typography>
            )
          }
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <IconButton color="inherit">
              <a href="https://github.com/theBGuy" target="_blank">
                <GitHubIcon />
              </a>
            </IconButton>
              theBGuy
          </Typography>
          <Typography variant="h6" component="div">
            v{version}
          </Typography>
        </Toolbar>
      </AppBar>
    </div>
  )
}

export default App
