import NavBar from "@/components/NavBar";
import AppBar from "@/components/ui/AppBar";
import { useAppStore } from "@/stores/main";
import { handleSort } from "@/utils/utils";
import { GetProjects } from "@go/main/App";
import { main } from "@go/models";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Box, MenuItem, Select, Stack, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import WorkTimeAccordion from "../components/WorkTimeAccordian";

function Tables() {
  const [activeOrganization, setActiveOrganization] = useState(useAppStore.getState().getActiveOrganization());
  const [organizations, setOrganizations] = useState<main.Organization[]>(useAppStore.getState().getOrganizations());
  const [projects, setProjects] = useState<main.Project[]>(useAppStore.getState().getProjects());

  useEffect(() => {
    if (!activeOrganization) return;
    GetProjects(activeOrganization.id).then((projs) => {
      setProjects(projs);
    });
  }, [activeOrganization]);

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
              value={activeOrganization?.name}
              onChange={(event) => {
                const foundOrg = organizations.find((org) => org.name === event.target.value);
                if (foundOrg) {
                  setActiveOrganization(foundOrg);
                }
              }}
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
      {activeOrganization && (
        <WorkTimeAccordion activeOrganization={activeOrganization} projects={projects.map((proj) => proj.name)} />
      )}
    </div>
  );
}

export default Tables;
