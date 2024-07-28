import { useForm, SubmitHandler } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { NewOrganization, SetOrganization } from "@go/main/App";
import { useAppStore } from "../stores/main";

interface NewOrganizationDialogProps {
  openNewOrg: boolean;
  setOpenNewOrg: (value: boolean) => void;
}

type Inputs = {
  orgName: string;
  projName: string;
};

const NewOrganizationDialog: React.FC<NewOrganizationDialogProps> = ({ openNewOrg, setOpenNewOrg }) => {
  const organizations = useAppStore((state) => state.organizations);
  const addOrganization = useAppStore((state) => state.addOrganization);
  const addProject = useAppStore((state) => state.addProject);
  const setSelectedOrganization = useAppStore((state) => state.setActiveOrganization);
  const setSelectedProject = useAppStore((state) => state.setActiveProject);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const newOrg = watch("orgName");
  const newProj = watch("projName");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const { orgName, projName } = data;
    const { organization, project } = await NewOrganization(orgName, projName);
    await SetOrganization(orgName, projName);
    addOrganization(organization);
    addProject(project);
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
            {...register("orgName", { required: true })}
          />
          <br />
          <DialogContentText>Please enter the name of the new project.</DialogContentText>
          <TextField
            margin="dense"
            id="project"
            label="Project Name"
            type="text"
            fullWidth
            helperText={errors.projName ? "This field is required" : ""}
            {...register("projName", { required: true })}
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
