import {
  BASEMAPS,
  LOCALES,
  LOCALE_LABELS,
  bboxSchema,
  updateCommunitySettingsInputSchema,
  type BBox,
  type CommunitySettings,
} from '@ecomap/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommunitySettings, useUpdateSettings } from '../api/hooks.js';
import { QueryBoundary } from '../components/QueryBoundary.js';
import { useToast } from '../components/ToastProvider.js';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

/** Everything that makes one deployment of EcoMap different from another. */
export function AdminSettingsPage() {
  const { t } = useTranslation();
  const settingsQuery = useCommunitySettings();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>
        {t('settingsAdmin.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('settingsAdmin.intro')}
      </Typography>

      <QueryBoundary query={settingsQuery}>
        {(settings) => <SettingsForm settings={settings} />}
      </QueryBoundary>
    </Container>
  );
}

interface Draft {
  name: string;
  tagline: string;
  aboutMarkdown: string;
  primaryColor: string;
  accentColor: string;
  defaultLocale: CommunitySettings['defaultLocale'];
  basemap: CommunitySettings['basemap'];
  lat: string;
  lng: string;
  zoom: string;
  boundsEnabled: boolean;
  west: string;
  south: string;
  east: string;
  north: string;
  allowPublicRegistration: boolean;
}

function SettingsForm({ settings }: { settings: CommunitySettings }) {
  const { t } = useTranslation();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const updateSettings = useUpdateSettings();

  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setValidationError(null);

    let contributionBounds: BBox | null = null;
    if (draft.boundsEnabled) {
      const parsed = bboxSchema.safeParse([
        Number(draft.west),
        Number(draft.south),
        Number(draft.east),
        Number(draft.north),
      ]);
      if (!parsed.success) {
        setValidationError(parsed.error.issues[0]?.message ?? t('errors.validation_failed'));
        return;
      }
      contributionBounds = parsed.data;
    }

    const input = updateCommunitySettingsInputSchema.safeParse({
      name: draft.name,
      tagline: draft.tagline,
      aboutMarkdown: draft.aboutMarkdown,
      primaryColor: draft.primaryColor,
      accentColor: draft.accentColor,
      defaultLocale: draft.defaultLocale,
      basemap: draft.basemap,
      initialView: {
        lat: Number(draft.lat),
        lng: Number(draft.lng),
        zoom: Number(draft.zoom),
      },
      contributionBounds,
      allowPublicRegistration: draft.allowPublicRegistration,
    });

    if (!input.success) {
      setValidationError(input.error.issues[0]?.message ?? t('errors.validation_failed'));
      return;
    }

    updateSettings.mutate(input.data, {
      onSuccess: () => {
        toast.showSuccess(t('settingsAdmin.saved'));
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
      },
    });
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={3}>
        {validationError && <Alert severity="error">{validationError}</Alert>}

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField
              label={t('settingsAdmin.name')}
              value={draft.name}
              onChange={(event) => {
                update('name', event.target.value);
              }}
              required
            />
            <TextField
              label={t('settingsAdmin.tagline')}
              value={draft.tagline}
              onChange={(event) => {
                update('tagline', event.target.value);
              }}
            />
            <TextField
              label={t('settingsAdmin.about')}
              helperText={t('settingsAdmin.aboutHelp')}
              value={draft.aboutMarkdown}
              onChange={(event) => {
                update('aboutMarkdown', event.target.value);
              }}
              multiline
              minRows={4}
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('settingsAdmin.primaryColor')}
                type="color"
                value={draft.primaryColor}
                onChange={(event) => {
                  update('primaryColor', event.target.value);
                }}
              />
              <TextField
                label={t('settingsAdmin.accentColor')}
                type="color"
                value={draft.accentColor}
                onChange={(event) => {
                  update('accentColor', event.target.value);
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label={t('settingsAdmin.basemap')}
                value={draft.basemap}
                onChange={(event) => {
                  update('basemap', event.target.value as Draft['basemap']);
                }}
              >
                {BASEMAPS.map((basemap) => (
                  <MenuItem key={basemap} value={basemap}>
                    {t(`settingsAdmin.basemaps.${basemap}`)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t('settingsAdmin.defaultLocale')}
                value={draft.defaultLocale}
                onChange={(event) => {
                  update('defaultLocale', event.target.value as Draft['defaultLocale']);
                }}
              >
                {LOCALES.map((locale) => (
                  <MenuItem key={locale} value={locale}>
                    {LOCALE_LABELS[locale]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }} component="section" aria-labelledby="view-heading">
          <Typography variant="h3" id="view-heading" gutterBottom>
            {t('settingsAdmin.initialView')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('settingsAdmin.initialLat')}
              value={draft.lat}
              onChange={(event) => {
                update('lat', event.target.value);
              }}
              inputMode="decimal"
            />
            <TextField
              label={t('settingsAdmin.initialLng')}
              value={draft.lng}
              onChange={(event) => {
                update('lng', event.target.value);
              }}
              inputMode="decimal"
            />
            <TextField
              label={t('settingsAdmin.initialZoom')}
              value={draft.zoom}
              onChange={(event) => {
                update('zoom', event.target.value);
              }}
              inputMode="numeric"
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }} component="section" aria-labelledby="bounds-heading">
          <Typography variant="h3" id="bounds-heading" gutterBottom>
            {t('settingsAdmin.contributionBounds')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settingsAdmin.contributionBoundsHelp')}
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={draft.boundsEnabled}
                onChange={(event) => {
                  update('boundsEnabled', event.target.checked);
                }}
              />
            }
            label={t('settingsAdmin.contributionBounds')}
          />

          {draft.boundsEnabled && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('settingsAdmin.boundsWest')}
                value={draft.west}
                onChange={(event) => {
                  update('west', event.target.value);
                }}
                inputMode="decimal"
              />
              <TextField
                label={t('settingsAdmin.boundsSouth')}
                value={draft.south}
                onChange={(event) => {
                  update('south', event.target.value);
                }}
                inputMode="decimal"
              />
              <TextField
                label={t('settingsAdmin.boundsEast')}
                value={draft.east}
                onChange={(event) => {
                  update('east', event.target.value);
                }}
                inputMode="decimal"
              />
              <TextField
                label={t('settingsAdmin.boundsNorth')}
                value={draft.north}
                onChange={(event) => {
                  update('north', event.target.value);
                }}
                inputMode="decimal"
              />
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.allowPublicRegistration}
                onChange={(event) => {
                  update('allowPublicRegistration', event.target.checked);
                }}
              />
            }
            label={t('settingsAdmin.allowPublicRegistration')}
          />
        </Paper>

        <Box>
          <Button type="submit" variant="contained" size="large" loading={updateSettings.isPending}>
            {t('app.save')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function toDraft(settings: CommunitySettings): Draft {
  const bounds = settings.contributionBounds;
  return {
    name: settings.name,
    tagline: settings.tagline,
    aboutMarkdown: settings.aboutMarkdown,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    defaultLocale: settings.defaultLocale,
    basemap: settings.basemap,
    lat: String(settings.initialView.lat),
    lng: String(settings.initialView.lng),
    zoom: String(settings.initialView.zoom),
    boundsEnabled: bounds !== null,
    west: bounds ? String(bounds[0]) : '',
    south: bounds ? String(bounds[1]) : '',
    east: bounds ? String(bounds[2]) : '',
    north: bounds ? String(bounds[3]) : '',
    allowPublicRegistration: settings.allowPublicRegistration,
  };
}
