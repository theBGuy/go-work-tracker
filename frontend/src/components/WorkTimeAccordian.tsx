import { ExportByMonth, ExportByYear, GetMonthlyWorkTime, GetYearlyWorkTime } from "@go/main/App";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import MuiAccordion from "@mui/material/Accordion";
import { styled } from "@mui/system";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { main } from "@go/models";
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
  <Tooltip title={`Download as ${type.toUpperCase()}`} placement="top">
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

const WorkTimeAccordion: React.FC<WorkTimeAccordionProps> = ({ activeOrganization, projects }) => {
  const timerRunning = useTimerStore((state) => state.running);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(getMonth());
  const [yearlyWorkTime, setYearlyWorkTime] = useState(0);
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 }, (_, i) => 2000 + i);
  const shownYears = useMemo(() => {
    if (!activeOrganization) return years;
    const createdAt = new Date(activeOrganization.created_at);
    const createdYear = createdAt.getFullYear();
    return Array.from({ length: currentYear - createdYear + 1 }, (_, i) => createdYear + i);
  }, [activeOrganization]);
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
  }, [shownMonths]);

  /**
   * Get the yearly and monthly work times when the app loads
   * This is used to display the yearly and monthly totals in the dropdown table
   * It updates if the user switches organizations or current display year
   */
  useEffect(() => {
    GetYearlyWorkTime(selectedYear, activeOrganization.id).then(setYearlyWorkTime);
    GetMonthlyWorkTime(selectedYear, activeOrganization.id).then(setMonthlyWorkTimes);
  }, [selectedYear, activeOrganization, timerRunning, projects]);

  const exportYearly = (type: ExportType) => {
    ExportByYear(type, activeOrganization.name, selectedYear)
      .then((path) => {
        toast.success(
          <div>
            <strong>Yearly {type.toUpperCase()} export complete!</strong> <br />
            <strong>Path copied to clipboard</strong> <br />
            File saved to {path}
          </div>
        );
      })
      .catch((err) => {
        toast.error(
          <div>
            <strong>Yearly {type.toUpperCase()} export failed!</strong> <br />
            {err}
          </div>
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
          </div>
        );
      })
      .catch((err) => {
        toast.error(
          <div>
            <strong>Monthly {type.toUpperCase()} export failed!</strong> <br />
            {err}
          </div>
        );
      });
  };

  return (
    <Accordion sx={{ margin: 5, minWidth: 600, alignItems: "left" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
        <FormControl sx={{ minWidth: 90 }} size="small">
          <Select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value as number)}
            onClick={(event) => event.stopPropagation()}
          >
            {shownYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography mt={1} sx={{ flexGrow: 1 }}>
          Total Work Time: {formatTime(yearlyWorkTime)}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "row", marginRight: 1 }}>
          <DownloadButton type={ExportType.PDF} onClick={() => exportYearly(ExportType.PDF)} />
          <DownloadButton type={ExportType.CSV} onClick={() => exportYearly(ExportType.CSV)} />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ margin: (theme) => `${theme.spacing(5)}px !important` }}>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <FormControl sx={{ minWidth: 120 }} size="small">
                    <Select
                      labelId="month-select-label"
                      id="month-select"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value as number)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {shownMonths.map(([monthNumber, monthName]) => (
                        <MenuItem key={Number(monthNumber)} value={Number(monthNumber)}>
                          {monthName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">Work Time</TableCell>
                <TableCell align="right">Export</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(monthlyWorkTimes)
                .filter(([month]) => Number(month) === selectedMonth)
                .map(([month, projectWorkTimes], index) => (
                  <React.Fragment key={index}>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        MONTH TOTAL
                      </TableCell>
                      <TableCell align="right">
                        {formatTime(Object.values(projectWorkTimes).reduce((a, b) => a + b, 0))}
                      </TableCell>
                      <TableCell align="right">
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
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={true} timeout="auto" unmountOnExit>
                          <Box margin={1}>
                            <Typography variant="h6" gutterBottom component="div">
                              Project Breakdown
                            </Typography>
                            <Table size="small" aria-label="purchases">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Project</TableCell>
                                  <TableCell align="right">Work Time</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(projectWorkTimes).map(([project, workTime], index) => (
                                  <TableRow key={index}>
                                    <TableCell component="th" scope="row">
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
      </AccordionDetails>
    </Accordion>
  );
};

export default WorkTimeAccordion;
