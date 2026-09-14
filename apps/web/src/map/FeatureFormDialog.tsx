import type { Feature, Geometry, Layer, LayerField, PropertyBag } from '@ecomap/shared';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiErrorMessage, fieldIssues } from '../hooks/useApiErrorMessage.js';

/**
 * The contribution form.
 *
 * The fields below name and description are generated from the layer's own
 * definition, which is the point of the whole design: adding a field to a layer
 * changes this form with no code change.
 */

export interface FeatureFormValues {
  name: string;
  description: string;
  properties: PropertyBag;
  isDraft: boolean;
}

export function FeatureFormDialog({
  open,
  layer,
  geometry,
  existing,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  layer: Layer | undefined;
  /** The drawn geometry for a new contribution; absent when editing text only. */
  geometry: Geometry | null;
  existing: Feature | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: FeatureFormValues) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const errorMessage = useApiErrorMessage();
  const issues = fieldIssues(error);

  const [values, setValues] = useState<FeatureFormValues>(emptyValues);

  /* Reload the form whenever it opens for a different feature. */
  useEffect(() => {
    if (!open) return;
    setValues(
      existing
        ? {
            name: existing.name,
            description: existing.description,
            properties: { ...existing.properties },
            isDraft: existing.status === 'draft',
          }
        : emptyValues(),
    );
  }, [open, existing]);

  if (!layer) return null;

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  const setProperty = (key: string, value: PropertyBag[string]) => {
    setValues((current) => ({ ...current, properties: { ...current.properties, [key]: value } }));
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>
          {existing
            ? t('feature.editTitle', { name: existing.name })
            : t('feature.addTitle', { layer: layer.name })}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error !== null && error !== undefined && (
              <Alert severity="error">{errorMessage(error)}</Alert>
            )}

            {layer.description && !existing && (
              <Alert severity="info" icon={false}>
                {layer.description}
              </Alert>
            )}

            <TextField
              label={t('feature.name')}
              value={values.name}
              onChange={(event) => {
                setValues((current) => ({ ...current, name: event.target.value }));
              }}
              required
              autoFocus
              error={Boolean(issues['name'])}
              helperText={issues['name']}
            />

            <TextField
              label={t('feature.description')}
              value={values.description}
              onChange={(event) => {
                setValues((current) => ({ ...current, description: event.target.value }));
              }}
              multiline
              minRows={3}
              helperText={issues['description'] ?? t('feature.descriptionHelp')}
              error={Boolean(issues['description'])}
            />

            {layer.fields.map((field) => (
              <LayerFieldInput
                key={field.key}
                field={field}
                value={values.properties[field.key]}
                error={issues[`properties.${field.key}`] ?? issues[field.key]}
                onChange={(value) => {
                  setProperty(field.key, value);
                }}
              />
            ))}

            {!existing && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.isDraft}
                    onChange={(event) => {
                      setValues((current) => ({ ...current, isDraft: event.target.checked }));
                    }}
                  />
                }
                label={t('feature.saveAsDraft')}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onCancel}>{t('app.cancel')}</Button>
          <Button
            type="submit"
            variant="contained"
            loading={submitting}
            disabled={values.name.trim().length < 2 || (!existing && geometry === null)}
          >
            {existing ? t('feature.submitEdit') : t('feature.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function LayerFieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: LayerField;
  /** Undefined while the contributor has not touched this field yet. */
  value: PropertyBag[string] | undefined;
  error: string | undefined;
  onChange: (value: PropertyBag[string]) => void;
}) {
  const helperText = error ?? (field.helpText || undefined);

  if (field.type === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Checkbox
            checked={value === true}
            onChange={(event) => {
              onChange(event.target.checked);
            }}
          />
        }
        label={field.label}
      />
    );
  }

  const shared = {
    label: field.label,
    required: field.required,
    error: Boolean(error),
    helperText,
  };

  if (field.type === 'select') {
    return (
      <TextField
        {...shared}
        select
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <MenuItem value="">—</MenuItem>
        {field.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === 'number') {
    return (
      <TextField
        {...shared}
        type="number"
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    );
  }

  return (
    <TextField
      {...shared}
      type={field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
      multiline={field.type === 'longtext'}
      minRows={field.type === 'longtext' ? 3 : undefined}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      slotProps={field.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}

function emptyValues(): FeatureFormValues {
  return { name: '', description: '', properties: {}, isDraft: false };
}
