import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import QRCode from 'qrcode';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../auth/useAuth.js';
import { useToast } from '../components/ToastProvider.js';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

/** Password change and two-factor setup for the signed-in user. */
export function AccountPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>
        {t('auth.accountTitle')}
      </Typography>

      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h3">{user.displayName}</Typography>
            <Typography color="text.secondary">{user.email}</Typography>
            <Box>
              <Chip size="small" label={t(`people.roles.${user.role}`)} />
            </Box>
          </Stack>
        </Paper>

        <TwoFactorSection />
        <ChangePasswordSection />
      </Stack>
    </Container>
  );
}

function TwoFactorSection() {
  const { t } = useTranslation();
  const { user, reloadUser } = useAuth();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();

  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  /* Render the otpauth URI as a QR code the authenticator app can scan. */
  useEffect(() => {
    if (!setupUri) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(setupUri, { margin: 1, width: 220 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [setupUri]);

  if (!user) return null;

  const startSetup = async () => {
    setBusy(true);
    try {
      const setup = await authApi.startTotpSetup();
      setSetupUri(setup.uri);
      setSecret(setup.secret);
    } catch (error) {
      toast.showError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi.enableTotp(code);
      await reloadUser();
      setSetupUri(null);
      setSecret(null);
      setCode('');
      toast.showSuccess(t('auth.twoFactorEnabled'));
    } catch (error) {
      toast.showError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const disable = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi.disableTotp(password);
      await reloadUser();
      setPassword('');
      toast.showInfo(t('auth.twoFactorDisabled'));
    } catch (error) {
      toast.showError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }} component="section" aria-labelledby="two-factor-heading">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h3" id="two-factor-heading" sx={{ flexGrow: 1 }}>
            {t('auth.twoFactorTitle')}
          </Typography>
          <Chip
            size="small"
            color={user.totpEnabled ? 'success' : 'default'}
            label={user.totpEnabled ? t('auth.twoFactorOn') : t('auth.twoFactorOff')}
          />
        </Stack>

        <Typography color="text.secondary">{t('auth.twoFactorIntro')}</Typography>

        {user.totpEnabled ? (
          <Box component="form" onSubmit={(event) => void disable(event)}>
            <Stack spacing={2}>
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
              <Box>
                <Button type="submit" color="error" loading={busy}>
                  {t('auth.twoFactorDisable')}
                </Button>
              </Box>
            </Stack>
          </Box>
        ) : setupUri ? (
          <Box component="form" onSubmit={(event) => void confirmSetup(event)}>
            <Stack spacing={2}>
              <Typography variant="subtitle2">{t('auth.twoFactorSetupStep1')}</Typography>
              {qrDataUrl && (
                <Box
                  component="img"
                  src={qrDataUrl}
                  alt={t('auth.twoFactorQrAlt')}
                  sx={{ width: 220, height: 220, alignSelf: 'flex-start', bgcolor: '#fff', p: 1 }}
                />
              )}

              <Alert severity="info" icon={false}>
                <Typography variant="caption" display="block">
                  {t('auth.twoFactorManualEntry')}
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {secret}
                </Typography>
              </Alert>

              <Typography variant="subtitle2">{t('auth.twoFactorSetupStep2')}</Typography>
              <TextField
                label={t('auth.totpCode')}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              <Box>
                <Button type="submit" variant="contained" loading={busy}>
                  {t('auth.twoFactorEnable')}
                </Button>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box>
            <Button variant="outlined" loading={busy} onClick={() => void startSetup()}>
              {t('auth.twoFactorEnable')}
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

function ChangePasswordSection() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const errorMessage = useApiErrorMessage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.showSuccess(t('auth.passwordChanged'));
      /* Every session was revoked server-side, so this one has to end too. */
      await logout();
      await navigate('/sign-in');
    } catch (error) {
      toast.showError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }} component="section" aria-labelledby="password-heading">
      <Typography variant="h3" id="password-heading" gutterBottom>
        {t('auth.changePassword')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box component="form" onSubmit={(event) => void submit(event)} noValidate>
        <Stack spacing={2}>
          <TextField
            label={t('auth.currentPassword')}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
            }}
            required
          />
          <TextField
            label={t('auth.newPassword')}
            type="password"
            autoComplete="new-password"
            helperText={t('auth.passwordHelp')}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
            }}
            required
          />
          <Box>
            <Button type="submit" variant="contained" loading={busy}>
              {t('app.save')}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}
