// WorkTimeAccordion.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  AccordionSummary,
  Typography,
  Button,
  Select,
  MenuItem,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Collapse,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GetAppIcon from '@mui/icons-material/GetApp';

import { styled } from '@mui/system';
import MuiAccordion from '@mui/material/Accordion';

const Accordion = styled(MuiAccordion)(({ theme }) => ({
  '&.Mui-expanded': {
    margin: theme.spacing(5),
  },
}));

import {
  GetYearlyWorkTime,
  GetMonthlyWorkTime,
  ExportByYear,
  ExportByMonth
} from '../../wailsjs/go/main/App';

import { months, formatTime } from '../utils/utils';

interface WorkTimeAccordionProps {
  timerRunning: boolean;
  selectedOrganization: string;
  projects: string[];
}

enum ExportType {
  CSV = "csv",
  PDF = "pdf",
}

const DownloadButton: React.FC<{ type: ExportType, onClick: () => void }> = ({ type, onClick }) => (
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

const WorkTimeAccordion: React.FC<WorkTimeAccordionProps> = ({
  timerRunning,
  selectedOrganization,
  projects,
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyWorkTime, setYearlyWorkTime] = useState(0);
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<Record<number, Record<string, number>>>({});
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: currentYear - 1999}, (_, i) => 2000 + i);

  /**
   * Get the yearly and monthly work times when the app loads
   * This is used to display the yearly and monthly totals in the dropdown table
   * It updates if the user switches organizations or current display year
   */
  useEffect(() => {
    GetYearlyWorkTime(selectedYear, selectedOrganization)
      .then(setYearlyWorkTime);
    GetMonthlyWorkTime(selectedYear, selectedOrganization)
      .then(setMonthlyWorkTimes);
  }, [selectedYear, selectedOrganization, timerRunning, projects]);

  const exportYearly = (type: ExportType) => {
    ExportByYear(type, selectedOrganization, selectedYear).then((path) => {
      toast.success(
        <div>
          <strong>Yearly {type.toUpperCase()}  export complete!</strong> <br />
          <strong>Path copied to clipboard</strong> <br />
          File saved to {path}
        </div>
      );
    }).catch((err) => {
      toast.error(
        <div>
          <strong>Yearly {type.toUpperCase()}  export failed!</strong> <br />
          {err}
        </div>
      );
    });
  };
  
  const exportMonthly = (type: ExportType, month: number) => {
    ExportByMonth(type, selectedOrganization, selectedYear, month).then((path) => {
      toast.success(
        <div>
          <strong>Monthly {type.toUpperCase()} export complete!</strong> <br />
          <strong>Path copied to clipboard</strong> <br />
          File saved to {path}
        </div>
      );
    }).catch((err) => {
      toast.error(
        <div>
          <strong>Monthly {type.toUpperCase()} export failed!</strong> <br />
          {err}
        </div>
      );
    });
  };

  return (
    <Accordion sx={{ margin: 5, minWidth: 600 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1a-content"
        id="panel1a-header"
      >
        <Select
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value as number)}
          onClick={(event) => event.stopPropagation()}
        >
          {years.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </Select>
        <Typography mt={2} sx={{ flexGrow: 1 }}>
          Total Work Time: {formatTime(yearlyWorkTime)}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', marginRight: 1 }}>
          <DownloadButton type={ExportType.PDF} onClick={() => exportYearly(ExportType.PDF)} />
          <DownloadButton type={ExportType.CSV} onClick={() => exportYearly(ExportType.CSV)} />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ margin: (theme) => `${theme.spacing(5)}px !important` }}>
        <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Work Time</TableCell>
                  <TableCell align="right">Export</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(monthlyWorkTimes).map(([month, projectWorkTimes], index) => (
                  <React.Fragment key={index}>
                    <TableRow>
                      <TableCell component="th" scope="row">{months[Number(month)]}</TableCell>
                      <TableCell align="right">
                        {formatTime(Object.values(projectWorkTimes).reduce((a, b) => a + b, 0))}
                      </TableCell>
                      <TableCell align="right">
                        <DownloadButton type={ExportType.PDF} onClick={() => exportMonthly(ExportType.PDF, Number(month))} />
                        <DownloadButton type={ExportType.CSV} onClick={() => exportMonthly(ExportType.CSV, Number(month))} />
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
                                    <TableCell component="th" scope="row">{project}</TableCell>
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