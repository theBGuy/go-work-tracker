import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

interface NewOrganizationDialogProps {
  openNewOrg: boolean;
  handleDialogClose: (close: boolean) => void;
  newOrganization: string;
  setNewOrganization: (org: string) => void;
  newProject: string;
  setNewProject: (proj: string) => void;
  organizations: string[];
}

const NewOrganizationDialog: React.FC<NewOrganizationDialogProps> = ({ openNewOrg, handleDialogClose, newOrganization, setNewOrganization, newProject, setNewProject, organizations }) => {
  return (
    <Dialog
      disableEscapeKeyDown
      open={openNewOrg}
      onClose={() => handleDialogClose(true)}
    >
      <DialogTitle>Add New Organization</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter the name of the new organization.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Organization Name"
          type="text"
          fullWidth
          value={newOrganization}
          onChange={(event) => setNewOrganization(event.target.value)}
        />
        <br />
        <DialogContentText>
          Please enter the name of the new project.
        </DialogContentText>
        <TextField
          margin="dense"
          id="name"
          label="Project Name"
          type="text"
          fullWidth
          value={newProject}
          onChange={(event) => setNewProject(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleDialogClose(false)}>Confirm</Button>
        {organizations.length >= 1 && (
          <Button onClick={() => handleDialogClose(true)} color='error'>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NewOrganizationDialog;