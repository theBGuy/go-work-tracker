import { AppBar, Toolbar, Typography } from "@mui/material"
import { NavLink } from "react-router-dom"
import NavBar from "../components/NavBar"

function Charts () {
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

export default Charts