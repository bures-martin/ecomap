import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MapIcon from '@mui/icons-material/Map';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { useCommunitySettings } from '../api/hooks.js';
import { useAuth } from '../auth/useAuth.js';
import { ColorSchemeMenu } from './ColorSchemeMenu.js';
import { LanguageMenu } from './LanguageMenu.js';
import { useToast } from './ToastProvider.js';

/**
 * The frame around every page: a skip link, a header with the community's name,
 * and the admin navigation for those who have it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const settings = useCommunitySettings().data;
  const { can } = useAuth();

  const adminLinks = [
    { to: '/admin/layers', label: t('nav.layers'), visible: can('layer:manage') },
    { to: '/admin/moderation', label: t('nav.moderation'), visible: can('feature:moderate') },
    { to: '/admin/settings', label: t('nav.settings'), visible: can('settings:manage') },
    { to: '/admin/people', label: t('nav.people'), visible: can('user:manage') },
  ].filter((link) => link.visible);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Visible only once focused, so a keyboard user can jump past the header. */}
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: 8,
          top: -64,
          zIndex: (t2) => t2.zIndex.tooltip + 1,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          '&:focus': { top: 8 },
        }}
      >
        {t('app.skipToContent')}
      </Link>

      <AppBar position="static" elevation={0} color="primary">
        <Toolbar sx={{ gap: 1 }}>
          {adminLinks.length > 0 && !isDesktop && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label={t('nav.openMenu')}
              onClick={() => {
                setDrawerOpen(true);
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <MapIcon aria-hidden sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1, fontWeight: 700 }}
          >
            {settings?.name ?? 'EcoMap'}
          </Typography>

          {isDesktop && (
            <Stack direction="row" spacing={0.5} component="nav" aria-label={t('nav.map')}>
              <NavButton to="/">{t('nav.map')}</NavButton>
              <NavButton to="/about">{t('nav.about')}</NavButton>
              {adminLinks.map((link) => (
                <NavButton key={link.to} to={link.to}>
                  {link.label}
                </NavButton>
              ))}
            </Stack>
          )}

          <LanguageMenu />
          <ColorSchemeMenu />
          <AccountMenu isDesktop={isDesktop} />
        </Toolbar>
      </AppBar>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
        }}
      >
        <Box sx={{ width: 260 }} role="presentation">
          <List>
            <DrawerLink to="/" label={t('nav.map')} onNavigate={setDrawerOpen} />
            <DrawerLink to="/about" label={t('nav.about')} onNavigate={setDrawerOpen} />
          </List>
          {adminLinks.length > 0 && (
            <>
              <Divider />
              <List subheader={<ListSubheader>{t('nav.admin')}</ListSubheader>}>
                {adminLinks.map((link) => (
                  <DrawerLink
                    key={link.to}
                    to={link.to}
                    label={link.label}
                    onNavigate={setDrawerOpen}
                  />
                ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </Box>
    </Box>
  );
}

function NavButton({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const isCurrent = location.pathname === to;
  return (
    <Button
      component={RouterLink}
      to={to}
      color="inherit"
      aria-current={isCurrent ? 'page' : undefined}
      sx={{ textDecoration: isCurrent ? 'underline' : 'none' }}
    >
      {children}
    </Button>
  );
}

function DrawerLink({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate: (open: boolean) => void;
}) {
  return (
    <ListItemButton
      component={RouterLink}
      to={to}
      onClick={() => {
        onNavigate(false);
      }}
    >
      <ListItemText primary={label} />
    </ListItemButton>
  );
}

function AccountMenu({ isDesktop }: { isDesktop: boolean }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!user) {
    return (
      <Button
        component={RouterLink}
        to="/sign-in"
        color="inherit"
        startIcon={<AccountCircleIcon />}
      >
        {isDesktop ? t('nav.signIn') : ''}
      </Button>
    );
  }

  return (
    <>
      <Button
        color="inherit"
        startIcon={<AccountCircleIcon />}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
      >
        {isDesktop ? user.displayName : ''}
      </Button>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        <MenuItem
          component={RouterLink}
          to="/account"
          onClick={() => {
            setAnchor(null);
          }}
        >
          {t('nav.account')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            void logout().then(() => {
              toast.showInfo(t('auth.signedOut'));
              void navigate('/');
            });
          }}
        >
          {t('nav.signOut')}
        </MenuItem>
      </Menu>
    </>
  );
}
