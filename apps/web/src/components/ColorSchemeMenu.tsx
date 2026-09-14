import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Light / dark / follow-the-system, remembered by MUI in localStorage. */
export function ColorSchemeMenu() {
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  /* `mode` is undefined until MUI has read the stored preference. */
  if (!mode) return null;

  const options = [
    { value: 'light', label: t('nav.themeLight'), icon: <Brightness7Icon fontSize="small" /> },
    { value: 'dark', label: t('nav.themeDark'), icon: <Brightness4Icon fontSize="small" /> },
    {
      value: 'system',
      label: t('nav.themeSystem'),
      icon: <SettingsBrightnessIcon fontSize="small" />,
    },
  ] as const;

  const current = options.find((option) => option.value === mode) ?? options[2];

  return (
    <>
      <Tooltip title={t('nav.theme')}>
        <IconButton
          color="inherit"
          aria-label={t('nav.theme')}
          aria-haspopup="menu"
          aria-expanded={anchor !== null}
          onClick={(event) => {
            setAnchor(event.currentTarget);
          }}
        >
          {current.icon}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === mode}
            onClick={() => {
              setMode(option.value);
              setAnchor(null);
            }}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
