import type { Permission } from '@ecomap/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './useAuth.js';
import type { ReactNode } from 'react';

/**
 * Route guard. Note this is convenience, not security: the API enforces the same
 * permission on every request, so a hand-typed URL gains nothing.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { user, isLoading, can } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, p: 6 }}>
        <CircularProgress aria-label={t('app.loading')} />
      </Box>
    );
  }

  if (!user) {
    /* Remember where they were going, so sign-in can send them back. */
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!can(permission)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{t('errors.forbidden')}</Alert>
      </Box>
    );
  }

  return children;
}
