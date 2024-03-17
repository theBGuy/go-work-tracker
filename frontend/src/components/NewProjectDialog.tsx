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

interface NewProjectDialogProps {
  openNewProj: boolean;
  organization: string;
  projects: Model[];
  setSelectedProject: (proj: string) => void;
  setProjects: React.Dispatch<React.SetStateAction<Model[]>>;
  setMonthlyWorkTimes: React.Dispatch<React.SetStateAction<Record<number, Record<string, number>>>>;
  setOpenNewProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  openNewProj,
  organization,
  projects,
  setSelectedProject,
  setProjects,
  setMonthlyWorkTimes,
  setOpenNewProj,
}) => {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Inputs>();
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const { project } = data;
    await NewProject(organization, project);
    await SetProject(project);
    setProjects(projs => [...projs, { Name: project, Favorite: false, UpdatedAt: new Date().toISOString() }]);
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
            error={projects.some((el) => el.Name === newProj)}
            helperText={projects.some((el) => el.Name === newProj) ? 'Project name already exists' : ''}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={!newProj || projects.some((el) => el.Name === newProj)}
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