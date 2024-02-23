// AppFooter.tsx
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Tooltip, IconButton } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';

import { GetVersion, UpdateAvailable } from '../../wailsjs/go/main/App';

const AppFooter: React.FC<{}> = () => {
  const [version, setVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    GetVersion().then(setVersion);
    UpdateAvailable().then(setUpdateAvailable);
  }, []);

  return (
    <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
      <Toolbar>
        {updateAvailable && (
          <Typography variant="h6" component="div">
            <Tooltip title="Restart to apply update" placement="top-end">
              <IconButton color="inherit">
                <SystemUpdateIcon />
              </IconButton>
            </Tooltip>
            UPDATE AVAILABLE
          </Typography>
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