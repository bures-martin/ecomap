import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { useFeatures, useModerateFeature } from '../api/hooks.js';
import { QueryBoundary } from '../components/QueryBoundary.js';
import { useToast } from '../components/ToastProvider.js';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

/** The review queue for layers that hold contributions before publishing. */
export function ModerationPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const moderate = useModerateFeature();

  const pendingQuery = useFeatures({ layers: [], q: '', status: 'pending', mine: false });

  const decide = (id: string, status: 'published' | 'rejected') => {
    moderate.mutate(
      { id, input: { status } },
      {
        onSuccess: () => {
          toast.showSuccess(
            status === 'published' ? t('moderation.approved') : t('moderation.rejected'),
          );
        },
        onError: (error) => {
          toast.showError(errorMessage(error));
        },
      },
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>
        {t('moderation.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('moderation.intro')}
      </Typography>

      <QueryBoundary query={pendingQuery}>
        {({ features }) =>
          features.length === 0 ? (
            <Alert severity="success">{t('moderation.empty')}</Alert>
          ) : (
            <Stack spacing={2}>
              {features.map((feature) => (
                <Paper key={feature.id} sx={{ p: 2 }} component="article">
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography variant="h3" sx={{ flexGrow: 1 }}>
                        {feature.name}
                      </Typography>
                      <Chip size="small" label={feature.layerSlug} />
                    </Stack>

                    {feature.description && (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{feature.description}</Typography>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      {feature.createdByName
                        ? t('feature.addedBy', { name: feature.createdByName })
                        : t('feature.addedByUnknown')}
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => {
                          decide(feature.id, 'published');
                        }}
                      >
                        {t('moderation.approve')}
                      </Button>
                      <Button
                        color="error"
                        onClick={() => {
                          decide(feature.id, 'rejected');
                        }}
                      >
                        {t('moderation.reject')}
                      </Button>
                      <Box sx={{ flexGrow: 1 }} />
                      <Button component={RouterLink} to={`/?feature=${feature.id}`}>
                        {t('nav.map')}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )
        }
      </QueryBoundary>
    </Container>
  );
}
