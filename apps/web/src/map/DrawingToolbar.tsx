import type { GeometryKind } from '@ecomap/shared';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import UndoIcon from '@mui/icons-material/Undo';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { MINIMUM_POSITIONS, type DrawingState } from './useDrawing.js';

const HINT_KEY: Readonly<Record<GeometryKind, string>> = {
  Point: 'draw.pointHint',
  LineString: 'draw.lineHint',
  Polygon: 'draw.polygonHint',
};

/**
 * Floating bar shown while the user is drawing.
 *
 * It is a live region: the running point count is announced, which is the only
 * feedback a screen-reader user gets from clicking on a map.
 */
export function DrawingToolbar({
  drawing,
  canFinish,
  onFinish,
  onUndo,
  onReset,
  onCancel,
}: {
  drawing: DrawingState;
  canFinish: boolean;
  onFinish: () => void;
  onUndo: () => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const needed = MINIMUM_POSITIONS[drawing.kind];

  return (
    <Paper
      elevation={6}
      role="region"
      aria-label={t('draw.drawing')}
      sx={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        px: 2,
        py: 1.5,
        maxWidth: 'calc(100% - 24px)',
      }}
    >
      <Stack spacing={1}>
        <Typography variant="body2" aria-live="polite">
          <strong>{drawing.layer.name}</strong> · {t(HINT_KEY[drawing.kind])}{' '}
          {drawing.positions.length > 0 && `(${String(drawing.positions.length)})`}
          {!canFinish && drawing.positions.length > 0 && (
            <> {t('draw.needMorePoints', { count: needed })}</>
          )}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="contained"
            startIcon={<CheckIcon />}
            disabled={!canFinish}
            onClick={onFinish}
          >
            {t('draw.finish')}
          </Button>
          <Button
            size="small"
            startIcon={<UndoIcon />}
            disabled={drawing.positions.length === 0}
            onClick={onUndo}
          >
            {t('draw.undoPoint')}
          </Button>
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            disabled={drawing.positions.length === 0}
            onClick={onReset}
          >
            {t('draw.startOver')}
          </Button>
          <Button size="small" color="inherit" startIcon={<CloseIcon />} onClick={onCancel}>
            {t('draw.cancelDrawing')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
