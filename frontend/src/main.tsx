import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./routes/App";
import Charts from "./routes/Charts";
import Tables from "./routes/Tables";
import { createHashRouter, RouterProvider } from "react-router-dom";
import AppFooter from "./components/AppFooter";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTimerStore } from "./stores/timer";
import { ShowWindow, TimeElapsed } from "../wailsjs/go/main/App";
import ActiveConfirmationDialog from "./components/ActiveConfirmationDialog";
import { useAppStore } from "./stores/main";

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
let workTimeInterval: number;
let confirmationInterval: number;
const timerRunning = useTimerStore.getState().running;
const setElapsedTime = useTimerStore.getState().setElapsedTime;
const openConfirm = useTimerStore.getState().openConfirm;
const setOpenConfirm = useTimerStore.getState().setOpenConfirm;
const alertTime = useAppStore.getState().alertTime;
const updateWorkTime = useAppStore.getState().updateWorkTime;
const updateProjWorktime = useAppStore.getState().updateProjectWorkTime;
const updateOrgWeekTotal = useAppStore.getState().updateOrgWeekTotal;
const updateOrgMonthTotal = useAppStore.getState().updateOrgMonthTotal;
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
          updateWorkTime(1);
          updateProjWorktime(1);
        });
      }, 1000);
      if (!openConfirm && alertTime > 0) {
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
      updateOrgMonthTotal(elapsedTime);
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
    if (curr > 0) {
      confirmationInterval = setInterval(() => {
        ShowWindow().then(() => {
          setOpenConfirm(true);
        });
      }, 1000 * 60 * curr); // Show the alert every x minutes
    } else {
      console.log("Clearing confirmation interval");
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
