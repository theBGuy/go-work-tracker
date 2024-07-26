import { AppBar, Box, MenuItem, Select, Stack, Toolbar, Typography } from "@mui/material";
import NavBar from "../components/NavBar";
import WorkTimeAccordion from "../components/WorkTimeAccordian";
import { useAppStore } from "../stores/main";
import { useEffect, useState } from "react";
import { GetProjects } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { handleSort } from "../utils/utils";

function Tables() {
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [organizations, setOrganizations] = useState<main.Organization[]>([]);
  const [projects, setProjects] = useState<main.Project[]>([]);

  useEffect(() => {
    const store = useAppStore.getState();
    // deep clone to avoid mutating the original objects we just want the initial states
    setOrganizations(store.getOrganizations());
    setProjects(store.getProjects());
    setSelectedOrganization(store.getSelectedOrganization());
  }, []);

  useEffect(() => {
    if (!selectedOrganization) return;
    GetProjects(selectedOrganization).then((projs) => {
      setProjects(projs);
    });
  }, [selectedOrganization]);

  return (
    <div id="app">
      <AppBar position="static">
        <Toolbar>
          <NavBar />
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
              onChange={(event) => setSelectedOrganization(event.target.value as string)}
              renderValue={(selected) => <div>{selected}</div>}
            >
              {organizations.sort(handleSort).map((org, idx) => (
                <MenuItem key={idx} value={org.name} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={1}>
                    {org.favorite ? <StarIcon /> : <StarBorderIcon />}
                    <Typography>{org.name}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Toolbar>
      </AppBar>
      <h2>Yearly Work Time</h2>
      <WorkTimeAccordion selectedOrganization={selectedOrganization} projects={projects.map((proj) => proj.name)} />
    </div>
  );
}

export default Tables;
