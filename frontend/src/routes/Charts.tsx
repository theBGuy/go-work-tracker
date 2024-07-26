import {
  AppBar,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import NavBar from "../components/NavBar";
import { useEffect, useState } from "react";
import { getMonth, months } from "../utils/utils";
import { useAppStore } from "../stores/main";
import { main } from "../../wailsjs/go/models";
import { GetDailyWorkTimeByMonth, GetProjects } from "../../wailsjs/go/main/App";
import { LineChart } from "@mui/x-charts/LineChart";

interface GraphData {
  // @ts-ignore
  day: string;
  [project: string]: number;
}

function Charts() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 }, (_, i) => 2000 + i);
  const organizations = useAppStore((state) => state.organizations);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [projects, setProjects] = useState<main.Project[]>([]);
  const [dailyWorkTimes, setDailyWorkTimes] = useState<GraphData[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(getMonth());
  const colors = [
    "lightgray",
    "lightgreen",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "blue",
    "red",
    "orange",
    "yellow",
    "black",
  ];

  useEffect(() => {
    const store = useAppStore.getState();
    // deep clone to avoid mutating the original objects we just want the initial states
    setProjects(store.getProjects());
    setSelectedOrganization(store.getSelectedOrganization());
  }, []);

  useEffect(() => {
    if (!selectedOrganization) return;
    GetProjects(selectedOrganization).then((projs) => {
      setProjects(projs);
    });
  }, [selectedOrganization]);

  useEffect(() => {
    if (!selectedOrganization) return;
    GetDailyWorkTimeByMonth(selectedYear, selectedMonth, selectedOrganization).then((data) => {
      console.log("daily work times", data);
      const graphData: GraphData[] = [];
      for (const [day, projs] of Object.entries(data)) {
        console.log("day", new Date(day).getDate());
        // @ts-ignore
        graphData.push({ day: new Date(day), ...projs });
      }
      projects.forEach((project) => {
        graphData.forEach((data) => {
          if (!data[project.name]) {
            data[project.name] = 0;
          }
        });
      });
      console.log("graph data", graphData);
      setDailyWorkTimes(graphData);
    });
  }, [selectedYear, selectedOrganization, selectedMonth]);

  return (
    <div id="app">
      <AppBar position="static">
        <Toolbar>
          <NavBar />
        </Toolbar>
      </AppBar>
      <Stack spacing={1} sx={{ padding: 2 }}>
        <Paper sx={{ padding: 2 }}>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value as number)}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value as number)}>
                {Object.entries(months).map(([monthNumber, monthName]) => (
                  <MenuItem key={Number(monthNumber)} value={Number(monthNumber)}>
                    {monthName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Organization</InputLabel>
              <Select
                value={selectedOrganization}
                onChange={(event) => {
                  const foundOrg = organizations.find((org) => org.name === event.target.value);
                  if (foundOrg) {
                    setSelectedOrganization(foundOrg.name);
                  }
                }}
              >
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.name}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>
        {/* Fix setting the height manually */}
        <Paper elevation={1} sx={{ height: 400 }}>
          <LineChart
            xAxis={[
              {
                min: new Date(selectedYear, selectedMonth - 1, 1),
                max: new Date(selectedYear, selectedMonth, 0),
                dataKey: "day",
                label: "Date",
                scaleType: "utc",
              },
            ]}
            yAxis={[
              {
                label: "Total Work Time (s)",
                scaleType: "linear",
              },
            ]}
            series={projects.map((project, index) => ({
              dataKey: project.name,
              label: project.name,
              color: colors[index],
              stack: "total",
              valueFormatter: (value) => `${value || 0}s`,
            }))}
            dataset={dailyWorkTimes}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
      </Stack>
    </div>
  );
}

export default Charts;
