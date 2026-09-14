import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useCommunitySettings, useLayers } from '../api/hooks.js';

export function AboutPage() {
  const { t } = useTranslation();
  const settings = useCommunitySettings().data;
  const layers = useLayers().data ?? [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>
        {settings?.name ?? t('about.title')}
      </Typography>

      {settings?.tagline && (
        <Typography variant="h3" color="text.secondary" sx={{ mb: 3, fontWeight: 400 }}>
          {settings.tagline}
        </Typography>
      )}

      <Stack spacing={3}>
        {settings?.aboutMarkdown && (
          <Paper sx={{ p: 3 }}>
            {/*
              Rendered as pre-wrapped text rather than parsed as HTML: the content
              is admin-authored, but rendering arbitrary markup would be a stored
              XSS waiting to happen the first time an account is compromised.
            */}
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{settings.aboutMarkdown}</Typography>
          </Paper>
        )}

        {layers.length > 0 && (
          <Paper sx={{ p: 3 }} component="section" aria-labelledby="layers-heading">
            <Typography variant="h3" id="layers-heading" gutterBottom>
              {t('map.layersHeading')}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {layers.map((layer) => (
                <Chip
                  key={layer.id}
                  label={`${layer.name} (${String(layer.featureCount)})`}
                  sx={{ bgcolor: layer.color, color: 'common.white' }}
                />
              ))}
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: 3 }} component="section" aria-labelledby="contribute-heading">
          <Typography variant="h3" id="contribute-heading" gutterBottom>
            {t('about.contributeHeading')}
          </Typography>
          <Typography>{t('about.contributeBody')}</Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h3" gutterBottom>
            {t('about.openDataHeading')}
          </Typography>
          <Typography>{t('about.openDataBody')}</Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('map.attribution')}
            </Typography>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}
