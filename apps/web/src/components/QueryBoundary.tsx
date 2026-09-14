import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';
import type { ReactNode } from 'react';

/**
 * Renders the three states of a query once, instead of in every page.
 *
 * `children` receives the loaded data, so nothing downstream has to handle
 * `undefined`.
 */
export function QueryBoundary<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const errorMessage = useApiErrorMessage();

  if (query.isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', p: 6 }}>
        <CircularProgress aria-label={t('app.loading')} />
      </Box>
    );
  }

  if (query.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                void query.refetch();
              }}
            >
              {t('app.retry')}
            </Button>
          }
        >
          {errorMessage(query.error)}
        </Alert>
      </Box>
    );
  }

  return children(query.data);
}
