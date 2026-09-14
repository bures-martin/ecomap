import { FEATURE_STATUSES, type Layer } from '@ecomap/shared';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth.js';
import { hasActiveFilters, type MapFilters } from './filters.js';

/**
 * Everything that narrows what the map shows. Each control writes straight into
 * the URL, so the panel has no state of its own beyond the search box's own
 * debounce, which lives in the page.
 */
export function LayerFilterPanel({
  layers,
  filters,
  searchDraft,
  onSearchDraftChange,
  onFiltersChange,
  shown,
  total,
}: {
  layers: Layer[];
  filters: MapFilters;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onFiltersChange: (filters: MapFilters) => void;
  shown: number;
  total: number;
}) {
  const { t } = useTranslation();
  const { user, can } = useAuth();

  const toggleLayer = (slug: string, checked: boolean) => {
    const next = checked
      ? [...filters.layers, slug]
      : filters.layers.filter((current) => current !== slug);
    onFiltersChange({ ...filters, layers: next });
  };

  return (
    <Stack spacing={2} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <TextField
        label={t('map.searchLabel')}
        placeholder={t('map.searchPlaceholder')}
        value={searchDraft}
        onChange={(event) => {
          onSearchDraftChange(event.target.value);
        }}
        type="search"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Box component="section" aria-labelledby="layer-filter-heading">
        <Typography id="layer-filter-heading" variant="subtitle2" sx={{ mb: 1 }}>
          {t('map.layersHeading')}
        </Typography>

        <FormGroup>
          {layers.map((layer) => (
            <FormControlLabel
              key={layer.id}
              control={
                <Checkbox
                  checked={filters.layers.includes(layer.slug)}
                  onChange={(event) => {
                    toggleLayer(layer.slug, event.target.checked);
                  }}
                  sx={{ color: layer.color, '&.Mui-checked': { color: layer.color } }}
                />
              }
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    aria-hidden
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: layer.color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{layer.name}</span>
                  <Chip size="small" label={layer.featureCount} sx={{ height: 20 }} />
                  {!layer.isPublished && (
                    <Chip size="small" color="warning" label="hidden" sx={{ height: 20 }} />
                  )}
                </Stack>
              }
            />
          ))}
        </FormGroup>

        {filters.layers.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {t('map.allLayers')}
          </Typography>
        )}
      </Box>

      {(user !== null || can('feature:moderate')) && (
        <>
          <Divider />
          <Stack spacing={1.5}>
            {user && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.mine}
                    onChange={(event) => {
                      onFiltersChange({ ...filters, mine: event.target.checked });
                    }}
                  />
                }
                label={t('map.onlyMine')}
              />
            )}

            {can('feature:moderate') && (
              <TextField
                select
                label={t('map.statusFilter')}
                value={filters.status ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  onFiltersChange({
                    ...filters,
                    status: value === '' ? null : (value as MapFilters['status']),
                  });
                }}
              >
                <MenuItem value="">{t('map.anyStatus')}</MenuItem>
                {FEATURE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {t(`feature.status.${status}`)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </>
      )}

      <Divider />

      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {t('map.showingCount', { shown, total })}
        </Typography>
        {hasActiveFilters(filters) && (
          <Button
            size="small"
            onClick={() => {
              onSearchDraftChange('');
              onFiltersChange({ layers: [], q: '', status: null, mine: false });
            }}
          >
            {t('map.clearFilters')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
