import React from 'react';
import { useForm, SubmitHandler } from "react-hook-form"

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

import { RenameOrganization, RenameProject } from '../../wailsjs/go/main/App';

interface EditOrganizationDialogProps {
  openEditOrg: boolean;
  organization: string;
  organizations: string[];
  project: string;
  projects: string[];
  setSelectedOrganization: (org: string) => void;
  setSelectedProject: (proj: string) => void;
  setOrganizations: React.Dispatch<React.SetStateAction<string[]>>;
  setProjects: React.Dispatch<React.SetStateAction<string[]>>;
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
    if (data.organization && data.organization !== organization) {
      await RenameOrganization(organization, data.organization);
      setOrganizations(prevOrgs => {
        const index = prevOrgs.indexOf(organization);
        if (index > -1) {
          prevOrgs[index] = data.organization;
        }
        return prevOrgs;
      });
      setSelectedOrganization(data.organization);
    }
    if (data.project && data.project !== project) {
      console.log(`renaming project for ${organization} from ${project} to ${data.project}`);
      await RenameProject(organization, project, data.project);
      setProjects(prevProjects => {
        const index = prevProjects.indexOf(project);
        if (index > -1) {
          prevProjects[index] = data.project;
        }
        return prevProjects;
      });
      setSelectedProject(data.project);
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
            id="name"
            label="New Organization Name"
            type="text"
            fullWidth
            error={organizations.includes(newOrg)}
            helperText={organizations.includes(newOrg) ? 'Project name already exists' : ''}
            {...register("organization")}
          />
          <br />
          <TextField
            margin="dense"
            id="name"
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
            disabled={
              (!newOrg && !newProj)
              || projects.includes(newProj)
              || organizations.includes(newOrg)
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