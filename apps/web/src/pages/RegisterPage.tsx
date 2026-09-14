import { PASSWORD_MIN_LENGTH } from '@ecomap/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router';
import { useCommunitySettings } from '../api/hooks.js';
import { useAuth } from '../auth/useAuth.js';
import { fieldIssues, useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

export function RegisterPage() {
  const { t } = useTranslation();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const errorMessage = useApiErrorMessage();
  const settings = useCommunitySettings().data;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const issues = fieldIssues(error);

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await register({ displayName, email, password });
      await navigate('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h1" gutterBottom>
          {t('auth.registerTitle')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t('auth.registerIntro')}
        </Typography>

        {settings && !settings.allowPublicRegistration ? (
          <Alert severity="info">{t('auth.registrationClosed')}</Alert>
        ) : (
          <Box component="form" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <Stack spacing={2}>
              {error !== null && <Alert severity="error">{errorMessage(error)}</Alert>}

              <TextField
                label={t('auth.displayName')}
                helperText={issues['displayName'] ?? t('auth.displayNameHelp')}
                error={Boolean(issues['displayName'])}
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                }}
                autoComplete="name"
                required
                autoFocus
              />

              <TextField
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                error={Boolean(issues['email'])}
                helperText={issues['email']}
                required
              />

              <TextField
                label={t('auth.password')}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                error={Boolean(issues['password'])}
                helperText={issues['password'] ?? t('auth.passwordHelp')}
                slotProps={{ htmlInput: { minLength: PASSWORD_MIN_LENGTH } }}
                required
              />

              <Button type="submit" variant="contained" size="large" loading={submitting}>
                {t('auth.register')}
              </Button>

              <Link component={RouterLink} to="/sign-in">
                {t('auth.haveAccount')}
              </Link>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
