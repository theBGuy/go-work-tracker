import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { RenameProject } from "@go/main/App";
import { useAppStore } from "../stores/main";

interface EditProjectDialogProps {
  openEditProj: boolean;
  setOpenEditProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ openEditProj, setOpenEditProj }) => {
  const projects = useAppStore((state) => state.projects);
  const setProjects = useAppStore((state) => state.setProjects);
  const organization = useAppStore((state) => state.activeOrg);
  const project = useAppStore((state) => state.activeProj);
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
    if (data.project && data.project !== project?.name) {
      if (!project) return;
      console.debug(`renaming project for ${organization?.name} from ${project?.name} to ${data.project}`);
      const newProj = await RenameProject(project?.id, data.project);
      const index = projects.findIndex((el) => el.id === project.id);
      if (index > -1) {
        projects[index].name = data.project;
        setProjects([...projects]);
      }
      setSelectedProject(newProj);
    }
    reset();
    setOpenEditProj(false);
  };

  return (
    <Dialog open={openEditProj} onClose={() => setOpenEditProj(false)}>
      <DialogTitle>Edit Project ({project?.name})</DialogTitle>
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
