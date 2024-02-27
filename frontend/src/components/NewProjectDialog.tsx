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

interface NewProjectDialogProps {
  openNewProj: boolean;
  organization: string;
  projects: string[];
  setSelectedProject: (proj: string) => void;
  setProjects: React.Dispatch<React.SetStateAction<string[]>>;
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
    setProjects(projs => [...projs, project]);
    setSelectedProject(project);
    setMonthlyWorkTimes(prev => {
      const currMonth = new Date().getMonth();
      prev[currMonth][project] = 0;
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
            error={projects.includes(newProj)}
            helperText={projects.includes(newProj) ? 'Project name already exists' : ''}
            {...register("project", { required: true })}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={!newProj || projects.includes(newProj)}
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