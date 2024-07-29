import { RenameProject } from "@go/main/App";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppStore } from "../stores/main";

interface EditProjectDialogProps {
  openEditProj: boolean;
  projID: number;
  setOpenEditProj: (value: boolean) => void;
}

type Inputs = {
  project: string;
};

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ openEditProj, setOpenEditProj, projID }) => {
  const projects = useAppStore((state) => state.projects);
  const setProjects = useAppStore((state) => state.setProjects);
  const organization = useAppStore((state) => state.activeOrg);
  const activeProj = useAppStore((state) => state.activeProj);
  const project = projects.find((el) => el.id === projID);
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
    if (!project) return;
    if (data.project && data.project !== project?.name) {
      if (!project) return;
      console.debug(`renaming project for ${organization?.name} from ${project?.name} to ${data.project}`);
      const newProj = await RenameProject(projID, data.project);
      const index = projects.findIndex((el) => el.id === projID);
      if (index > -1) {
        projects[index].name = data.project;
        setProjects([...projects]);
      }
      if (activeProj?.id === projID) {
        setSelectedProject(newProj);
      }
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
