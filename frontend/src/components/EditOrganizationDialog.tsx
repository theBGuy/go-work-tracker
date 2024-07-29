import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

import { RenameOrganization } from "@go/main/App";
import { useAppStore } from "../stores/main";

interface EditOrganizationDialogProps {
  openEditOrg: boolean;
  orgID: number;
  setOpenEditOrg: (value: boolean) => void;
}

type Inputs = {
  organization: string;
};

const EditOrganizationDialog: React.FC<EditOrganizationDialogProps> = ({ openEditOrg, setOpenEditOrg, orgID }) => {
  const organizations = useAppStore((state) => state.organizations);
  const setOrganizations = useAppStore((state) => state.setOrganizations);
  const activeOrg = useAppStore((state) => state.activeOrg);
  const organization = organizations.find((el) => el.id === orgID);
  const setSelectedOrganization = useAppStore((state) => state.setActiveOrganization);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const inputs = watch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (!organization) return;
    if (data.organization && data.organization !== organization.name) {
      const newOrg = await RenameOrganization(orgID, data.organization);
      const index = organizations.findIndex((el) => el.id === orgID);
      if (index > -1) {
        organizations[index].name = data.organization;
        setOrganizations([...organizations]);
      }
      if (activeOrg?.id === orgID) {
        setSelectedOrganization(newOrg);
      }
    }
    reset();
    setOpenEditOrg(false);
  };

  return (
    <Dialog open={openEditOrg} onClose={() => setOpenEditOrg(false)}>
      <DialogTitle>Edit Organization ({organization?.name})</DialogTitle>
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
