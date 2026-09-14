import { canDeleteFeature, canEditFeature, type Feature, type Layer } from '@ecomap/shared';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth.js';

/**
 * Details of the selected contribution, plus the actions the viewer is allowed
 * to take. The permission helpers are the same ones the API enforces, so the
 * buttons on screen and the rules on the server cannot drift apart.
 */
export function FeatureDetailsPanel({
  feature,
  layer,
  onClose,
  onEdit,
  onDelete,
  onModerate,
}: {
  feature: Feature | null;
  layer: Layer | undefined;
  onClose: () => void;
  onEdit: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
  onModerate: (feature: Feature, status: 'published' | 'rejected') => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, can } = useAuth();

  const actor = user ? { id: user.id, role: user.role } : null;
  const mayEdit = feature ? canEditFeature(actor, feature) : false;
  const mayDelete = feature ? canDeleteFeature(actor, feature) : false;

  return (
    <Drawer
      anchor="right"
      open={feature !== null}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 380 } } } }}
    >
      {feature && (
        <Stack spacing={2} sx={{ p: 2 }} component="article">
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h2" sx={{ fontSize: '1.35rem' }}>
                {feature.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {layer && (
                  <Chip
                    size="small"
                    label={layer.name}
                    sx={{ bgcolor: layer.color, color: 'common.white' }}
                  />
                )}
                {feature.status !== 'published' && (
                  <Chip
                    size="small"
                    color={feature.status === 'rejected' ? 'error' : 'warning'}
                    label={t(`feature.status.${feature.status}`)}
                  />
                )}
              </Stack>
            </Box>
            <IconButton onClick={onClose} aria-label={t('app.close')}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {feature.description && (
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{feature.description}</Typography>
          )}

          {layer && layer.fields.length > 0 && (
            <>
              <Divider />
              <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1 }}>
                {layer.fields.map((field) => {
                  const value = feature.properties[field.key];
                  if (value === undefined || value === null || value === '') return null;

                  return (
                    <Box key={field.key}>
                      <Typography component="dt" variant="caption" color="text.secondary">
                        {field.label}
                      </Typography>
                      <Typography component="dd" sx={{ m: 0 }}>
                        {formatPropertyValue(value, field.type, i18n.language)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}

          <Divider />

          <Typography variant="caption" color="text.secondary">
            {feature.createdByName
              ? t('feature.addedBy', { name: feature.createdByName })
              : t('feature.addedByUnknown')}
            {' · '}
            {t('feature.addedOn', {
              date: new Date(feature.createdAt).toLocaleDateString(i18n.language),
            })}
          </Typography>

          {can('feature:moderate') && feature.status === 'pending' && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => {
                  onModerate(feature, 'published');
                }}
              >
                {t('moderation.approve')}
              </Button>
              <Button
                color="error"
                onClick={() => {
                  onModerate(feature, 'rejected');
                }}
              >
                {t('moderation.reject')}
              </Button>
            </Stack>
          )}

          {(mayEdit || mayDelete) && (
            <Stack direction="row" spacing={1}>
              {mayEdit && (
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => {
                    onEdit(feature);
                  }}
                >
                  {t('app.edit')}
                </Button>
              )}
              {mayDelete && (
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    onDelete(feature);
                  }}
                >
                  {t('app.delete')}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}

function formatPropertyValue(
  value: string | number | boolean,
  type: Layer['fields'][number]['type'],
  locale: string,
): string {
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (type === 'date' && typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(locale);
  }
  return String(value);
}
