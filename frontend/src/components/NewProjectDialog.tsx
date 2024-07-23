import { useForm, SubmitHandler } from "react-hook-form"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import { NewProject, SetProject } from '../../wailsjs/go/main/App';
import { getMonth, Model } from "../utils/utils";
import { main } from "../../wailsjs/go/models";
import { useStore } from "../stores/main";

interface NewProjectDialogProps {
  openNewProj: boolean;
  organization: string;
  setSelectedProject: (proj: string) => void;
  setMonthlyWorkTimes: React.Dispatch<React.SetStateAction<Record<number, Record<string, number>>>>;
  setOpenNewProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  openNewProj,
  organization,
  setSelectedProject,
  setMonthlyWorkTimes,
  setOpenNewProj,
}) => {
  const [projects, addProject] = useStore((state) => [state.projects, state.addProject]);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Inputs>();
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const { project } = data;
    await NewProject(organization, project);
    await SetProject(project);
    addProject(new main.Project({ name: project, favorite: false, updated_at: new Date().toISOString() }));
    setSelectedProject(project);
    setMonthlyWorkTimes(prev => {
      prev[getMonth()][project] = 0;
      return { ...prev };
    });
    setOpenNewProj(false);
    reset();
  };
  
  return (
    <Dialog
      disableEscapeKeyDown
      open={openNewProj}
      onClose={() => setOpenNewProj(false)}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Add New Project for {organization}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the name of the new project.
          </DialogContentText>
          <TextField
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            error={projects.some((el) => el.name === newProj)}
            helperText={projects.some((el) => el.name === newProj) ? 'Project name already exists' : ''}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={!newProj || projects.some((el) => el.name === newProj)}
          >
            Confirm
          </Button>
          <Button
            onClick={() => setOpenNewProj(false)}
            color='error'>
            Close
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewProjectDialog;