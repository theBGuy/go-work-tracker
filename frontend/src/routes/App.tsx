import { useEffect, useState, useRef } from "react";

import { toast } from "react-toastify";
import SettingsDialog from "../components/SettingsDialog";
import NewOrganizationDialog from "../components/NewOrganizationDialog";
import NewProjectDialog from "../components/NewProjectDialog";
import EditOrganizationDialog from "../components/EditOrganizationDialog";

import { Box, CircularProgress, Divider, Tooltip, useMediaQuery } from "@mui/material";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  List,
  ListItem,
  ListItemText,
  Grid,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
  StopTimer,
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
  ConfirmAction,
  ToggleFavoriteOrganization,
  ToggleFavoriteProject,
  GetActiveTimer,
  CheckForUpdates,
} from "../../wailsjs/go/main/App";
import { getMonth, months, formatTime, dateString, getCurrentWeekOfMonth, Model, handleSort } from "../utils/utils";
import EditProjectDialog from "../components/EditProjectDialog";
import NavBar from "../components/NavBar";
import { useAppStore } from "../stores/main";
import { useTimerStore } from "../stores/timer";
import ActiveSession from "../components/ActiveSession";
import { EventsOn } from "../../wailsjs/runtime/runtime";

// TODO: This has become large and messy. Need to break it up into smaller components ~in progress
function App() {
  const projects = useAppStore((state) => state.projects);
  const setProjects = useAppStore((state) => state.setProjects);
  const organizations = useAppStore((state) => state.organizations);
  const setOrganizations = useAppStore((state) => state.setOrganizations);
  const setShowMiniTimer = useTimerStore((state) => state.setShowMiniTimer);
  const isScreenHeightLessThan510px = useMediaQuery("(max-height:510px)");
  const currentYear = new Date().getFullYear();
  const currentMonth = getMonth();

  // Variables for timer
  const resetTimer = useTimerStore((state) => state.resetTimer);
  const timerRunning = useTimerStore((state) => state.running);
  const workTime = useTimerStore((state) => state.workTime);
  const setWorkTime = useTimerStore((state) => state.setWorkTime);
  const currProjectWorkTime = useTimerStore((state) => state.projectWorkTime);
  const setCurrProjectWorkTime = useTimerStore((state) => state.setProjectWorkTime);

  const [alertTime, setAlertTime] = useAppStore((state) => [state.alertTime, state.setAlertTime]);
  const [newAlertTime, setNewAlertTime] = useState(alertTime);

  // Variables for handling work time totals
  const [weeklyWorkTimes, setWeeklyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const [currentWeek, setCurrentWeek] = useState(1);

  // Variables for handling organizations
  const selectedOrganization = useAppStore((state) => state.selectedOrganization);
  const setSelectedOrganization = useAppStore((state) => state.setSelectedOrganization);
  const selectedProject = useAppStore((state) => state.selectedProject);
  const setSelectedProject = useAppStore((state) => state.setSelectedProject);

  // Dialogs
  const [showSpinner, setShowSpinner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openNewOrg, setOpenNewOrg] = useState(false);
  const [openNewProj, setOpenNewProj] = useState(false);
  const [openEditOrg, setOpenEditOrg] = useState(false);
  const [openEditProj, setOpenEditProj] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Editables
  const [editOrg, setEditOrg] = useState("");
  const [editProj, setEditProj] = useState("");

  EventsOn("new-day", () => {
    GetWorkTime(dateString(), selectedOrganization).then(setWorkTime);
    GetWorkTimeByProject(selectedOrganization, selectedProject, dateString()).then(setCurrProjectWorkTime);
  });

  const checkForUpdates = async () => {
    setShowSpinner(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await CheckForUpdates();
    if (!result) {
      toast.info("No updates available");
    }
    setShowSpinner(false);
  };

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

  const stopTimer = async () => {
    await StopTimer(selectedOrganization, selectedProject);

    GetWeeklyWorkTime(currentYear, currentMonth, selectedOrganization).then(setWeeklyWorkTimes);
    GetMonthlyWorkTime(currentYear, selectedOrganization).then(setMonthlyWorkTimes);
    resetTimer();
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

  const setProject = async (newProject: string) => {
    if (timerRunning) {
      await stopTimer();
    }
    SetProject(newProject).then(() => {
      setSelectedProject(newProject);
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
      const org = organizations.find((org) => org.name === organization);
      if (org) {
        org.favorite = !org.favorite;
        setOrganizations([...organizations]);
      }
    });
  };

  const toggleFavoriteProject = (project: string) => {
    ToggleFavoriteProject(selectedOrganization, project).then(() => {
      const proj = projects.find((p) => p.name === project);
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
        const newOrgs = organizations.filter((org) => org.name !== organization);
        setOrganizations(newOrgs);

        if (organization === selectedOrganization) {
          const newSelectedOrganization = organizations.sort(handleSort)[0].name;
          setSelectedOrganization(newSelectedOrganization);

          GetProjects(newSelectedOrganization).then((projs) => {
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
        const newProjs = projects.filter((proj) => proj.name !== project);
        setProjects(newProjs);

        if (project === selectedProject) {
          const newSelectedProject = projects.sort(handleSort)[0].name;
          setSelectedProject(newSelectedProject);

          SetProject(newSelectedProject).then(() => {
            GetWorkTimeByProject(selectedOrganization, newSelectedProject, dateString()).then(setCurrProjectWorkTime);
          });
        }
      });
    });
  };

  /**
   * on page load
   * Get organizations defined in database when the app loads
   * If no organizations are defined, prompt the user to create one
   */
  useEffect(() => {
    setShowMiniTimer(false);
    getCurrentWeekOfMonth().then(setCurrentWeek);
    GetOrganizations().then(async (orgs) => {
      if (orgs.length === 0) {
        setOpenNewOrg(true);
      } else {
        setOrganizations(orgs);
        orgs.sort(handleSort);
        const active = await GetActiveTimer();
        // what should be our source of truth? zustand gives us persistent state with json storage
        // so we could use that and update the backend if the frontend doesn't match
        // however, we could also just use the backend as the source of truth which feels more correct
        // this isn't our first load, just fetch the orgs and projects
        if (
          active.organization &&
          active.organization === selectedOrganization &&
          active.project &&
          active.project === selectedProject
        ) {
          GetProjects(active.organization).then((projs) => {
            setProjects(projs);
            projs.sort(handleSort);
          });
          if (active.isRunning && !timerRunning) {
            useTimerStore.getState().setRunning(true);
            useTimerStore.getState().setElapsedTime(active.timeElapsed);
          }
          return;
        }
        const organization = orgs[0].name;
        setSelectedOrganization(organization);
        const projs = await GetProjects(organization);
        projs.sort(handleSort);
        setProjects(projs);
        const project = projs[0].name;
        setSelectedProject(project);
        SetOrganization(organization, project);
      }
    });

    return () => {
      setShowMiniTimer(true);
    };
  }, []);

  /**
   * Get the work time for the current day when the app loads
   * This is used to display today's total work time and updates if the user switches organizations
   */
  useEffect(() => {
    if (!selectedOrganization) return;
    GetWorkTime(dateString(), selectedOrganization).then((data) => {
      console.debug(`Work time for ${selectedOrganization}`, data);
      setWorkTime(data);
    });
    GetProjects(selectedOrganization).then((projs) => {
      setProjects(projs);
      projs.sort(handleSort);
      const project = projs[0].name;
      // Handle case where the old project name matches the new project name for different organizations
      if (project === selectedProject) {
        GetWorkTimeByProject(selectedOrganization, project, dateString()).then((time) => {
          console.debug(`Work time for ${project}`, time);
          return setCurrProjectWorkTime(time);
        });
      }
      setSelectedProject(project);
    });
  }, [selectedOrganization]);

  /**
   * Get the work time for the current project when the app loads
   */
  useEffect(() => {
    if (!selectedProject) return;
    GetWorkTimeByProject(selectedOrganization, selectedProject, dateString()).then((times) => {
      console.debug(`Work time for ${selectedOrganization}/${selectedProject}`, times);
      return setCurrProjectWorkTime(times);
    });
  }, [selectedProject]);

  /**
   * Get the yearly and monthly work times when the app loads
   * This is used to display the yearly and monthly totals in the dropdown table
   * It updates if the user switches organizations or current display year
   */
  useEffect(() => {
    GetWeeklyWorkTime(currentYear, currentMonth, selectedOrganization).then((times) => {
      console.debug("Weekly work times", times);
      return setWeeklyWorkTimes(times);
    });
    GetMonthlyWorkTime(currentYear, selectedOrganization).then((times) => {
      console.debug("Monthly work times", times);
      return setMonthlyWorkTimes(times);
    });
  }, [selectedOrganization]);

  return (
    <div id="App">
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
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleOpenSettings}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={checkForUpdates}>
              {showSpinner && (
                <ListItemIcon>
                  <CircularProgress size={20} />
                </ListItemIcon>
              )}
              Check for updates
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleOpenNewOrg}>Add New Organization</MenuItem>
            <MenuItem onClick={handleOpenNewProj}>Add New Project</MenuItem>
            <MenuItem onClick={() => handleOpenEditOrg(selectedOrganization)}>Edit Current Organization</MenuItem>
            <MenuItem onClick={() => handleDeleteOrganization(selectedOrganization)}>
              Delete Current Organization
            </MenuItem>
          </Menu>

          <NavBar />

          {/* what a terrible solution to space this */}
          <div style={{ flexGrow: 1 }}></div>

          {/* Dropdown to select organization */}
          <Box sx={{ marginRight: 5 }}>
            <Typography variant="h6" component="h2" sx={{ display: "inline-block", marginRight: 2 }}>
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
                <MenuItem key={idx} value={org.name} sx={{ display: "flex", justifyContent: "space-between" }}>
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
            <Typography variant="h6" component="h2" sx={{ display: "inline-block", marginRight: 2 }}>
              Project:
            </Typography>
            <Select
              variant="standard"
              value={selectedProject}
              onChange={(event) => setProject(event.target.value as string)}
              renderValue={(selected) => <div>{selected}</div>}
            >
              {projects.sort(handleSort).map((project, idx) => (
                <MenuItem key={idx} value={project.name} sx={{ display: "flex", justifyContent: "space-between" }}>
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

      {/* The main portion, our timer */}
      <div style={{ marginTop: 15, minHeight: 375, minWidth: 500 }}>
        {!isScreenHeightLessThan510px && (
          <Grid
            container
            spacing={{ xs: 2, md: 4 }}
            columns={{ xs: 4, sm: 8, md: 12 }}
            sx={{
              marginBottom: 4,
              justifyContent: "space-evenly",
              paddingLeft: (theme) => theme.spacing(6),
              paddingRight: (theme) => theme.spacing(3),
            }}
          >
            <Grid item xs={12} sm={4} md={4}>
              <Typography
                variant="h6"
                component="h2"
                sx={{ textAlign: "left", marginLeft: (theme) => theme.spacing(2) }}
              >
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
              <Typography
                variant="h6"
                component="h2"
                sx={{ textAlign: "left", marginLeft: (theme) => theme.spacing(2) }}
              >
                Weekly Work Total
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary={`Organization: ${formatTime(sumWeekWorktime(currentWeek))}`} />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Project (${selectedProject}): ${formatTime(
                      weeklyWorkTimes[currentWeek]?.[selectedProject] ?? 0
                    )}`}
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Typography
                variant="h6"
                component="h2"
                sx={{ textAlign: "left", marginLeft: (theme) => theme.spacing(2) }}
              >
                {months[currentMonth]}'s work totals
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary={`Organization: ${formatTime(sumMonthWorktime(currentMonth))}`} />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Project (${selectedProject}): ${formatTime(
                      monthlyWorkTimes[currentMonth]?.[selectedProject] ?? 0
                    )}`}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        )}

        {/* Current session */}
        <ActiveSession stopTimer={stopTimer} />
      </div>

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
    </div>
  );
}

export default App;
