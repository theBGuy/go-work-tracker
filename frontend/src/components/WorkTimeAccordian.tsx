// WorkTimeAccordion.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Accordion, AccordionSummary, Typography, Button, Select, MenuItem, AccordionDetails, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {
  GetYearlyWorkTime,
  GetMonthlyWorkTime,
  ExportCSVByYear,
  ExportCSVByMonth
} from '../../wailsjs/go/main/App';

interface WorkTimeAccordionProps {
  timerRunning: boolean;
  selectedOrganization: string;
  months: string[];
  formatTime: (time: number) => string;
}

const WorkTimeAccordion: React.FC<WorkTimeAccordionProps> = ({
  timerRunning,
  selectedOrganization,
  months,
  formatTime,
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyWorkTime, setYearlyWorkTime] = useState(0);
  const [monthlyWorkTimes, setMonthlyWorkTimes] = useState<number[]>([]);
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
  }, [selectedYear, selectedOrganization, timerRunning]);

  const exportYearlyCSV = () => {
    ExportCSVByYear(selectedOrganization, selectedYear).then((path) => {
      toast.success("Yearly CSV export complete! File saved to " + path);
    });
  };
  
  const exportMonthlyCSV = (month: number) => {
    ExportCSVByMonth(selectedOrganization, selectedYear, month).then((path) => {
      toast.success("Monthly CSV export complete! File saved to " + path);
    });
  };

  return (
    <Accordion>
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
        <Button onClick={exportYearlyCSV}>Export Yearly CSV</Button>
      </AccordionSummary>
      <AccordionDetails>
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
                {monthlyWorkTimes.map((workTime, index) => (
                  <TableRow key={index}>
                    <TableCell component="th" scope="row">{months[index]}</TableCell>
                    <TableCell align="right">{formatTime(workTime)}</TableCell>
                    <TableCell align="right">
                      <Button onClick={() => exportMonthlyCSV(index + 1)}>Export Monthly CSV</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
};

export default WorkTimeAccordion;