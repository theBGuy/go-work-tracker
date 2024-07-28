import { formatTime } from "@/utils/utils";
import { Typography, List, ListItem, ListItemText } from "@mui/material";

interface WorkTimeListingProps {
  title: string;
  orgTotal: number;
  projName: string;
  projTotal: number;
}

const WorkTimeListing: React.FC<WorkTimeListingProps> = ({ title, orgTotal, projName, projTotal }) => {
  return (
    <>
      <Typography variant="h6" component="h2" sx={{ textAlign: "left", marginLeft: (theme) => theme.spacing(2) }}>
        {title}
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary={`Organization: ${formatTime(orgTotal)}`} />
        </ListItem>
        <ListItem>
          <ListItemText primary={`Project (${projName}): ${formatTime(projTotal)}`} />
        </ListItem>
      </List>
    </>
  );
};

export default WorkTimeListing;
