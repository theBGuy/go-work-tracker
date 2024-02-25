import {useEffect, useState, useRef} from 'react';
import './App.css';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import WorkTimeAccordion from './components/WorkTimeAccordian';
import ActiveConfirmationDialog from './components/ActiveConfirmationDialog';
import SettingsDialog from './components/SettingsDialog';
import NewOrganizationDialog from './components/NewOrganizationDialog';
import AppFooter from './components/AppFooter';

import { useMediaQuery } from '@mui/material';
import {
  Tab,
  Tabs,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Menu,
  ListItemIcon,
  List,
  ListItem,
  ListItemText,
  Grid,
  Card,
  CardActions,
  CardContent,
  CardHeader
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  StartTimer,
  StopTimer,
  TimeElapsed,
  GetWorkTime,
  GetWorkTimeByProject,
  GetMonthlyWorkTime,
  GetMonthlyWorktimeByProject,
  GetOrganizations,
  SetOrganization,
  RenameOrganization,
  DeleteOrganization,
  GetProjects,
  SetProject,
  RenameProject,
  DeleteProject,
  ShowWindow,
  ConfirmAction
} from "../wailsjs/go/main/App";

import { months, formatTime, dateString } from './utils/utils'

// TODO: This has become large and messy. Need to break it up into smaller components
function App() {
  const isScreenHeightLessThan510px = useMediaQuery('(max-height:510px)');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const TabMap = {
    WorkTime: 0,
    YearlyTable: 1
  };
  const [selectedTab, setSelectedTab] = useState(TabMap.WorkTime);
  
  // Variables for timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [workTime, setWorkTime] = useState(0);
  const [currProjectWorkTime, setCurrProjectWorkTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimeRef = useRef(elapsedTime);
  const [alertTime, setAlertTime] = useState(30); // Default to 30 minutes
  const [newAlertTime, setNewAlertTime] = useState(alertTime);
  const [openConfirm, setOpenConfirm] = useState(false);

  // Variables for handling work time totals
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<number[]>([]);
  const [monthlyProjectWorkTimes, setMonthlyProjectWorkTimes] = useState<Record<string, number>>({});
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  const currentDayRef = useRef(currentDay);

  // Variables for handling organizations
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [newOrganization, setNewOrganization] = useState('');
  const [openNewOrg, setopenNewOrg] = useState(false);
  const [openRename, setOpenRename] = useState(false);

  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [newProject, setNewProject] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    currentDayRef.current = currentDay;
  }, [currentDay]);

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
    console.log(`OrgName: ${newOrganization}, ProjName: ${newProject}`);
    (
      rename
      ? RenameOrganization(selectedOrganization, newOrganization)
      : SetOrganization(newOrganization, newProject)
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
    StartTimer(selectedOrganization, selectedProject).then(() => {
      setTimerRunning(true);
    });
  };

  const stopTimer = async () => {
    await StopTimer(selectedOrganization, selectedProject);
    GetMonthlyWorkTime(currentYear, selectedOrganization)
      .then(setMonthlyWorkTimes);
    setTimerRunning(false);
    setElapsedTime(0);
    setOpenConfirm(false);
  };
    
  const setOrganization = async (newOrganization: string) => {
    if (timerRunning) {
      await stopTimer();
    }
    const projs = await GetProjects(newOrganization);
    SetOrganization(newOrganization, projs[0]).then(() => {
      setSelectedOrganization(newOrganization);
      setProjects(projs);
    });
  };

  const handleRenameOrganization = () => {
    handleMenuClose();
    setOpenRename(true);
  };

  const handleDeleteOrganization = () => {
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
        GetProjects(organizations[0]).then(projs => {
          setProjects(projs);
          setSelectedProject(projs[0]);
        });
        SetOrganization(selectedOrganization, selectedProject);
      });
    });
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
        GetProjects(orgs[0]).then(projs => {
          setProjects(projs);
          setSelectedProject(projs[0]);
        });
      }
    });
  }, []);

  /**
   * Get the work time for the current day when the app loads
   * This is used to display today's total work time and updates if the user switches organizations
   */
  useEffect(() => {
    if (!selectedOrganization) return;
    GetWorkTime(dateString(), selectedOrganization)
      .then(workTimeInSeconds => setWorkTime(workTimeInSeconds));
    GetProjects(selectedOrganization).then(projs => {
      setProjects(projs);
      setSelectedProject(projs[0]);
      GetWorkTimeByProject(selectedOrganization, projs[0], dateString())
        .then(workTimeInSeconds => setCurrProjectWorkTime(workTimeInSeconds));
    });
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
    GetMonthlyWorkTime(currentYear, selectedOrganization)
      .then(setMonthlyWorkTimes);
    GetMonthlyWorktimeByProject(currentYear, currentMonth + 1, selectedOrganization)
      .then(times => setMonthlyProjectWorkTimes(times));
  }, [selectedOrganization]);

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

  return (
    <div id="App">
      {/* Notifcation container */}
      <ToastContainer />

      {/* Our app bar */}
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

          {/* Dropdown to select project */}
          <Select
            value={selectedProject}
            onChange={(event) => {
              SetProject(event.target.value as string).then(() => {
                setSelectedProject(event.target.value as string);
              });
            }}
          >
            {projects.map((project) => (
              <MenuItem key={project} value={project}>
                {project}
              </MenuItem>
            ))}
          </Select>
        </Toolbar>
      </AppBar>

      <Tabs
        variant="fullWidth"
        value={selectedTab}
        onChange={(event, newValue) => setSelectedTab(newValue as number)}>
        <Tab label="Work Time" id={`${TabMap.WorkTime}`} />
        <Tab label="Yearly Table" id={`${TabMap.YearlyTable}`} />
      </Tabs>
      
      {/* The main portion, our timer */}
      <div hidden={selectedTab !== TabMap.WorkTime} style={{ marginTop: 10, minHeight: 375, minWidth: 500 }}>
        {!isScreenHeightLessThan510px && (
          <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="h6" component="h2" sx={{ textAlign: 'left', 'marginLeft': (theme) => theme.spacing(2) }}>
                Today's Work Total
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary={`Organization: ${formatTime(workTime)}`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary={`Project (${selectedProject}): ${formatTime(currProjectWorkTime)}`} />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="h6" component="h2" sx={{ textAlign: 'left', 'marginLeft': (theme) => theme.spacing(2) }}>
                Weekly Work Total
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary={`Organization: ${formatTime(0)}`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary={`Project (${selectedProject}): ${formatTime(0)}`} />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="h6" component="h2" sx={{ textAlign: 'left', 'marginLeft': (theme) => theme.spacing(2) }}>
                {months[currentMonth]}'s work totals
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary={`Organization: ${formatTime(monthlyWorkTimes[currentMonth])}`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary={`Project (${selectedProject}): ${formatTime(monthlyProjectWorkTimes[selectedProject])}`} />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        )}

        {/* Current session */}
        <Card sx={{ display: 'inline-block', transform: 'scale(0.9)' }}>
          <CardContent>
            <CardHeader title="Current Work Session" />
            <Typography variant="h5" component="h2">
              {timerRunning ? formatTime(elapsedTime) : '00h 00m 00s'}
            </Typography>
          </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              {timerRunning ? (
                <Button onClick={stopTimer} color='error'>Stop Timer</Button>
              ) : (
                <Button onClick={startTimer}>Start Timer</Button>
              )}
            </CardActions>
        </Card>
      </div>
      
      {/* Table to display our totals */}
      <div hidden={selectedTab !== TabMap.YearlyTable}>
        <h2>Yearly Work Time</h2>
        <WorkTimeAccordion
          timerRunning={timerRunning}
          selectedOrganization={selectedOrganization}
          months={months}
          formatTime={formatTime}
        />
      </div>

      {/* Handle confirming user still active */}
      <ActiveConfirmationDialog
        openConfirm={openConfirm}
        timerRunning={timerRunning}
        setOpenConfirm={setOpenConfirm}
        stopTimer={stopTimer}
      />

      {/* Handle settings dialog */}
      <SettingsDialog
        showSettings={showSettings}
        alertTime={alertTime}
        newAlertTime={newAlertTime}
        setShowSettings={setShowSettings}
        setAlertTime={setAlertTime}
        setNewAlertTime={setNewAlertTime}
        handleMenuClose={handleMenuClose}
      />
      
      {/* Handle creating a new organization */}
      <NewOrganizationDialog
        openNewOrg={openNewOrg}
        handleDialogClose={handleDialogClose}
        newOrganization={newOrganization}
        setNewOrganization={setNewOrganization}
        newProject={newProject}
        setNewProject={setNewProject}
        organizations={organizations}
      />

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

      <AppFooter />
    </div>
  )
}

export default App
