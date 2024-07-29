import NavBar from "@/components/NavBar";
import { useAppStore } from "@/stores/main";
import { useTimerStore } from "@/stores/timer";
import { formatTime, getMonth, months } from "@/utils/utils";
import { GetDailyWorkTimeByMonth, GetProjects } from "@go/main/App";
import { main } from "@go/models";
import { AppBar, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Toolbar } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { useEffect, useState } from "react";

interface GraphData {
  // @ts-ignore
  day: Date;
  [project: string]: number;
}

function Charts() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 }, (_, i) => 2000 + i);
  const organizations = useAppStore((state) => state.organizations);
  const [selectedOrganization, setSelectedOrganization] = useState(useAppStore.getState().activeOrg);
  const [projects, setProjects] = useState<main.Project[]>(useAppStore.getState().getProjects());
  const [dailyWorkTimes, setDailyWorkTimes] = useState<GraphData[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(getMonth());
  // need a better color scheme
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
    const timerSubscription = useTimerStore.subscribe(
      (state) => state.running,
      (curr, prev) => {
        // timer was running and not it's stopped
        if (!curr && prev) {
          const activeOrg = useAppStore.getState().activeOrg;
          const activeProj = useAppStore.getState().activeProj;
          if (!activeOrg || !activeProj) return;
          // updating it's necessary as it's now the visible data we are working with
          if (activeOrg?.id !== selectedOrganization?.id) return;
          setDailyWorkTimes((prevData) => {
            const today = new Date().toISOString().split("T")[0];
            const index = prevData.findIndex((el) => el.day.toISOString().split("T")[0] === today);
            const workTime = useTimerStore.getState().elapsedTime;
            if (index > -1) {
              if (!prevData[index][activeProj.name]) {
                prevData[index][activeProj.name] = 0;
              }
              console.debug("updating work time", prevData[index][activeProj.name], workTime);
              prevData[index][activeProj.name] += workTime;
            } else {
              // @ts-ignore
              const newData: GraphData = { day: new Date(today), [activeProj.name]: workTime };
              return [...prevData, newData];
            }
            return [...prevData];
          });
        }
      }
    );

    return () => {
      timerSubscription();
    };
  }, [selectedOrganization]);

  useEffect(() => {
    if (!selectedOrganization) return;
    GetProjects(selectedOrganization.id).then((projs) => {
      setProjects(projs);
    });
  }, [selectedOrganization]);

  useEffect(() => {
    if (!selectedOrganization) return;
    GetDailyWorkTimeByMonth(selectedYear, selectedMonth, selectedOrganization.id).then((data) => {
      const graphData: GraphData[] = [];
      for (const [day, projs] of Object.entries(data)) {
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
              <Select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value as number)}>
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
                value={selectedOrganization?.name}
                onChange={(event) => {
                  const foundOrg = organizations.find((org) => org.name === event.target.value);
                  if (foundOrg) {
                    setSelectedOrganization(foundOrg);
                  }
                }}
                renderValue={(selected) => <div>{selected}</div>}
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
                scaleType: "utc",
              },
            ]}
            yAxis={[
              {
                scaleType: "linear",
                min: 0,
              },
            ]}
            leftAxis={{
              label: "Total Work Time (s)",
              labelStyle: {
                // transform: "rotate(-90deg) translate(-173px, -238px)",
                // padding: 10,
              },
            }}
            // margin={{ right: 10 }}
            series={projects.map((project, index) => ({
              dataKey: project.name,
              label: project.name,
              color: colors[index],
              valueFormatter: (value) => `${formatTime(value || 0)}`,
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
