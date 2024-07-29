import { ShowWindow, TimeElapsed } from "@go/main/App";
import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ActiveConfirmationDialog from "./components/ActiveConfirmationDialog";
import AppFooter from "./components/AppFooter";
import App from "./routes/App";
import Charts from "./routes/Charts";
import Tables from "./routes/Tables";
import { useAppStore } from "./stores/main";
import { useTimerStore } from "./stores/timer";
import "./style.css";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/charts",
    element: <Charts />,
  },
  {
    path: "/tables",
    element: <Tables />,
  },
]);

// Track active timer outside of the component to avoid it stopping when we change pages
let workTimeInterval: NodeJS.Timeout;
let confirmationInterval: NodeJS.Timeout;
const timerRunning = useTimerStore.getState().running;
const setElapsedTime = useTimerStore.getState().setElapsedTime;
const setOpenConfirm = useTimerStore.getState().setOpenConfirm;
const updateDayWorkTotals = useAppStore.getState().updateDayWorkTotals;
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
      workTimeInterval = setInterval(() => {
        TimeElapsed().then((currentElapsedTime) => {
          setElapsedTime(currentElapsedTime);
          updateDayWorkTotals(1);
        });
      }, 1000);
      const alertTime = useAppStore.getState().alertTime;
      const openConfirm = useTimerStore.getState().openConfirm;
      if (!openConfirm && alertTime > 0) {
        console.debug(`Setting confirmation interval for ${alertTime} minutes`);
        confirmationInterval = setInterval(() => {
          ShowWindow().then(() => {
            setOpenConfirm(true);
          });
        }, 1000 * 60 * alertTime); // Show the alert every x minutes
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
  }
);
/**
 * Update the alert time interval if the user changes it
 */
const alertTimeSubscription = useAppStore.subscribe(
  (state) => state.alertTime,
  (curr, prev) => {
    console.log(`Alert time switched from ${prev} to ${curr}`);
    if (!timerRunning) return;
    clearInterval(confirmationInterval);
    if (curr > 0) {
      confirmationInterval = setInterval(() => {
        ShowWindow().then(() => {
          setOpenConfirm(true);
        });
      }, 1000 * 60 * curr); // Show the alert every x minutes
    } else {
      console.debug("Clearing confirmation interval");
      clearInterval(confirmationInterval);
    }
  }
);

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    {/* Notifcation container */}
    <ToastContainer />
    {/* Handle confirming user still active */}
    <ActiveConfirmationDialog />
    <RouterProvider router={router} />
    <AppFooter />
  </React.StrictMode>
);
