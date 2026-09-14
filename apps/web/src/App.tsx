import { DEFAULT_COMMUNITY_SETTINGS } from '@ecomap/shared';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ApiRequestError } from './api/client.js';
import { useCommunitySettings } from './api/hooks.js';
import { AuthProvider } from './auth/AuthProvider.js';
import { RequirePermission } from './auth/RequirePermission.js';
import { AppShell } from './components/AppShell.js';
import { ToastProvider } from './components/ToastProvider.js';
import { AboutPage } from './pages/AboutPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { MapPage } from './pages/MapPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { createEcoMapTheme } from './theme.js';

/*
 * Screens only a signed-in member or an admin ever opens are split out of the
 * first download: a visitor who just wants to look at the map should not pay for
 * the layer editor or the QR-code library.
 */
const AccountPage = lazy(async () => ({
  default: (await import('./pages/AccountPage.js')).AccountPage,
}));
const AdminLayersPage = lazy(async () => ({
  default: (await import('./pages/AdminLayersPage.js')).AdminLayersPage,
}));
const AdminSettingsPage = lazy(async () => ({
  default: (await import('./pages/AdminSettingsPage.js')).AdminSettingsPage,
}));
const ModerationPage = lazy(async () => ({
  default: (await import('./pages/ModerationPage.js')).ModerationPage,
}));
const PeoplePage = lazy(async () => ({
  default: (await import('./pages/PeoplePage.js')).PeoplePage,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      /* Retrying a 403 or a 404 only delays the error the user needs to see. */
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * The theme depends on data the API owns, so it lives below the query provider.
 * Until the settings arrive we use the built-in defaults, which keeps the first
 * paint instant instead of showing a spinner over the whole application.
 */
function ThemedApp() {
  const settingsQuery = useCommunitySettings();
  const settings = settingsQuery.data;

  const theme = useMemo(
    () =>
      createEcoMapTheme(
        settings?.primaryColor ?? DEFAULT_COMMUNITY_SETTINGS.primaryColor,
        settings?.accentColor ?? DEFAULT_COMMUNITY_SETTINGS.accentColor,
      ),
    [settings?.primaryColor, settings?.accentColor],
  );

  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />
      <ToastProvider>
        <AppShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/sign-in" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route
                path="/admin/layers"
                element={
                  <RequirePermission permission="layer:manage">
                    <AdminLayersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RequirePermission permission="settings:manage">
                    <AdminSettingsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/moderation"
                element={
                  <RequirePermission permission="feature:moderate">
                    <ModerationPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/people"
                element={
                  <RequirePermission permission="user:manage">
                    <PeoplePage />
                  </RequirePermission>
                }
              />
              <Route path="/admin" element={<Navigate to="/admin/layers" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AppShell>
      </ToastProvider>
    </ThemeProvider>
  );
}

function RouteFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, p: 6 }}>
      <CircularProgress />
    </Box>
  );
}
