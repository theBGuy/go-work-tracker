import { useForm, SubmitHandler } from "react-hook-form"
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { NewOrganization, SetOrganization } from '../../wailsjs/go/main/App';
import { Model } from "../utils/utils";

interface NewOrganizationDialogProps {
  openNewOrg: boolean;
  organizations: Model[];
  setSelectedOrganization: (org: string) => void;
  setSelectedProject: (proj: string) => void;
  setOrganizations: React.Dispatch<React.SetStateAction<Model[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Model[]>>;
  setOpenNewOrg: (value: boolean) => void;
}

type Inputs = {
  organization: string;
  project: string;
};

const NewOrganizationDialog: React.FC<NewOrganizationDialogProps> = ({
  openNewOrg,
  organizations,
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
    await SetOrganization(organization, project);
    setOrganizations(orgs => [...orgs, { Name: organization, Favorite: false, UpdatedAt: new Date().toISOString() }]);
    setProjects(projs => [...projs, { Name: project, Favorite: false, UpdatedAt: new Date().toISOString() }]);
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
            error={organizations.some((el) => el.Name === newOrg)}
            helperText={organizations.some((el) => el.Name === newOrg) ? 'Project name already exists' : ''}
            {...register("organization", { required: true })}
          />
          <br />
          <DialogContentText>
            Please enter the name of the new project.
          </DialogContentText>
          <TextField
            margin="dense"
            id="project"
            label="Project Name"
            type="text"
            fullWidth
            helperText={errors.project ? 'This field is required' : ''}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={
              !newOrg
              || !newProj
              || organizations.some((el) => el.Name === newOrg)
            }>
            Confirm
          </Button>
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