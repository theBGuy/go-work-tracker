import React from 'react';
import { useForm, SubmitHandler } from "react-hook-form"

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

import { RenameOrganization, RenameProject } from '../../wailsjs/go/main/App';

import { Model } from "../utils/utils";

interface EditOrganizationDialogProps {
  openEditOrg: boolean;
  organization: string;
  organizations: Model[];
  project: string;
  projects: Model[];
  setSelectedOrganization: (org: string) => void;
  setSelectedProject: (proj: string) => void;
  setOrganizations: React.Dispatch<React.SetStateAction<Model[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Model[]>>;
  setOpenEditOrg: (value: boolean) => void;
}

type Inputs = {
  organization: string;
  project: string;
};

const EditOrganizationDialog: React.FC<EditOrganizationDialogProps> = ({
  openEditOrg,
  organization,
  organizations,
  project,
  projects,
  setSelectedOrganization,
  setSelectedProject,
  setOrganizations,
  setProjects,
  setOpenEditOrg,
}) => {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Inputs>();
  const newOrg = watch("organization");
  const newProj = watch("project");
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.project && data.project !== project) {
      console.debug(`renaming project for ${organization} from ${project} to ${data.project}`);
      await RenameProject(organization, project, data.project);
      setProjects(prevProjects => {
        const index = prevProjects.findIndex((el) => el.name === project);
        if (index > -1) {
          prevProjects[index].name = data.project;
          return [...prevProjects];
        }
        return prevProjects;
      });
      setSelectedProject(data.project);
    }
    if (data.organization && data.organization !== organization) {
      await RenameOrganization(organization, data.organization);
      setOrganizations(prevOrgs => {
        const index = prevOrgs.findIndex((el) => el.name === organization);
        if (index > -1) {
          prevOrgs[index].name = data.organization;
          return [...prevOrgs];
        }
        return prevOrgs;
      });
      setSelectedOrganization(data.organization);
    }
    reset();
    setOpenEditOrg(false);
  };

  return (
    <Dialog
      open={openEditOrg}
      onClose={() => setOpenEditOrg(false)}
    >
      <DialogTitle>Edit Organization</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="organization"
            label="New Organization Name"
            type="text"
            fullWidth
            error={organizations.some((el) => el.name === newOrg)}
            helperText={organizations.some((el) => el.name === newOrg) ? 'Project name already exists' : ''}
            {...register("organization")}
          />
          <br />
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
            disabled={
              (!newOrg && !newProj)
              || projects.some((el) => el.name === newProj)
              || organizations.some((el) => el.name === newOrg)
            }>
            Save
          </Button>
          <Button color='error' onClick={() => setOpenEditOrg(false)}>
            Close
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditOrganizationDialog;