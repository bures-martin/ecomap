import {
  FIELD_TYPES,
  GEOMETRY_KINDS,
  LAYER_ICONS,
  createLayerInputSchema,
  layerFieldSchema,
  type CreateLayerInput,
  type GeometryKind,
  type Layer,
  type LayerField,
} from '@ecomap/shared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateLayer, useDeleteLayer, useLayers, useUpdateLayer } from '../api/hooks.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { QueryBoundary } from '../components/QueryBoundary.js';
import { useToast } from '../components/ToastProvider.js';
import { fieldIssues, useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

/**
 * Layer administration - the CMS half of the application.
 *
 * Creating a layer here is the only thing needed to add a whole new category to
 * the map: the legend, the contribute form and the filters all follow from it.
 */
export function AdminLayersPage() {
  const { t } = useTranslation();
  const layersQuery = useLayers();
  const deleteLayer = useDeleteLayer();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();

  const [editing, setEditing] = useState<Layer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Layer | null>(null);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h1" sx={{ flexGrow: 1 }}>
          {t('layerAdmin.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setCreating(true);
          }}
        >
          {t('layerAdmin.newLayer')}
        </Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('layerAdmin.intro')}
      </Typography>

      <QueryBoundary query={layersQuery}>
        {(layers) => (
          <TableContainer component={Paper}>
            <Table aria-label={t('layerAdmin.title')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('layerAdmin.name')}</TableCell>
                  <TableCell>{t('layerAdmin.slug')}</TableCell>
                  <TableCell>{t('layerAdmin.geometries')}</TableCell>
                  <TableCell align="right">{t('map.layersHeading')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {layers.map((layer) => (
                  <TableRow key={layer.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          aria-hidden
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            bgcolor: layer.color,
                            flexShrink: 0,
                          }}
                        />
                        <span>{layer.name}</span>
                        {!layer.isPublished && <Chip size="small" label="hidden" />}
                        {layer.requiresModeration && <Chip size="small" label="reviewed" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code>{layer.slug}</code>
                    </TableCell>
                    <TableCell>{layer.allowedGeometries.join(', ')}</TableCell>
                    <TableCell align="right">{layer.featureCount}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label={`${t('app.edit')}: ${layer.name}`}
                        onClick={() => {
                          setEditing(layer);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label={`${t('app.delete')}: ${layer.name}`}
                        onClick={() => {
                          setDeleting(layer);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </QueryBoundary>

      <LayerFormDialog
        open={creating || editing !== null}
        layer={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('layerAdmin.deleteConfirmTitle', { name: deleting?.name ?? '' })}
        body={t('layerAdmin.deleteConfirmBody', { count: deleting?.featureCount ?? 0 })}
        confirmLabel={t('app.delete')}
        destructive
        onCancel={() => {
          setDeleting(null);
        }}
        onConfirm={() => {
          if (!deleting) return;
          deleteLayer.mutate(
            { id: deleting.id, confirm: true },
            {
              onSuccess: () => {
                toast.showSuccess(t('layerAdmin.deleted'));
                setDeleting(null);
              },
              onError: (error) => {
                toast.showError(errorMessage(error));
                setDeleting(null);
              },
            },
          );
        }}
      />
    </Container>
  );
}

type LayerDraft = CreateLayerInput;

function LayerFormDialog({
  open,
  layer,
  onClose,
}: {
  open: boolean;
  layer: Layer | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const createLayer = useCreateLayer();
  const updateLayer = useUpdateLayer();

  const [draft, setDraft] = useState<LayerDraft>(() => toDraft(layer));
  const [dialogKey, setDialogKey] = useState(0);

  /* Reset the draft whenever the dialog opens for a different layer. */
  const openKey = `${String(open)}:${layer?.id ?? 'new'}`;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    setDraft(toDraft(layer));
    setDialogKey((key) => key + 1);
  }

  const mutation = layer ? updateLayer : createLayer;
  const issues = fieldIssues(mutation.error);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();

    const parsed = createLayerInputSchema.safeParse(draft);
    if (!parsed.success) {
      toast.showError(parsed.error.issues[0]?.message ?? t('errors.validation_failed'));
      return;
    }

    const onSuccess = () => {
      toast.showSuccess(t('layerAdmin.saved'));
      onClose();
    };
    const onError = (error: unknown) => {
      toast.showError(errorMessage(error));
    };

    if (layer) {
      const { slug: _slug, ...rest } = parsed.data;
      updateLayer.mutate({ id: layer.id, input: rest }, { onSuccess, onError });
    } else {
      createLayer.mutate(parsed.data, { onSuccess, onError });
    }
  };

  const update = <K extends keyof LayerDraft>(key: K, value: LayerDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog key={dialogKey} open={open} onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{layer ? t('layerAdmin.editLayer') : t('layerAdmin.newLayer')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {mutation.error !== null && (
              <Alert severity="error">{errorMessage(mutation.error)}</Alert>
            )}

            <TextField
              label={t('layerAdmin.name')}
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;
                update('name', name);
                /* Suggest a slug while creating, never rewrite an existing one. */
                if (!layer) update('slug', slugify(name));
              }}
              required
              error={Boolean(issues['name'])}
              helperText={issues['name']}
            />

            <TextField
              label={t('layerAdmin.slug')}
              value={draft.slug}
              onChange={(event) => {
                update('slug', event.target.value);
              }}
              disabled={layer !== null}
              helperText={issues['slug'] ?? t('layerAdmin.slugHelp')}
              error={Boolean(issues['slug'])}
            />

            <TextField
              label={t('layerAdmin.description')}
              value={draft.description}
              onChange={(event) => {
                update('description', event.target.value);
              }}
              multiline
              minRows={2}
              helperText={t('layerAdmin.descriptionHelp')}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('layerAdmin.color')}
                type="color"
                value={draft.color}
                onChange={(event) => {
                  update('color', event.target.value);
                }}
                sx={{ maxWidth: { sm: 140 } }}
              />
              <TextField
                select
                label={t('layerAdmin.icon')}
                value={draft.icon}
                onChange={(event) => {
                  update('icon', event.target.value);
                }}
              >
                {LAYER_ICONS.map((icon) => (
                  <MenuItem key={icon} value={icon}>
                    {icon}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('layerAdmin.sortOrder')}
                type="number"
                value={draft.sortOrder}
                onChange={(event) => {
                  update('sortOrder', Number(event.target.value));
                }}
                sx={{ maxWidth: { sm: 120 } }}
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" id="geometry-heading" gutterBottom>
                {t('layerAdmin.geometries')}
              </Typography>
              <ToggleButtonGroup
                value={draft.allowedGeometries}
                onChange={(_event, value: GeometryKind[]) => {
                  /* A layer with no geometry could never be contributed to. */
                  if (value.length > 0) update('allowedGeometries', value);
                }}
                aria-labelledby="geometry-heading"
                size="small"
              >
                {GEOMETRY_KINDS.map((kind) => (
                  <ToggleButton key={kind} value={kind}>
                    {t(
                      kind === 'Point'
                        ? 'draw.point'
                        : kind === 'LineString'
                          ? 'draw.line'
                          : 'draw.polygon',
                    )}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draft.isPublished}
                    onChange={(event) => {
                      update('isPublished', event.target.checked);
                    }}
                  />
                }
                label={t('layerAdmin.published')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draft.requiresModeration}
                    onChange={(event) => {
                      update('requiresModeration', event.target.checked);
                    }}
                  />
                }
                label={t('layerAdmin.requiresModeration')}
              />
            </Stack>

            <Divider />

            <FieldsEditor
              fields={draft.fields}
              onChange={(fields) => {
                update('fields', fields);
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('app.cancel')}</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            {t('app.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function FieldsEditor({
  fields,
  onChange,
}: {
  fields: LayerField[];
  onChange: (fields: LayerField[]) => void;
}) {
  const { t } = useTranslation();

  const updateField = (index: number, patch: Partial<LayerField>) => {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  return (
    <Box component="section" aria-labelledby="fields-heading">
      <Typography variant="subtitle2" id="fields-heading">
        {t('layerAdmin.fields')}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        {t('layerAdmin.fieldsIntro')}
      </Typography>

      <Stack spacing={2}>
        {fields.map((field, index) => (
          <Paper key={`${field.key}-${String(index)}`} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={t('layerAdmin.fieldLabel')}
                  value={field.label}
                  onChange={(event) => {
                    updateField(index, { label: event.target.value });
                  }}
                />
                <TextField
                  label={t('layerAdmin.fieldKey')}
                  value={field.key}
                  onChange={(event) => {
                    updateField(index, { key: event.target.value });
                  }}
                />
                <TextField
                  select
                  label={t('layerAdmin.fieldType')}
                  value={field.type}
                  onChange={(event) => {
                    updateField(index, { type: event.target.value as LayerField['type'] });
                  }}
                >
                  {FIELD_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {t(`layerAdmin.fieldTypes.${type}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {field.type === 'select' && (
                <TextField
                  label={t('layerAdmin.fieldOptions')}
                  helperText={t('layerAdmin.fieldOptionsHelp')}
                  value={field.options.join('\n')}
                  onChange={(event) => {
                    updateField(index, {
                      options: event.target.value
                        .split('\n')
                        .map((option) => option.trim())
                        .filter((option) => option.length > 0),
                    });
                  }}
                  multiline
                  minRows={2}
                />
              )}

              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.required}
                      onChange={(event) => {
                        updateField(index, { required: event.target.checked });
                      }}
                    />
                  }
                  label={t('layerAdmin.fieldRequired')}
                />
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  aria-label={t('layerAdmin.removeField')}
                  onClick={() => {
                    onChange(fields.filter((_, i) => i !== index));
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        ))}

        <Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              onChange([
                ...fields,
                layerFieldSchema.parse({
                  key: `field${String(fields.length + 1)}`,
                  label: '',
                  type: 'text',
                }),
              ]);
            }}
          >
            {t('layerAdmin.addField')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function toDraft(layer: Layer | null): LayerDraft {
  if (!layer) {
    return createLayerInputSchema.parse({ slug: 'new-layer', name: '' });
  }
  return {
    slug: layer.slug,
    name: layer.name,
    description: layer.description,
    color: layer.color,
    icon: layer.icon,
    allowedGeometries: [...layer.allowedGeometries],
    fields: layer.fields.map((field) => ({ ...field })),
    sortOrder: layer.sortOrder,
    isPublished: layer.isPublished,
    requiresModeration: layer.requiresModeration,
  };
}

/** Mirrors `slugSchema`: lowercase words joined by single hyphens. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
