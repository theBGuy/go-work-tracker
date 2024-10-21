import {
  ExportByMonth,
  ExportByYear,
  GetDailyWorkTimeByMonth,
  GetMonthlyWorkTime,
  GetYearlyWorkTime,
} from "@go/main/App";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GetAppIcon from "@mui/icons-material/GetApp";
import {
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Collapse,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import MuiAccordion from "@mui/material/Accordion";
import { styled } from "@mui/system";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import type { main } from "@go/models";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useTimerStore } from "../stores/timer";
import { formatTime, getMonth, months } from "../utils/utils";

enum ExportType {
  CSV = "csv",
  PDF = "pdf",
}

const Accordion = styled(MuiAccordion)(({ theme }) => ({
  "&.Mui-expanded": {
    margin: theme.spacing(5),
  },
}));

const DownloadButton: React.FC<{ type: ExportType; onClick: () => void }> = ({ type, onClick }) => (
  <Tooltip
    title={`Download as ${type.toUpperCase()}`}
    placement="top"
  >
    <Button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {type.toUpperCase()} <GetAppIcon />
    </Button>
  </Tooltip>
);

interface WorkTimeAccordionProps {
  activeOrganization: main.Organization;
  projects: string[];
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const WorkTimeAccordion: React.FC<WorkTimeAccordionProps> = ({ activeOrganization, projects }) => {
  const timerRunning = useTimerStore((state) => state.running);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(getMonth());
  const [yearlyWorkTime, setYearlyWorkTime] = useState(0);
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const [dailyWorkTimes, setDailyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const [dateStart, setDateStart] = useState<Dayjs | null>(null);
  const [dateEnd, setDateEnd] = useState<Dayjs | null>(null);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const years = useMemo(() => Array.from({ length: currentYear - 1999 }, (_, i) => 2000 + i), [currentYear]);
  const firstDayOfMonth = useMemo(() => new Date(selectedYear, selectedMonth - 1, 1), [selectedYear, selectedMonth]);
  const lastDayOfMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0), [selectedYear, selectedMonth]);

  const shownYears = useMemo(() => {
    if (!activeOrganization) return years;
    const createdAt = new Date(activeOrganization.created_at);
    const createdYear = createdAt.getFullYear();
    return Array.from({ length: currentYear - createdYear + 1 }, (_, i) => createdYear + i);
  }, [activeOrganization, years, currentYear]);

  const shownMonths = useMemo(() => {
    if (!activeOrganization) return Object.entries(months);
    const createdAt = new Date(activeOrganization.created_at);
    const createdYear = createdAt.getFullYear();
    const createdMonth = createdAt.getMonth() + 1;
    if (selectedYear === createdYear) {
      return Object.entries(months).filter(([monthNumber]) => Number(monthNumber) >= createdMonth);
    }
    return Object.entries(months);
  }, [activeOrganization, selectedYear]);

  useEffect(() => {
    const monthInList = shownMonths.find(([monthNumber]) => Number(monthNumber) === selectedMonth);
    if (!monthInList) {
      setSelectedMonth(Number(shownMonths[0][0]));
    }
  }, [shownMonths, selectedMonth]);

  /**
   * Get the yearly and monthly work times when the app loads
   * This is used to display the yearly and monthly totals in the dropdown table
   * It updates if the user switches organizations or current display year
   */

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    GetYearlyWorkTime(selectedYear, activeOrganization.id).then(setYearlyWorkTime);
    GetMonthlyWorkTime(selectedYear, activeOrganization.id).then(setMonthlyWorkTimes);
  }, [selectedYear, activeOrganization, timerRunning, projects]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    GetDailyWorkTimeByMonth(selectedYear, selectedMonth, activeOrganization.id).then(setDailyWorkTimes);
  }, [selectedYear, activeOrganization, selectedMonth, timerRunning]);

  const exportYearly = (type: ExportType) => {
    ExportByYear(type, activeOrganization.name, selectedYear)
      .then((path) => {
        toast.success(
          <div>
            <strong>Yearly {type.toUpperCase()} export complete!</strong> <br />
            <strong>Path copied to clipboard</strong> <br />
            File saved to {path}
          </div>,
        );
      })
      .catch((err) => {
        toast.error(
          <div>
            <strong>Yearly {type.toUpperCase()} export failed!</strong> <br />
            {err}
          </div>,
        );
      });
  };

  const exportMonthly = (type: ExportType, month: number) => {
    ExportByMonth(type, activeOrganization.name, selectedYear, month)
      .then((path) => {
        toast.success(
          <div>
            <strong>Monthly {type.toUpperCase()} export complete!</strong> <br />
            <strong>Path copied to clipboard</strong> <br />
            File saved to {path}
          </div>,
        );
      })
      .catch((err) => {
        toast.error(
          <div>
            <strong>Monthly {type.toUpperCase()} export failed!</strong> <br />
            {err}
          </div>,
        );
      });
  };

  const filteredWorkTimes = useMemo(() => {
    if (!dateStart && !dateEnd) return dailyWorkTimes;
    const filtered: Record<string, Record<string, number>> = {};
    for (const [day, workTimes] of Object.entries(dailyWorkTimes)) {
      const date = new Date(day);
      if (
        date >= (dateStart ? dateStart.toDate() : firstDayOfMonth) &&
        date <= (dateEnd ? dateEnd.toDate() : lastDayOfMonth)
      ) {
        filtered[day] = workTimes;
      }
    }
    return filtered;
  }, [dateStart, dateEnd, dailyWorkTimes, firstDayOfMonth, lastDayOfMonth]);

  const totalFilteredWorkTime = useMemo(() => {
    return Object.values(filteredWorkTimes).reduce((total, workTimes) => {
      return total + Object.values(workTimes).reduce((dayTotal, workTime) => dayTotal + workTime, 0);
    }, 0);
  }, [filteredWorkTimes]);

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(3);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const handleRowClick = (day: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  return (
    <Accordion sx={{ margin: 5, minWidth: 600, alignItems: "left" }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1a-content"
        id="panel1a-header"
      >
        <FormControl
          sx={{ minWidth: 90 }}
          size="small"
        >
          <Select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value as number)}
            onClick={(event) => event.stopPropagation()}
          >
            {shownYears.map((year) => (
              <MenuItem
                key={year}
                value={year}
              >
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1, alignSelf: "center" }}>
          Total Work Time for {selectedYear} ({formatTime(yearlyWorkTime)})
        </Box>
        <Box sx={{ display: "flex", flexDirection: "row", marginRight: 1 }}>
          <DownloadButton
            type={ExportType.PDF}
            onClick={() => exportYearly(ExportType.PDF)}
          />
          <DownloadButton
            type={ExportType.CSV}
            onClick={() => exportYearly(ExportType.CSV)}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="left">
                  <FormControl
                    sx={{ minWidth: 120 }}
                    size="small"
                  >
                    <Select
                      labelId="month-select-label"
                      id="month-select"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value as number)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {shownMonths.map(([monthNumber, monthName]) => (
                        <MenuItem
                          key={Number(monthNumber)}
                          value={Number(monthNumber)}
                        >
                          {monthName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Tabs
                    value={tab}
                    onChange={handleChange}
                    aria-label="basic tabs example"
                  >
                    <Tab
                      label="Month Breakdown"
                      {...a11yProps(0)}
                    />
                    <Tab
                      label="Daily View"
                      {...a11yProps(1)}
                    />
                  </Tabs>
                </TableCell>
                <TableCell align="center">Work Time</TableCell>
                <TableCell align="center">Export</TableCell>
              </TableRow>
            </TableHead>

            {tab === 0 && (
              <TableBody>
                {Object.entries(monthlyWorkTimes)
                  .filter(([month]) => Number(month) === selectedMonth)
                  .map(([month, projectWorkTimes], index) => (
                    <React.Fragment key={month}>
                      <TableRow>
                        <TableCell
                          component="th"
                          scope="row"
                          align="left"
                        >
                          MONTH TOTAL
                        </TableCell>
                        <TableCell align="right" />
                        <TableCell align="center">
                          {formatTime(Object.values(projectWorkTimes).reduce((a, b) => a + b, 0))}
                        </TableCell>
                        <TableCell align="center">
                          <DownloadButton
                            type={ExportType.PDF}
                            onClick={() => exportMonthly(ExportType.PDF, Number(month))}
                          />
                          <DownloadButton
                            type={ExportType.CSV}
                            onClick={() => exportMonthly(ExportType.CSV, Number(month))}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={6}
                        >
                          <Collapse
                            in={true}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box margin={1}>
                              <Typography
                                variant="h6"
                                gutterBottom
                                component="div"
                              >
                                Project Breakdown
                              </Typography>
                              <Table
                                size="small"
                                aria-label="purchases"
                              >
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Project</TableCell>
                                    <TableCell align="right">Work Time</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {Object.entries(projectWorkTimes).map(([project, workTime], index) => (
                                    <TableRow key={project}>
                                      <TableCell
                                        component="th"
                                        scope="row"
                                      >
                                        {project}
                                      </TableCell>
                                      <TableCell align="right">{formatTime(workTime)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
              </TableBody>
            )}

            {tab === 1 && (
              <TableBody>
                {Object.entries(monthlyWorkTimes)
                  .filter(([month]) => Number(month) === selectedMonth)
                  .map(([month, projectWorkTimes], index) => (
                    <React.Fragment key={month}>
                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={6}
                        >
                          <Collapse
                            in={true}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box margin={1}>
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Box>
                                  <Typography
                                    variant="h6"
                                    gutterBottom
                                  >
                                    Total Work Time in Date Range: {formatTime(totalFilteredWorkTime)}
                                  </Typography>
                                  <DatePicker
                                    label="Start Date"
                                    value={dateStart}
                                    minDate={dayjs(firstDayOfMonth)}
                                    maxDate={dayjs(lastDayOfMonth)}
                                    onChange={setDateStart}
                                  />
                                  <DatePicker
                                    label="End Date"
                                    value={dateEnd}
                                    minDate={dayjs(firstDayOfMonth)}
                                    maxDate={dayjs(lastDayOfMonth)}
                                    onChange={setDateEnd}
                                  />
                                </Box>
                              </LocalizationProvider>
                              <TableContainer component={Paper}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Day</TableCell>
                                      <TableCell align="right">Work Time</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {Object.entries(filteredWorkTimes)
                                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                      .map(([day, workTimes]) => (
                                        <React.Fragment key={day}>
                                          <TableRow
                                            onClick={() => handleRowClick(day)}
                                            hover
                                          >
                                            <TableCell
                                              component="th"
                                              scope="row"
                                            >
                                              {day}
                                            </TableCell>
                                            <TableCell align="right">
                                              {formatTime(Object.values(workTimes).reduce((a, b) => a + b, 0))}
                                            </TableCell>
                                          </TableRow>
                                          <TableRow>
                                            <TableCell
                                              style={{ paddingBottom: 0, paddingTop: 0 }}
                                              colSpan={6}
                                            >
                                              <Collapse
                                                in={expandedRows[day]}
                                                timeout="auto"
                                                unmountOnExit
                                              >
                                                <Box margin={1}>
                                                  <Typography
                                                    variant="h6"
                                                    gutterBottom
                                                    component="div"
                                                  >
                                                    Project Breakdown
                                                  </Typography>
                                                  <Table
                                                    size="small"
                                                    aria-label="purchases"
                                                  >
                                                    <TableHead>
                                                      <TableRow>
                                                        <TableCell>Project</TableCell>
                                                        <TableCell align="right">Work Time</TableCell>
                                                      </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                      {Object.entries(workTimes).map(([project, workTime]) => (
                                                        <TableRow key={project}>
                                                          <TableCell
                                                            component="th"
                                                            scope="row"
                                                          >
                                                            {project}
                                                          </TableCell>
                                                          <TableCell align="right">{formatTime(workTime)}</TableCell>
                                                        </TableRow>
                                                      ))}
                                                    </TableBody>
                                                  </Table>
                                                </Box>
                                              </Collapse>
                                            </TableCell>
                                          </TableRow>
                                        </React.Fragment>
                                      ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>

        {tab === 1 && (
          <TablePagination
            rowsPerPageOptions={[3, 5, 10, 25]}
            component="div"
            count={Object.keys(filteredWorkTimes).length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default WorkTimeAccordion;
