import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

import { RenameOrganization } from "../../wailsjs/go/main/App";
import { useAppStore } from "../stores/main";

interface EditOrganizationDialogProps {
  openEditOrg: boolean;
  setOpenEditOrg: (value: boolean) => void;
}

type Inputs = {
  organization: string;
};

const EditOrganizationDialog: React.FC<EditOrganizationDialogProps> = ({ openEditOrg, setOpenEditOrg }) => {
  const [organizations, setOrganizations, organization, setSelectedOrganization] = useAppStore((state) => [
    state.organizations,
    state.setOrganizations,
    state.selectedOrganization,
    state.setSelectedOrganization,
  ]);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const inputs = watch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.organization && data.organization !== organization) {
      await RenameOrganization(organization, data.organization);
      const index = organizations.findIndex((el) => el.name === organization);
      if (index > -1) {
        organizations[index].name = data.organization;
        setOrganizations([...organizations]);
      }
      setSelectedOrganization(data.organization);
    }
    reset();
    setOpenEditOrg(false);
  };

  return (
    <Dialog open={openEditOrg} onClose={() => setOpenEditOrg(false)}>
      <DialogTitle>Edit Organization ({organization})</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="organization"
            label="New Organization Name"
            type="text"
            fullWidth
            error={organizations.some((el) => el.name === inputs.organization)}
            helperText={
              organizations.some((el) => el.name === inputs.organization) ? "Organization name already exists" : ""
            }
            {...register("organization")}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            disabled={!inputs.organization || organizations.some((el) => el.name === inputs.organization)}
          >
            Save
          </Button>
          <Button color="error" onClick={() => setOpenEditOrg(false)}>
            Close
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditOrganizationDialog;
