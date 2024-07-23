import { AppBar, Toolbar, Typography } from "@mui/material"
import NavBar from "../components/NavBar"
import { useState } from "react";
import { getMonth } from "../utils/utils";

function Tables () {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(getMonth());
  return (
    <div id="app">
      <AppBar position="static">
        <Toolbar>
          <NavBar />
        </Toolbar>
      </AppBar>
    </div>
  )
}

export default Tables