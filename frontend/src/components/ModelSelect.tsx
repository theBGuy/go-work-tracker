import type React from "react";
import { MenuItem, Select, type SelectChangeEvent, Typography, Stack, IconButton, Tooltip } from "@mui/material";
import { type Model, handleSort } from "@/utils/utils";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

interface ModelSelectProps {
  label: string;
  value?: string;
  onChange: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
  items: Model[];
  showFavorite?: boolean;
  toggleFavoriteOnClick?: (id: number) => void;
  showEdit?: boolean;
  editOnClick?: (id: number) => void;
  showDelete?: boolean;
  deleteOnClick?: (id: number) => void;
}

const ModelSelect: React.FC<ModelSelectProps> = ({
  label,
  value,
  onChange,
  items,
  showFavorite,
  toggleFavoriteOnClick,
  showEdit,
  editOnClick,
  showDelete,
  deleteOnClick,
}) => {
  return (
    <>
      <Typography variant="h6" component="h2" sx={{ display: "inline-block", marginRight: 2 }}>
        {label}:
      </Typography>
      <Select
        label={label}
        labelId={`${label}-select-label`}
        variant="standard"
        value={value}
        onChange={onChange}
        renderValue={(selected) => <div>{selected}</div>}
      >
        {items.sort(handleSort).map((model, idx) => (
          <MenuItem
            key={idx}
            value={model.name}
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <Stack direction="row" alignItems="center">
              {showFavorite && typeof toggleFavoriteOnClick === "function" && (
                <IconButton
                  edge="start"
                  aria-label="favorite"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavoriteOnClick(model.id);
                  }}
                >
                  {model.favorite ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
              )}
              {model.name}
            </Stack>
            <Stack direction="row" alignItems="center">
              {showEdit && typeof editOnClick === "function" && (
                <Tooltip title={`Edit ${label}`}>
                  <IconButton
                    edge="end"
                    aria-label="edit"
                    onClick={(event) => {
                      event.stopPropagation();
                      editOnClick(model.id);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              {showDelete && typeof deleteOnClick === "function" && (
                <Tooltip title={`Delete ${label}`}>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteOnClick(model.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </>
  );
};

export default ModelSelect;
