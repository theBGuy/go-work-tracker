import NavBar from "@/components/NavBar";
import AppBar from "@/components/ui/AppBar";
import { useTimerStore } from "@/stores/timer";
import { formatTime } from "@/utils/utils";
import { DeleteWorkSession, GetWorkSessions, TransferWorkSession } from "@go/main/App";
import { main } from "@go/models";
import Delete from "@mui/icons-material/Delete";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Toolbar,
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridActionsCellItemProps, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useLoaderData } from "react-router-dom";

type LoaderData = {
  sessions: main.WorkSession[];
  projectsMap: Map<number, string>;
  orgMap: Map<number, string>;
};

function DeleteSessionActionItem({
  deleteSession,
  ...props
}: GridActionsCellItemProps & { deleteSession: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <GridActionsCellItem {...props} onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Delete this session?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setOpen(false);
              deleteSession();
            }}
            color="warning"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function TransferSessionActionItem({
  sessionID,
  orgMap,
  projectsMap,
  transferSession,
  ...props
}: GridActionsCellItemProps & {
  sessionID: number;
  projectsMap: Map<number, string>;
  orgMap: Map<number, string>;
  transferSession: (id: number, project: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState(0);

  return (
    <>
      <GridActionsCellItem {...props} onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Transfer this session?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Select the project to transfer this session to.
          </DialogContentText>

          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Project</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={project}
              label="Project"
              onChange={(e) => setProject(e.target.value as number)}
            >
              <MenuItem value={0}></MenuItem>
              {Array.from(projectsMap).map(([id, name]) => (
                <MenuItem key={id} value={id}>
                  {orgMap.get(id)}/{name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={project === 0}
            onClick={async () => {
              setOpen(false);
              transferSession(sessionID, project);
            }}
            color="warning"
            autoFocus
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function SessionsManager() {
  const { sessions: initalSessions, projectsMap, orgMap } = useLoaderData() as LoaderData;
  const [sessions, setSessions] = useState(initalSessions);

  useEffect(() => {
    // TODO: We don't really need to fetch the entire list of sessions here just the new one
    const timerSubscription = useTimerStore.subscribe(
      (state) => state.running,
      (curr) => {
        // Time has been stopped fetch new data
        if (!curr) {
          GetWorkSessions().then((sessions) => {
            setSessions(sessions);
          });
        }
      }
    );

    return () => {
      timerSubscription();
    };
  }, []);

  const handleDelete = async (id: number) => {
    await DeleteWorkSession(id);
    setSessions(sessions.filter((session) => session.id !== id));
  };

  const transferSession = async (id: number, project: number) => {
    await TransferWorkSession(id, project);
    setSessions((prev) => {
      const session = prev.find((session) => session.id === id);
      if (!session) {
        return prev;
      }
      session.project_id = project;
      return [...prev];
    });
  };

  const columns: GridColDef<(typeof sessions)[number]>[] = [
    { field: "id", headerName: "ID", width: 90 },
    {
      field: "project_id",
      headerName: "Project",
      width: 250,
      valueGetter: (value) => value && orgMap.get(value) + "/" + projectsMap.get(value),
    },
    {
      field: "created_at",
      headerName: "Date",
      width: 200,
      type: "dateTime",
      valueGetter: (value) => value && new Date(value),
      // valueFormatter: (value) => dateString(value as Date),
    },
    { field: "seconds", headerName: "Duration", width: 150, valueFormatter: (value) => formatTime(value) },
    {
      field: "actions",
      type: "actions",
      width: 100,
      getActions: (params) => [
        // <GridActionsCellItem
        //   showInMenu
        //   icon={<Delete />}
        //   label="Delete"
        //   onClick={() => DeleteWorkSession(params.row.id)}
        // />,
        <DeleteSessionActionItem
          showInMenu
          icon={<Delete />}
          label="Delete"
          deleteSession={() => handleDelete(params.row.id)}
          closeMenuOnClick={false}
        />,
        <TransferSessionActionItem
          showInMenu
          icon={<SwapHorizIcon />}
          label="Transfer"
          sessionID={params.row.id}
          projectsMap={projectsMap}
          orgMap={orgMap}
          transferSession={transferSession}
          closeMenuOnClick={false}
        />,
      ],
    },
  ];

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <NavBar />
        </Toolbar>
      </AppBar>
      <Box sx={{ height: "65vh", width: "100%" }}>
        <DataGrid
          rows={sessions}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
            sorting: {
              sortModel: [{ field: "created_at", sort: "desc" }],
            },
            columns: {
              columnVisibilityModel: {
                id: false,
              },
            },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          autoPageSize={true}
          checkboxSelection={false}
          disableRowSelectionOnClick
          sx={{
            boxShadow: 2,
            border: 2,
            borderColor: "primary.light",
            "& .MuiDataGrid-cell:hover": {
              color: "primary.main",
            },
          }}
        />
      </Box>
    </>
  );
}
