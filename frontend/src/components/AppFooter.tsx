// AppFooter.tsx
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Tooltip, IconButton, Badge } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';

import { GetVersion, UpdateAvailable } from '../../wailsjs/go/main/App';
import { EventsEmit, EventsOn } from '../../wailsjs/runtime/runtime';

const AppFooter: React.FC<{}> = () => {
  const [version, setVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  EventsOn('update-available', () => {
    setUpdateAvailable(true);
  });

  const handleUpdate = () => {
    EventsEmit('do-update');
  };

  useEffect(() => {
    GetVersion().then(setVersion);
    UpdateAvailable().then(setUpdateAvailable);
  }, []);

  return (
    <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
      <Toolbar>
        {updateAvailable && (
          <Tooltip title="Update available. Click to restart and apply." placement="top-end">
            <IconButton color="inherit" size="small" onClick={handleUpdate}>
              <Badge badgeContent="!" color="secondary">
                <SystemUpdateIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <IconButton color="inherit">
            <a href="https://github.com/theBGuy" target="_blank" rel="noopener noreferrer">
              <GitHubIcon />
            </a>
          </IconButton>
          theBGuy
        </Typography>
        <Typography variant="h6" component="div">
          v{version}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default AppFooter;