import { useForm, SubmitHandler } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { NewOrganization, SetOrganization } from "../../wailsjs/go/main/App";
import { useAppStore } from "../stores/main";
import { main } from "../../wailsjs/go/models";

interface NewOrganizationDialogProps {
  openNewOrg: boolean;
  setOpenNewOrg: (value: boolean) => void;
}

type Inputs = {
  organization: string;
  project: string;
};

const NewOrganizationDialog: React.FC<NewOrganizationDialogProps> = ({ openNewOrg, setOpenNewOrg }) => {
  const [organizations, addOrganization, addProject, setSelectedOrganization, setSelectedProject] = useAppStore(
    (state) => [
      state.organizations,
      state.addOrganization,
      state.addProject,
      state.setSelectedOrganization,
      state.setSelectedProject,
    ]
  );
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const newOrg = watch("organization");
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const { organization, project } = data;
    await NewOrganization(organization, project);
    await SetOrganization(organization, project);
    addOrganization(
      new main.Organization({ name: organization, favorite: false, updated_at: new Date().toISOString() })
    );
    addProject(new main.Project({ name: project, favorite: false, updated_at: new Date().toISOString() }));
    setSelectedOrganization(organization);
    setSelectedProject(project);
    setOpenNewOrg(false);
    reset();
  };

  return (
    <Dialog disableEscapeKeyDown open={openNewOrg} onClose={() => setOpenNewOrg(false)}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Add New Organization</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the name of the new organization.</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Organization Name"
            type="text"
            fullWidth
            error={organizations.some((el) => el.name === newOrg)}
            helperText={organizations.some((el) => el.name === newOrg) ? "Project name already exists" : ""}
            {...register("organization", { required: true })}
          />
          <br />
          <DialogContentText>Please enter the name of the new project.</DialogContentText>
          <TextField
            margin="dense"
            id="project"
            label="Project Name"
            type="text"
            fullWidth
            helperText={errors.project ? "This field is required" : ""}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" disabled={!newOrg || !newProj || organizations.some((el) => el.name === newOrg)}>
            Confirm
          </Button>
          {organizations.length >= 1 && (
            <Button onClick={() => setOpenNewOrg(false)} color="error">
              Close
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewOrganizationDialog;
