import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { GetAllProjects, GetWorkSessions, ShowWindow, TimeElapsed } from "@go/main/App";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ActiveConfirmationDialog from "./components/ActiveConfirmationDialog";
import AppFooter from "./components/AppFooter";
import App from "./routes/App";
import Charts from "./routes/Charts";
import SessionsManager from "./routes/SessionsManager";
import Tables from "./routes/Tables";
import { useAppStore } from "./stores/main";
import { useTimerStore } from "./stores/timer";
import "./style.css";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    // loader: async () => {
    //   const orgs = await GetOrganizations();
    //   return { orgs };
    // },
  },
  {
    path: "/charts",
    element: <Charts />,
  },
  {
    path: "/tables",
    element: <Tables />,
  },
  {
    path: "/sessions",
    element: <SessionsManager />,
    loader: async () => {
      console.log("Loading sessions");
      const sessions = await GetWorkSessions();
      const projects = await GetAllProjects();
      const orgNames = new Map<number, string>();
      const orgMap = new Map<number, string>();
      for (const org of useAppStore.getState().organizations) {
        orgNames.set(org.id, org.name);
      }
      const projectsMap = new Map<number, string>();
      for (const proj of projects) {
        projectsMap.set(proj.id, proj.name);
        const orgName = orgNames.get(proj.organization_id);
        if (orgName) {
          orgMap.set(proj.id, orgName);
        }
      }
      return { sessions, projectsMap, orgMap };
    },
  },
]);

// Track active timer outside of the component to avoid it stopping when we change pages
let workTimeInterval: NodeJS.Timeout;
let confirmationInterval: NodeJS.Timeout;
const setElapsedTime = useTimerStore.getState().setElapsedTime;
const setOpenConfirm = useTimerStore.getState().setOpenConfirm;
const setOrgDayTotal = useAppStore.getState().setOrgDayTotal;
const setProjDayTotal = useAppStore.getState().setProjDayTotal;
const updateOrgWeekTotal = useAppStore.getState().updateOrgWeekTotal;
const updateProjWeekTotal = useAppStore.getState().updateProjWeekTotal;
const updateOrgMonthTotal = useAppStore.getState().updateOrgMonthTotal;
const updateProjMonthTotal = useAppStore.getState().updateProjMonthTotal;
/**
 * Update the work time (elapsed time) every second if the timer is running
 * This is a global effect that will run for the entire lifecycle of the app
 */
const timerSubscription = useTimerStore.subscribe(
  (state) => state.running,
  (curr, prev) => {
    console.log(`Time state switched from ${prev} to ${curr}`);
    if (curr) {
      const orgTotal = useAppStore.getState().orgDayTotal;
      const projTotal = useAppStore.getState().projDayTotal;
      workTimeInterval = setInterval(() => {
        TimeElapsed().then((currentElapsedTime) => {
          setElapsedTime(currentElapsedTime);
          setOrgDayTotal(orgTotal + currentElapsedTime);
          setProjDayTotal(projTotal + currentElapsedTime);
        });
      }, 1000);
      const alertTime = useAppStore.getState().alertTime;
      const openConfirm = useTimerStore.getState().openConfirm;
      if (!openConfirm && alertTime > 0) {
        console.debug(`Setting confirmation interval for ${alertTime} minutes`);
        confirmationInterval = setInterval(
          () => {
            ShowWindow().then(() => {
              setOpenConfirm(true);
            });
          },
          1000 * 60 * alertTime,
        ); // Show the alert every x minutes
      }
    } else {
      clearInterval(workTimeInterval);
      clearInterval(confirmationInterval);

      // Update the weekly and monthly totals
      const elapsedTime = useTimerStore.getState().elapsedTime;
      updateOrgWeekTotal(elapsedTime);
      updateProjWeekTotal(elapsedTime);
      updateOrgMonthTotal(elapsedTime);
      updateProjMonthTotal(elapsedTime);
    }
  },
);
/**
 * Update the alert time interval if the user changes it
 */
const alertTimeSubscription = useAppStore.subscribe(
  (state) => state.alertTime,
  (curr, prev) => {
    console.log(`Alert time switched from ${prev} to ${curr}`);
    if (!useTimerStore.getState().running) return;
    clearInterval(confirmationInterval);
    if (curr > 0) {
      confirmationInterval = setInterval(
        () => {
          ShowWindow().then(() => {
            setOpenConfirm(true);
          });
        },
        1000 * 60 * curr,
      ); // Show the alert every x minutes
    } else {
      console.debug("Clearing confirmation interval");
      clearInterval(confirmationInterval);
    }
  },
);

const AppWithTheme = () => {
  const appTheme = useAppStore((state) => state.appTheme);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: appTheme === "dark" ? "dark" : "light",
          ...(appTheme === "light" && {
            background: {
              default: "#f0f0f0",
            },
          }),
        },
      }),
    [appTheme],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Notifcation container */}
      <ToastContainer />
      {/* Handle confirming user still active */}
      <ActiveConfirmationDialog />
      <RouterProvider router={router} />
      <AppFooter />
    </ThemeProvider>
  );
};

const container = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>,
);
