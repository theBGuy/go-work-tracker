import { Stack, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";

const NavBar = () => {
  const linkStyle = {
    textDecoration: "none",
    color: "white",
  };

  const activeLinkStyle = {
    textDecoration: "underline",
    color: "yellow",
  };

  return (
    <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
      <NavLink to="/" style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}>
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          Home
        </Typography>
      </NavLink>
      <NavLink to="/tables" style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}>
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          Tables
        </Typography>
      </NavLink>
      <NavLink to="/charts" style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}>
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          Charts
        </Typography>
      </NavLink>
    </Stack>
  );
};

export default NavBar;
