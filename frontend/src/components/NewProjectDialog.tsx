import { useForm, SubmitHandler } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { NewProject, SetProject } from "@go/main/App";
import { useAppStore } from "../stores/main";

interface NewProjectDialogProps {
  openNewProj: boolean;
  setMonthWorkTimes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setOpenNewProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ openNewProj, setMonthWorkTimes, setOpenNewProj }) => {
  const projects = useAppStore((state) => state.projects);
  const addProject = useAppStore((state) => state.addProject);
  const organization = useAppStore((state) => state.activeOrg);
  const setSelectedProject = useAppStore((state) => state.setActiveProject);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const project = await NewProject(organization?.name || "", data.project);
      await SetProject(project);
      addProject(project);
      setSelectedProject(project);
      setMonthWorkTimes((prev) => {
        prev[project.name] = 0;
        return { ...prev };
      });
      setOpenNewProj(false);
      reset();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog disableEscapeKeyDown open={openNewProj} onClose={() => setOpenNewProj(false)}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Add New Project for {organization?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the name of the new project.</DialogContentText>
          <TextField
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            error={projects.some((el) => el.name === newProj)}
            helperText={projects.some((el) => el.name === newProj) ? "Project name already exists" : ""}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" disabled={!newProj || projects.some((el) => el.name === newProj)}>
            Confirm
          </Button>
          <Button onClick={() => setOpenNewProj(false)} color="error">
            Close
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewProjectDialog;
