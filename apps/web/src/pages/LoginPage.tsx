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
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiRequestError } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const errorMessage = useApiErrorMessage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  /** Revealed only once the server says this account has two-factor turned on. */
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const from = (location.state as LocationState | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password, ...(totpCode ? { totpCode } : {}) });
      await navigate('/');
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === 'totp_required') {
        setTotpRequired(true);
        setError(null);
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h1" gutterBottom>
          {t('auth.signInTitle')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t('auth.signInIntro')}
        </Typography>

        <Box component="form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              required
              autoFocus
            />

            <TextField
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
            />

            {totpRequired && (
              <TextField
                label={t('auth.totpCode')}
                helperText={t('auth.totpCodeHelp')}
                value={totpCode}
                onChange={(event) => {
                  setTotpCode(event.target.value);
                }}
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                autoFocus
              />
            )}

            <Button type="submit" variant="contained" size="large" loading={submitting}>
              {t('auth.signIn')}
            </Button>

            <Link component={RouterLink} to="/register">
              {t('auth.needAccount')}
            </Link>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
