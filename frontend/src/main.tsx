import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./routes/App";
import Charts from "./routes/Charts";
import { createHashRouter, RouterProvider } from "react-router-dom";

const router = createHashRouter([
  {
    path: "/",
    element: <App />
  },
  {
    path: "/charts",
    element: <Charts />
  }
]);

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
