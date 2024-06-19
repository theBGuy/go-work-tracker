import React from 'react';
import { useForm, SubmitHandler } from "react-hook-form"
import { useGlobal } from '../providers/global';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { RenameProject } from '../../wailsjs/go/main/App';

interface EditProjectDialogProps {
  openEditProj: boolean;
  organization: string;
  project: string;
  setSelectedProject: (proj: string) => void;
  setOpenEditProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  openEditProj,
  organization,
  project,
  setSelectedProject,
  setOpenEditProj,
}) => {
  const { projects, setProjects } = useGlobal();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Inputs>();
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.project && data.project !== project) {
      console.debug(`renaming project for ${organization} from ${project} to ${data.project}`);
      await RenameProject(organization, project, data.project);
      setProjects(prevProjects => {
        const index = prevProjects.findIndex((el) => el.name === project)
        if (index > -1) {
          prevProjects[index].name = data.project;
          return [...prevProjects];
        }
        return prevProjects;
      });
      setSelectedProject(data.project);
    }
    reset();
    setOpenEditProj(false);
  };

  return (
    <Dialog
      open={openEditProj}
      onClose={() => setOpenEditProj(false)}
    >
      <DialogTitle>Edit Project ({project})</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            margin="dense"
            id="project"
            label="New Project Name"
            type="text"
            fullWidth
            error={projects.some((el) => el.name === newProj)}
            helperText={projects.some((el) => el.name === newProj) ? 'Project name already exists' : ''}
            {...register("project")}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={!newProj || projects.some((el) => el.name === newProj)}
          >
            Save
          </Button>
          <Button color='error' onClick={() => setOpenEditProj(false)}>
            Close
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditProjectDialog;