import type { GeometryKind, Layer } from '@ecomap/shared';
import PlaceIcon from '@mui/icons-material/Place';
import PolylineIcon from '@mui/icons-material/Polyline';
import TimelineIcon from '@mui/icons-material/Timeline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const KIND_ICON: Readonly<Record<GeometryKind, ReactNode>> = {
  Point: <PlaceIcon />,
  LineString: <TimelineIcon />,
  Polygon: <PolylineIcon />,
};

const KIND_LABEL: Readonly<Record<GeometryKind, string>> = {
  Point: 'draw.point',
  LineString: 'draw.line',
  Polygon: 'draw.polygon',
};

/**
 * Step one of adding something: which layer, and what shape.
 *
 * Only the geometries the chosen layer accepts are offered, so a "nature trails"
 * layer never invites somebody to drop a pin.
 */
export function StartDrawingDialog({
  open,
  layers,
  onStart,
  onCancel,
}: {
  open: boolean;
  layers: Layer[];
  onStart: (layer: Layer, kind: GeometryKind) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [layerId, setLayerId] = useState('');

  useEffect(() => {
    if (open) setLayerId(layers[0]?.id ?? '');
  }, [open, layers]);

  const layer = layers.find((candidate) => candidate.id === layerId);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{t('map.addContribution')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('draw.chooseLayer')}
            value={layerId}
            onChange={(event) => {
              setLayerId(event.target.value);
            }}
          >
            {layers.map((candidate) => (
              <MenuItem key={candidate.id} value={candidate.id}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    aria-hidden
                    sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: candidate.color }}
                  />
                  <span>{candidate.name}</span>
                </Stack>
              </MenuItem>
            ))}
          </TextField>

          {layer?.description && (
            <Typography variant="body2" color="text.secondary">
              {layer.description}
            </Typography>
          )}

          {layer && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }} id="placement-heading">
                {t('draw.choosePlacement')}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                role="group"
                aria-labelledby="placement-heading"
              >
                {layer.allowedGeometries.map((kind) => (
                  <Button
                    key={kind}
                    variant="outlined"
                    startIcon={KIND_ICON[kind]}
                    onClick={() => {
                      onStart(layer, kind);
                    }}
                  >
                    {t(KIND_LABEL[kind])}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('app.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}
