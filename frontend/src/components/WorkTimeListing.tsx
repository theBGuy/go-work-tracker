import { formatTime } from "@/utils/utils";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";

interface WorkTimeListingProps {
  title: string;
  orgTotal: number;
  projTotal: number;
}

const WorkTimeListing: React.FC<WorkTimeListingProps> = ({ title, orgTotal, projTotal }) => {
  return (
    <Paper sx={{ borderRadius: 2, marginX: 1 }}>
      <Typography variant="h6" component="h2" sx={{ textAlign: "left", marginLeft: (theme) => theme.spacing(2) }}>
        {title}
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary={`Organization: ${formatTime(orgTotal)}`} />
        </ListItem>
        <ListItem>
          <ListItemText primary={`Project: ${formatTime(projTotal)}`} />
        </ListItem>
      </List>
    </Paper>
  );
};

export default WorkTimeListing;
