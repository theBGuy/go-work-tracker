import { useForm, SubmitHandler } from "react-hook-form"
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { NewOrganization } from '../../wailsjs/go/main/App';

interface NewOrganizationDialogProps {
  openNewOrg: boolean;
  organizations: string[];
  projects: string[];
  setSelectedOrganization: (org: string) => void;
  setSelectedProject: (proj: string) => void;
  setOrganizations: React.Dispatch<React.SetStateAction<string[]>>;
  setProjects: React.Dispatch<React.SetStateAction<string[]>>;
  setOpenNewOrg: (value: boolean) => void;
}

type Inputs = {
  organization: string;
  project: string;
};

const NewOrganizationDialog: React.FC<NewOrganizationDialogProps> = ({
  openNewOrg,
  organizations,
  projects,
  setSelectedOrganization,
  setSelectedProject,
  setOrganizations,
  setProjects,
  setOpenNewOrg,
}) => {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Inputs>();
  const newOrg = watch("organization");
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const { organization, project } = data;
    await NewOrganization(organization, project);
    setOrganizations(orgs => [...orgs, organization]);
    setProjects(projs => [...projs, project]);
    setSelectedOrganization(organization);
    setSelectedProject(project);
    setOpenNewOrg(false);
    reset();
  };
  
  return (
    <Dialog
      disableEscapeKeyDown
      open={openNewOrg}
      onClose={() => setOpenNewOrg(false)}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
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
            error={organizations.includes(newOrg)}
            helperText={organizations.includes(newOrg) ? 'Project name already exists' : ''}
            {...register("organization", { required: true })}
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
            error={projects.includes(newProj)}
            helperText={projects.includes(newProj) ? 'Project name already exists' : ''}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit">Confirm</Button>
          {organizations.length >= 1 && (
            <Button
              onClick={() => setOpenNewOrg(false)}
              color='error'>Close</Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewOrganizationDialog;