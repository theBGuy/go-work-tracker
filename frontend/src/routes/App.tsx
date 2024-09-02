import { useEffect, useState } from "react";

import EditOrganizationDialog from "@/components/EditOrganizationDialog";
import NewOrganizationDialog from "@/components/NewOrganizationDialog";
import NewProjectDialog from "@/components/NewProjectDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { toast } from "react-toastify";

import ActiveSession from "@/components/ActiveSession";
import EditProjectDialog from "@/components/EditProjectDialog";
import ModelSelect from "@/components/ModelSelect";
import NavBar from "@/components/NavBar";
import AppBar from "@/components/ui/AppBar";
import WorkTimeListing from "@/components/WorkTimeListing";
import { useAppStore } from "@/stores/main";
import { useTimerStore } from "@/stores/timer";
import { dateString, getCurrentWeekOfMonth, getMonth, handleSort, months } from "@/utils/utils";
import {
  CheckForUpdates,
  ConfirmAction,
  DeleteOrganization,
  DeleteProject,
  GetActiveTimer,
  GetOrganizations,
  GetOrgWorkTimeByMonth,
  GetOrgWorkTimeByWeek,
  GetProjects,
  GetProjWorkTimeByMonth,
  GetProjWorkTimeByWeek,
  GetWorkTime,
  GetWorkTimeByProject,
  SetOrganization,
  SetProject,
  StopTimer,
  ToggleFavoriteOrganization,
  ToggleFavoriteProject,
} from "@go/main/App";
import { main } from "@go/models";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  CircularProgress,
  Divider,
  Grid2,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { EventsOn } from "@runtime/runtime";
import { useNavigate } from "react-router-dom";

// type LoaderData = {
//   orgs: main.Organization[];
// };

function App() {
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("App rendered", renderCount.current);
  const navigate = useNavigate();
  const appMode = useAppStore((state) => state.appMode);
  const isScreenHeightLessThan510px = useMediaQuery("(max-height:510px)");
  const currentYear = new Date().getFullYear();
  const currentMonth = getMonth();
  const dateStr = useAppStore((state) => state.dateStr);
  const setDateStr = useAppStore((state) => state.setDateStr);

  const projects = useAppStore((state) => state.projects);
  const setProjects = useAppStore((state) => state.setProjects);
  const organizations = useAppStore((state) => state.organizations);
  const setOrganizations = useAppStore((state) => state.setOrganizations);
  const setShowMiniTimer = useTimerStore((state) => state.setShowMiniTimer);

  // Variables for timer
  const resetTimer = useTimerStore((state) => state.resetTimer);
  const timerRunning = useTimerStore((state) => state.running);
  const orgDayTotal = useAppStore((state) => state.orgDayTotal);
  const setOrgDayTotal = useAppStore((state) => state.setOrgDayTotal);
  const projDayTotal = useAppStore((state) => state.projDayTotal);
  const setProjDayTotal = useAppStore((state) => state.setProjDayTotal);

  // Variables for handling work time totals
  const orgWeekTotal = useAppStore((state) => state.orgWeekTotal);
  const orgMonthTotal = useAppStore((state) => state.orgMonthTotal);
  const projWeekTotal = useAppStore((state) => state.projWeekTotal);
  const projMonthTotal = useAppStore((state) => state.projMonthTotal);
  const setProjWorkTotals = useAppStore((state) => state.setProjWorkTimeTotals);
  const setOrgWorkTotals = useAppStore((state) => state.setOrgWorkTimeTotals);
  const [currentWeek, setCurrentWeek] = useAppStore((state) => [state.currentWeek, state.setCurrentWeek]);

  // Variables for handling organizations
  const setActiveInfo = useAppStore((state) => state.setActiveInfo);
  const activeOrg = useAppStore((state) => state.activeOrg);
  const setSelectedOrganization = useAppStore((state) => state.setActiveOrganization);
  const activeProj = useAppStore((state) => state.activeProj);
  const setSelectedProject = useAppStore((state) => state.setActiveProject);

  // Dialogs
  const [showSpinner, setShowSpinner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openNewOrg, setOpenNewOrg] = useState(false);
  const [openNewProj, setOpenNewProj] = useState(false);
  const [openEditOrg, setOpenEditOrg] = useState(false);
  const [openEditProj, setOpenEditProj] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Editables
  const [editOrg, setEditOrg] = useState(0);
  const [editProj, setEditProj] = useState(0);

  const checkForUpdates = async () => {
    setShowSpinner(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await CheckForUpdates();
    if (!result) {
      toast.info("No updates available");
    }
    setShowSpinner(false);
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
    await StopTimer();
    resetTimer();
  };

  const setOrganization = async (org: main.Organization) => {
    if (!org) return;
    if (timerRunning) {
      await stopTimer();
    }
    const projs = await GetProjects(org.id);
    projs.sort(handleSort);
    const project = projs[0];
    await SetOrganization(org.id);
    await SetProject(project.id);
    setActiveInfo(org, project);
    setProjects(projs);
  };

  const setProject = async (project: main.Project) => {
    if (!project) return;
    if (timerRunning) {
      await stopTimer();
    }
    SetProject(project.id).then(() => {
      setSelectedProject(project);
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

  const handleOpenEditOrg = (organizationID?: number) => {
    if (!organizationID) {
      return;
    }
    setAnchorEl(null);
    setEditOrg(organizationID);
    setOpenEditOrg(true);
  };

  const handleOpenEditProj = (projectID: number) => {
    if (!projectID) {
      return;
    }
    setAnchorEl(null);
    setEditProj(projectID);
    setOpenEditProj(true);
  };

  const toggleFavoriteOrg = (organizationID: number) => {
    ToggleFavoriteOrganization(organizationID).then(() => {
      const newOrgs = organizations.map((org) =>
        org.id === organizationID ? ({ ...org, favorite: !org.favorite } as main.Organization) : org
      );
      setOrganizations(newOrgs);
    });
  };

  const toggleFavoriteProject = (projectID: number) => {
    ToggleFavoriteProject(projectID).then(() => {
      const newProjs = projects.map((proj) =>
        proj.id === projectID ? ({ ...proj, favorite: !proj.favorite } as main.Project) : proj
      );
      setProjects(newProjs);
    });
  };

  const handleDeleteOrganization = (organizationID?: number) => {
    if (!organizationID) return;
    const organization = organizations.find((org) => org.id === organizationID);
    if (!organization) return;
    ConfirmAction(`Delete ${organization.name}`, "Are you sure you want to delete this organization?").then(
      (confirmed) => {
        if (confirmed === false) {
          return;
        }
        handleMenuClose();
        if (organizations.length === 1) {
          toast.error("You cannot delete the last organization");
          return;
        }
        DeleteOrganization(organizationID).then(() => {
          const newOrgs = organizations.filter((org) => org.id !== organizationID);
          setOrganizations(newOrgs);

          if (organizationID === activeOrg?.id) {
            const newSelectedOrganization = organizations.sort(handleSort)[0];
            setSelectedOrganization(newSelectedOrganization);

            GetProjects(newSelectedOrganization.id).then(async (projs) => {
              setProjects(projs);
              const newSelectedProject = projs.sort(handleSort)[0];
              setSelectedProject(newSelectedProject);
              await SetOrganization(newSelectedOrganization.id);
              await SetProject(newSelectedProject.id);
            });
          }
        });
      }
    );
  };

  const handleDeleteProject = (projectID: number) => {
    const project = projects.find((proj) => proj.id === projectID);
    if (!project) {
      return;
    }
    ConfirmAction(`Delete ${project.name}`, "Are you sure you want to delete this project?").then((confirmed) => {
      if (confirmed === false) {
        return;
      }
      handleMenuClose();
      if (projects.length === 1) {
        toast.error("You cannot delete the last project");
        return;
      }
      DeleteProject(projectID).then(() => {
        const newProjs = projects.filter((proj) => proj.id !== projectID);
        setProjects(newProjs);

        if (projectID === activeProj?.id) {
          const newSelectedProject = projects.sort(handleSort)[0];
          setSelectedProject(newSelectedProject);

          SetProject(newSelectedProject.id).then(() => {
            GetWorkTimeByProject(newSelectedProject.id, dateString()).then(setProjDayTotal);
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
        const active = await GetActiveTimer();
        orgs.sort(handleSort);
        setOrganizations(orgs);
        if (active.organization && active.organization.id) {
          if (activeOrg?.id !== active.organization.id) {
            setSelectedOrganization(active.organization);
          }
          if (active.project && active.project.id) {
            if (activeProj?.id !== active.project.id) {
              setSelectedProject(active.project);
            }
          }

          GetProjects(active.organization.id).then((projs) => {
            projs.sort(handleSort);
            setProjects(projs);
          });
          useTimerStore.getState().setRunning(active.isRunning);
          useTimerStore.getState().setElapsedTime(active.timeElapsed);
          return;
        }

        try {
          const localOrgId = parseInt(localStorage.getItem("activeOrg") || "0");
          const localProjId = parseInt(localStorage.getItem("activeProj") || "0");

          if (localOrgId && localProjId) {
            const org = orgs.find((org) => org.id === localOrgId);
            if (org) {
              const proj = await GetProjects(org.id);
              proj.sort(handleSort);
              const project = proj.find((p) => p.id === localProjId);
              if (project) {
                await SetOrganization(org.id);
                await SetProject(project.id);
                setActiveInfo(org, project);
                setProjects(proj);
                return;
              }
            }
          }
        } catch {
          console.error("Error parsing active organization and project from local storage");
        }
        console.debug("No active timer found");
        const organization = orgs[0];
        const projs = await GetProjects(organization.id);
        projs.sort(handleSort);
        const project = projs[0];
        await SetOrganization(organization.id);
        await SetProject(project.id);
        setActiveInfo(organization, project);
        setProjects(projs);
      }
    });

    const newDayEvent = EventsOn("new-day", () => {
      console.debug("New day event received");
      setDateStr(dateString());
    });

    const daySubscription = useAppStore.subscribe(
      (state) => state.dateStr,
      (curr, prev) => {
        console.debug("Date changed from", prev, "to", curr);
        getCurrentWeekOfMonth().then(setCurrentWeek);

        const org = useAppStore.getState().activeOrg;
        if (!org) return;
        GetWorkTime(curr, org.id).then((time) => {
          console.debug(`Work time for ${org.name}`, time);
          setOrgDayTotal(time);
        });

        const proj = useAppStore.getState().activeProj;
        if (!proj) return;
        GetWorkTimeByProject(proj.id, curr).then((time) => {
          console.debug(`Work time for ${org.name}/${proj.name}`, time);
          setProjDayTotal(time);
        });
      }
    );

    return () => {
      setShowMiniTimer(true);
      daySubscription(); // cleanup
      newDayEvent(); // cleanup
      // renderCount.current = 0;
    };
  }, []);

  /**
   * Watch for changes in the date
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const today = dateString();
      if (today !== dateStr) {
        console.debug("Date changed from", dateStr, "to", today);
        setDateStr(today);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [dateStr]);

  /**
   * Get the projects for the selected organization
   */
  useEffect(() => {
    if (!activeOrg) return;
    GetProjects(activeOrg.id).then(async (projs) => {
      setProjects(projs);
      projs.sort(handleSort);
      const proj = projs[0];
      if (proj.id === activeProj?.id) return;
      const { project } = await GetActiveTimer();
      if (project && project.id === activeProj?.id) return;
      setSelectedProject(proj);
    });
  }, [activeOrg]);

  /**
   * Get the worktimes for the current week and month when the app loads
   */
  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([
      GetWorkTime(dateString(), activeOrg.id),
      GetOrgWorkTimeByWeek(currentYear, currentMonth, currentWeek, activeOrg.id),
      GetOrgWorkTimeByMonth(currentYear, currentMonth, activeOrg.id),
    ]).then(([dayTotal, weekTotal, monthTotal]) => {
      console.debug(`Work time for ${activeOrg.name}`, dayTotal);
      console.debug(`Work time for ${activeOrg?.name} for week ${currentWeek} - ${weekTotal}`);
      console.debug(`Work time for ${activeOrg?.name} for month ${currentMonth} - ${monthTotal}`);

      setOrgWorkTotals(dayTotal, weekTotal, monthTotal);
    });
  }, [activeOrg, currentWeek, projects]);

  /**
   * Get the work time for the current project when the app loads
   */
  useEffect(() => {
    if (!activeProj) return;
    Promise.all([
      GetWorkTimeByProject(activeProj.id, dateString()),
      GetProjWorkTimeByWeek(currentYear, currentMonth, currentWeek, activeProj.id),
      GetProjWorkTimeByMonth(currentYear, currentMonth, activeProj.id),
    ]).then(([dayTotal, weekTotal, monthTotal]) => {
      console.debug(`Work time for ${activeOrg?.name}/${activeProj.name}`, dayTotal);
      console.debug(`Work time for ${activeOrg?.name}/${activeProj.name} for week ${currentWeek} - ${weekTotal}`);
      console.debug(`Work time for ${activeOrg?.name}/${activeProj.name} for month ${currentMonth} - ${monthTotal}`);

      setProjWorkTotals(dayTotal, weekTotal, monthTotal);
    });
  }, [activeProj, projects]);

  if (appMode === "widget") {
    return <ActiveSession stopTimer={stopTimer} />;
  }

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
            <MenuItem onClick={() => navigate("/sessions")}>Manage Work Sessions</MenuItem>
            <MenuItem onClick={() => handleOpenEditOrg(activeOrg?.id)}>Edit Current Organization</MenuItem>
            <MenuItem onClick={() => handleDeleteOrganization(activeOrg?.id)}>Delete Current Organization</MenuItem>
          </Menu>

          <NavBar />

          {/* what a terrible solution to space this */}
          <div style={{ flexGrow: 1 }}></div>

          {/* Dropdown to select organization */}
          <Box sx={{ marginRight: 5 }}>
            <ModelSelect
              label="Organization"
              value={activeOrg?.name || ""}
              onChange={(event) => {
                const foundOrg = organizations.find((org) => org.name === event.target.value);
                if (foundOrg) {
                  setOrganization(foundOrg);
                }
              }}
              items={organizations}
              showFavorite={true}
              toggleFavoriteOnClick={toggleFavoriteOrg}
              showEdit={true}
              editOnClick={handleOpenEditOrg}
              showDelete={true}
              deleteOnClick={handleDeleteOrganization}
            />
            <Tooltip title="Add new organization" placement="bottom">
              <IconButton onClick={handleOpenNewOrg}>
                <AddCircleIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Dropdown to select project */}
          <Box>
            <ModelSelect
              label="Project"
              value={activeProj?.name || ""}
              onChange={(event) => {
                const foundProject = projects.find((proj) => proj.name === event.target.value);
                if (foundProject) {
                  setProject(foundProject);
                }
              }}
              items={projects}
              showFavorite={true}
              toggleFavoriteOnClick={toggleFavoriteProject}
              showEdit={true}
              editOnClick={handleOpenEditProj}
              showDelete={true}
              deleteOnClick={handleDeleteProject}
            />
            <Tooltip title="Add new project" placement="bottom">
              <IconButton onClick={handleOpenNewProj}>
                <AddCircleIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* The main portion, our timer */}
      <Box marginTop={1} alignItems="center" sx={{ minHeight: 375, minWidth: 500 }}>
        {!isScreenHeightLessThan510px && (
          <Grid2
            container
            justifyContent="center"
            sx={{
              marginBottom: 4,
            }}
          >
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <WorkTimeListing title="Today's Work Total" orgTotal={orgDayTotal} projTotal={projDayTotal} />
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 4 }}>
              <WorkTimeListing title="Weekly Work Total" orgTotal={orgWeekTotal} projTotal={projWeekTotal} />
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 4 }}>
              <WorkTimeListing
                title={`${months[currentMonth]}'s Work Total`}
                orgTotal={orgMonthTotal}
                projTotal={projMonthTotal}
              />
            </Grid2>
          </Grid2>
        )}

        {/* Current session */}
        <ActiveSession stopTimer={stopTimer} />
      </Box>

      {/* Handle settings dialog */}
      <SettingsDialog showSettings={showSettings} setShowSettings={setShowSettings} handleMenuClose={handleMenuClose} />

      {/* Handle creating a new organization */}
      <NewOrganizationDialog openNewOrg={openNewOrg} setOpenNewOrg={setOpenNewOrg} />

      {/* Handle creating a new project for current selected organization */}
      <NewProjectDialog openNewProj={openNewProj} setOpenNewProj={setOpenNewProj} />

      {/* Handle editing current organization */}
      <EditOrganizationDialog orgID={editOrg} openEditOrg={openEditOrg} setOpenEditOrg={setOpenEditOrg} />

      {/* Handle editing a project from the current organization */}
      <EditProjectDialog projID={editProj} openEditProj={openEditProj} setOpenEditProj={setOpenEditProj} />
    </div>
  );
}

export default App;
