import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { RenameProject } from "../../wailsjs/go/main/App";
import { useAppStore } from "../stores/main";

interface EditProjectDialogProps {
  openEditProj: boolean;
  setOpenEditProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ openEditProj, setOpenEditProj }) => {
  const [projects, setProjects, organization, project, setSelectedProject] = useAppStore((state) => [
    state.projects,
    state.setProjects,
    state.selectedOrganization,
    state.selectedProject,
    state.setSelectedProject,
  ]);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.project && data.project !== project) {
      console.debug(`renaming project for ${organization} from ${project} to ${data.project}`);
      await RenameProject(organization, project, data.project);
      const index = projects.findIndex((el) => el.name === project);
      if (index > -1) {
        projects[index].name = data.project;
        setProjects([...projects]);
      }
      setSelectedProject(data.project);
    }
    reset();
    setOpenEditProj(false);
  };

  return (
    <Dialog open={openEditProj} onClose={() => setOpenEditProj(false)}>
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
            helperText={projects.some((el) => el.name === newProj) ? "Project name already exists" : ""}
            {...register("project")}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" disabled={!newProj || projects.some((el) => el.name === newProj)}>
            Save
          </Button>
          <Button color="error" onClick={() => setOpenEditProj(false)}>
            Close
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditProjectDialog;
