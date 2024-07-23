import {useEffect, useState, useRef} from 'react';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import WorkTimeAccordion from '../components/WorkTimeAccordian';
import ActiveConfirmationDialog from '../components/ActiveConfirmationDialog';
import SettingsDialog from '../components/SettingsDialog';
import NewOrganizationDialog from '../components/NewOrganizationDialog';
import NewProjectDialog from '../components/NewProjectDialog';
import EditOrganizationDialog from '../components/EditOrganizationDialog';
import AppFooter from '../components/AppFooter';

import { Box, Tooltip, useMediaQuery } from '@mui/material';
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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  StartTimer,
  StopTimer,
  TimeElapsed,
  GetWorkTime,
  GetWorkTimeByProject,
  GetWeeklyWorkTime,
  GetMonthlyWorkTime,
  GetOrganizations,
  SetOrganization,
  DeleteOrganization,
  GetProjects,
  SetProject,
  DeleteProject,
  ShowWindow,
  ConfirmAction,
  ToggleFavoriteOrganization,
  ToggleFavoriteProject,
} from "../../wailsjs/go/main/App";
import { getMonth, months, formatTime, dateString, getCurrentWeekOfMonth, Model } from '../utils/utils'
import EditProjectDialog from '../components/EditProjectDialog';
import NavBar from '../components/NavBar';
import { useStore } from '../stores/main';

// TODO: This has become large and messy. Need to break it up into smaller components ~in progress
function App() {
  const projects = useStore((state) => state.projects);
  const setProjects = useStore((state) => state.setProjects);
  const organizations = useStore((state) => state.organizations);
  const setOrganizations = useStore((state) => state.setOrganizations);
  const isScreenHeightLessThan510px = useMediaQuery('(max-height:510px)');
  const currentYear = new Date().getFullYear();
  const currentMonth = getMonth();
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

  // Variables for handling work time totals
  const [weeklyWorkTimes, setWeeklyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  const [currentWeek, setCurrentWeek] = useState(1);
  const currentDayRef = useRef(currentDay);

  // Variables for handling organizations
  const selectedOrganization = useStore((state) => state.selectedOrganization);
  const setSelectedOrganization = useStore((state) => state.setSelectedOrganization);
  const selectedProject = useStore((state) => state.selectedProject);
  const setSelectedProject = useStore((state) => state.setSelectedProject);
  
  // Dialogs
  const [openConfirm, setOpenConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openNewOrg, setOpenNewOrg] = useState(false);
  const [openNewProj, setOpenNewProj] = useState(false);
  const [openEditOrg, setOpenEditOrg] = useState(false);
  const [openEditProj, setOpenEditProj] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Editables
  const [editOrg, setEditOrg] = useState('');
  const [editProj, setEditProj] = useState('');

  useEffect(() => {
    currentDayRef.current = currentDay;
  }, [currentDay]);

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
  }, [elapsedTime]);

  const sumWeekWorktime = (week: number) => {
    return Object.values(weeklyWorkTimes[week] ?? {}).reduce((acc, curr) => acc + curr, 0);
  };
  
  const sumMonthWorktime = (month: number) => {
    return Object.values(monthlyWorkTimes[month] ?? {}).reduce((acc, curr) => acc + curr, 0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setShowSettings(false);
    setOpenNewOrg(false);
    setOpenEditOrg(false);
  };

  const startTimer = () => {
    StartTimer(selectedOrganization, selectedProject).then(() => {
      setTimerRunning(true);
    });
  };

  const stopTimer = async () => {
    await StopTimer(selectedOrganization, selectedProject);

    GetWeeklyWorkTime(currentYear, currentMonth, selectedOrganization)
      .then(setWeeklyWorkTimes);
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
    projs.sort(handleSort);
    const project = projs[0].name;

    SetOrganization(newOrganization, project).then(() => {
      setSelectedOrganization(newOrganization);
      setSelectedProject(project);
      setProjects(projs);
    });
  };

  const handleOpenSettings = () => {
    setAnchorEl(null);
    setShowSettings(true);
  };

  const handleOpenNewOrg = () => {
    setAnchorEl(null);
    setOpenNewOrg(true);
  };

  const handleOpenNewProj = () => {
    setAnchorEl(null);
    setOpenNewProj(true);
  };

  const handleOpenEditOrg = (organization: string) => {
    setAnchorEl(null);
    setEditOrg(organization);
    setOpenEditOrg(true);
  };

  const handleOpenEditProj = (project: string) => {
    setAnchorEl(null);
    setEditProj(project);
    setOpenEditProj(true);
  };

  const toggleFavoriteOrg = (organization: string) => {
    ToggleFavoriteOrganization(organization).then(() => {
      const org = organizations.find(org => org.name === organization);
      if (org) {
        org.favorite = !org.favorite;
        setOrganizations([...organizations]);
      }
    });
  };
  
  const toggleFavoriteProject = (project: string) => {
    ToggleFavoriteProject(selectedOrganization, project).then(() => {
      const proj = projects.find(p => p.name === project);
      if (proj) {
        proj.favorite = !proj.favorite;
        setProjects([...projects]);
      }
    });
  };

  const handleDeleteOrganization = (organization: string) => {
    ConfirmAction(`Delete ${organization}`, "Are you sure you want to delete this organization?").then((confirmed) => {
      if (confirmed === false) {
        return;
      }
      handleMenuClose();
      if (organizations.length === 1) {
        toast.error("You cannot delete the last organization");
        return;
      }
      DeleteOrganization(organization).then(() => {
        const newOrgs = organizations.filter(org => org.name !== organization);
        setOrganizations(newOrgs);

        if (organization === selectedOrganization) {
          const newSelectedOrganization = organizations.sort(handleSort)[0].name;
          setSelectedOrganization(newSelectedOrganization);

          GetProjects(newSelectedOrganization).then(projs => {
            setProjects(projs);
            const newSelectedProject = projs.sort(handleSort)[0].name;
            setSelectedProject(newSelectedProject);
            SetOrganization(newSelectedOrganization, newSelectedProject);
          });
        }
      });
    });
  };

  const handleDeleteProject = (project: string) => {
    ConfirmAction(`Delete ${project}`, "Are you sure you want to delete this project?").then((confirmed) => {
      if (confirmed === false) {
        return;
      }
      handleMenuClose();
      if (projects.length === 1) {
        toast.error("You cannot delete the last project");
        return;
      }
      DeleteProject(selectedOrganization, project).then(() => {
        const newProjs = projects.filter(proj => proj.name !== project);
        setProjects(newProjs);
        
        if (project === selectedProject) {
          const newSelectedProject = projects.sort(handleSort)[0].name;
          setSelectedProject(newSelectedProject);

          SetProject(newSelectedProject).then(() => {
            GetWorkTimeByProject(selectedOrganization, newSelectedProject, dateString())
              .then(setCurrProjectWorkTime);
          });
        }
      });
    });
  };

  const handleSort = (a: Model, b: Model) => {
    if (a.favorite === b.favorite) {
    // If both projects have the same Favorite status, sort by UpdatedAt
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    } else {
      // Otherwise, sort by Favorite
      return Number(b.favorite) - Number(a.favorite);
    }
  };

  /**
   * Get organizations defined in database when the app loads
   * If no organizations are defined, prompt the user to create one
   */
  useEffect(() => {
    getCurrentWeekOfMonth().then(setCurrentWeek);
    GetOrganizations().then((orgs) => {
      if (orgs.length === 0) {
        setOpenNewOrg(true);
      } else {
        setOrganizations(orgs);
        orgs.sort(handleSort);
        const organization = orgs[0].name;
        setSelectedOrganization(organization);

        GetProjects(organization).then((projs) => {
          setProjects(projs);
          projs.sort(handleSort);
          const project = projs[0].name;
          setSelectedProject(project);
          SetOrganization(organization, project);
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
    console.debug("Getting work time for organization", selectedOrganization);
    GetWorkTime(dateString(), selectedOrganization).then(setWorkTime);
    GetProjects(selectedOrganization).then((projs) => {
      setProjects(projs);
      projs.sort(handleSort);
      const project = projs[0].name;
      // Handle case where the old project name matches the new project name for different organizations
      if (project === selectedProject) {
        GetWorkTimeByProject(selectedOrganization, project, dateString())
          .then(setCurrProjectWorkTime);
      }
      setSelectedProject(project);
    });
  }, [selectedOrganization]);

  /**
   * Get the work time for the current project when the app loads
   */
  useEffect(() => {
    if (!selectedProject) return;
    console.debug("Getting work time for project", selectedProject);
    GetWorkTimeByProject(selectedOrganization, selectedProject, dateString())
      .then(setCurrProjectWorkTime);
  }, [selectedProject]);

  /**
   * Check the day every minute and update the day if it changes
   * Update workTime when the day changes and reset the timer
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentDayRef.current !== new Date().getDate()) {
        setCurrentDay(new Date().getDate());
        GetWorkTime(dateString(), selectedOrganization)
          .then(setWorkTime);
        GetWorkTimeByProject(selectedOrganization, selectedProject, dateString())
          .then(setCurrProjectWorkTime);
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
    GetWeeklyWorkTime(currentYear, currentMonth, selectedOrganization)
      .then(setWeeklyWorkTimes);
    GetMonthlyWorkTime(currentYear, selectedOrganization)
      .then(setMonthlyWorkTimes);
  }, [selectedOrganization]);

  /**
   * Update the work time every second if the timer is running
   */
  useEffect(() => {
    if (timerRunning) {
      const interval = setInterval(() => {
        TimeElapsed().then(currentElapsedTime => {
          setWorkTime(prevWorkTime => prevWorkTime + (currentElapsedTime - elapsedTimeRef.current));
          setCurrProjectWorkTime(prevProjectWorkTime => prevProjectWorkTime + (currentElapsedTime - elapsedTimeRef.current));
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
            <MenuItem onClick={handleOpenSettings}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={handleOpenNewOrg}>Add New Organization</MenuItem>
            <MenuItem onClick={handleOpenNewProj}>Add New Project</MenuItem>
            <MenuItem
              onClick={() => handleOpenEditOrg(selectedOrganization)}
            >
              Edit Current Organization
            </MenuItem>
            <MenuItem
              onClick={() => handleDeleteOrganization(selectedOrganization)}
            >
              Delete Current Organization
            </MenuItem>
          </Menu>
          
          <NavBar />
          
          {/* what a terrible solution to space this */}
          <div style={{ flexGrow: 1 }}></div>
          {/* Our App Title */}
          {/* <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Work Hours Tracker
          </Typography> */}

          {/* Dropdown to select organization */}
          <Box sx={{ marginRight: 5 }}>
            <Typography variant="h6" component="h2" sx={{ display: 'inline-block', marginRight: 2 }}>
              Organization:
            </Typography>
            <Select
              label="Organization"
              labelId="organization-select-label"
              variant="standard"
              value={selectedOrganization}
              onChange={(event) => setOrganization(event.target.value as string)}
              renderValue={(selected) => <div>{selected}</div>}
            >
              {organizations.sort(handleSort).map((org, idx) => (
                <MenuItem key={idx} value={org.name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <IconButton
                      edge="start"
                      aria-label="favorite"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavoriteOrg(org.name);
                      }}
                    >
                      {org.favorite ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    {org.name}
                  </div>
                <div>
                  <Tooltip title="Edit organization">
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenEditOrg(org.name);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete organization">
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteOrganization(org.name);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </div>
              </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Dropdown to select project */}
          <Box>
            <Typography variant="h6" component="h2" sx={{ display: 'inline-block', marginRight: 2 }}>
              Project:
            </Typography>
            <Select
              variant="standard"
              value={selectedProject}
              onChange={(event) => {
                SetProject(event.target.value as string).then(() => {
                  setSelectedProject(event.target.value as string);
                });
              }}
              renderValue={(selected) => <div>{selected}</div>}
            >
              {projects.sort(handleSort).map((project, idx) => (
                <MenuItem key={idx} value={project.name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <IconButton
                      edge="start"
                      aria-label="favorite"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavoriteProject(project.name);
                      }}
                    >
                      {project.favorite ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    {project.name}
                  </div>
                  <div>
                    <Tooltip title="Edit project">
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenEditProj(project.name);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete project">
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteProject(project.name);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                </MenuItem>
              ))}
            </Select>
          </Box>
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
      <div hidden={selectedTab !== TabMap.WorkTime} style={{ marginTop: 15, minHeight: 375, minWidth: 500 }}>
        {!isScreenHeightLessThan510px && (
          <Grid
            container
            spacing={{ xs: 2, md: 4 }}
            columns={{ xs: 4, sm: 8, md: 12 }}
            sx={{ 
              marginBottom: 4, 
              justifyContent: 'space-evenly', 
              paddingLeft: theme => theme.spacing(6), 
              paddingRight: theme => theme.spacing(3) 
            }}
          >
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="h6" component="h2" sx={{ textAlign: 'left', 'marginLeft': (theme) => theme.spacing(2) }}>
                Today's Work Total
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={`Organization: ${formatTime(workTime)}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Project (${selectedProject}): ${formatTime(currProjectWorkTime)}`}
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="h6" component="h2" sx={{ textAlign: 'left', 'marginLeft': (theme) => theme.spacing(2) }}>
                Weekly Work Total
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={`Organization: ${formatTime(sumWeekWorktime(currentWeek))}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Project (${selectedProject}): ${formatTime(weeklyWorkTimes[currentWeek]?.[selectedProject] ?? 0)}`}
                  />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="h6" component="h2" sx={{ textAlign: 'left', 'marginLeft': (theme) => theme.spacing(2) }}>
                {months[currentMonth]}'s work totals
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={`Organization: ${formatTime(sumMonthWorktime(currentMonth))}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Project (${selectedProject}): ${formatTime(monthlyWorkTimes[currentMonth]?.[selectedProject] ?? 0)}`}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        )}

        {/* Current session */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
      </div>
      
      {/* Table to display our totals */}
      <div hidden={selectedTab !== TabMap.YearlyTable}>
        <h2>Yearly Work Time</h2>
        <WorkTimeAccordion
          timerRunning={timerRunning}
          selectedOrganization={selectedOrganization}
          projects={projects.map(proj => proj.name)}
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
        setSelectedOrganization={setSelectedOrganization}
        setSelectedProject={setSelectedProject}
        setOpenNewOrg={setOpenNewOrg}
      />

      {/* Handle creating a new project for current selected organization */}
      <NewProjectDialog
        openNewProj={openNewProj}
        organization={selectedOrganization}
        setSelectedProject={setSelectedProject}
        setMonthlyWorkTimes={setMonthlyWorkTimes}
        setOpenNewProj={setOpenNewProj}
      />

      {/* Handle editing current organization */}
      <EditOrganizationDialog
        openEditOrg={openEditOrg}
        organization={editOrg}
        setSelectedOrganization={setSelectedOrganization}
        setOpenEditOrg={setOpenEditOrg}
      />

      {/* Handle editing a project from the current organization */}
      <EditProjectDialog
        openEditProj={openEditProj}
        organization={selectedOrganization}
        project={editProj}
        setSelectedProject={setSelectedProject}
        setOpenEditProj={setOpenEditProj}
      />

      <AppFooter />
    </div>
  )
}

export default App
