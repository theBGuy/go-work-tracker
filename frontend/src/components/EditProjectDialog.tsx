import React from 'react';
import { useForm, SubmitHandler } from "react-hook-form"

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

import { RenameProject } from '../../wailsjs/go/main/App';

interface EditProjectDialogProps {
  openEditProj: boolean;
  organization: string;
  project: string;
  projects: string[];
  setSelectedProject: (proj: string) => void;
  setProjects: React.Dispatch<React.SetStateAction<string[]>>;
  setOpenEditProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  openEditProj,
  organization,
  project,
  projects,
  setSelectedProject,
  setProjects,
  setOpenEditProj,
}) => {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Inputs>();
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.project && data.project !== project) {
      console.debug(`renaming project for ${organization} from ${project} to ${data.project}`);
      await RenameProject(organization, project, data.project);
      setProjects(prevProjects => {
        const index = prevProjects.indexOf(project);
        if (index > -1) {
          prevProjects[index] = data.project;
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
      <DialogTitle>Edit Project</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            margin="dense"
            id="project"
            label="New Project Name"
            type="text"
            fullWidth
            error={projects.includes(newProj)}
            helperText={projects.includes(newProj) ? 'Project name already exists' : ''}
            {...register("project")}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={!newProj || projects.includes(newProj)}
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