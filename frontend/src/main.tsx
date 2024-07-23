import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./routes/App";
import Charts from "./routes/Charts";
import Tables from "./routes/Tables";
import { createHashRouter, RouterProvider } from "react-router-dom";
import AppFooter from "./components/AppFooter";

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

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <AppFooter />
  </React.StrictMode>
);
