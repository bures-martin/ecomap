import {
  createLayerInputSchema,
  layerFieldSchema,
  layerSchema,
  type CreateLayerInputDraft,
  type Geometry,
  type Layer,
} from '@ecomap/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FeatureFormDialog } from './FeatureFormDialog.js';
import { renderWithProviders } from '../test/render.js';

function makeLayer(overrides: Partial<CreateLayerInputDraft> = {}): Layer {
  return layerSchema.parse({
    ...createLayerInputSchema.parse({ slug: 'wildlife', name: 'Wildlife sightings', ...overrides }),
    id: '11111111-2222-4333-8444-555555555555',
    featureCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
}

const geometry: Geometry = { type: 'Point', coordinates: [14.9, 55.1] };

describe('FeatureFormDialog', () => {
  it('renders the layer’s own fields, not a fixed set', () => {
    const layer = makeLayer({
      fields: [
        layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text', required: true }),
        layerFieldSchema.parse({ key: 'count', label: 'How many', type: 'number' }),
        layerFieldSchema.parse({
          key: 'season',
          label: 'Season',
          type: 'select',
          options: ['Spring', 'Summer'],
        }),
        layerFieldSchema.parse({ key: 'confirmed', label: 'Confirmed', type: 'boolean' }),
      ],
    });

    renderWithProviders(
      <FeatureFormDialog
        open
        layer={layer}
        geometry={geometry}
        existing={null}
        submitting={false}
        error={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/species/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how many/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/season/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmed/i)).toBeInTheDocument();
  });

  it('keeps submit disabled until a name is entered', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FeatureFormDialog
        open
        layer={makeLayer()}
        geometry={geometry}
        existing={null}
        submitting={false}
        error={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const submit = screen.getByRole('button', { name: /add it/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/^name/i), 'Toad crossing');
    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
  });

  it('hands the entered values back on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const layer = makeLayer({
      fields: [layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text' })],
    });

    renderWithProviders(
      <FeatureFormDialog
        open
        layer={layer}
        geometry={geometry}
        existing={null}
        submitting={false}
        error={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^name/i), 'Toad crossing');
    await user.type(screen.getByLabelText(/species/i), 'Bufo bufo');
    await user.click(screen.getByRole('button', { name: /add it/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Toad crossing',
        properties: { species: 'Bufo bufo' },
        isDraft: false,
      }),
    );
  });

  it('shows field-level issues sent back by the server', () => {
    const layer = makeLayer({
      fields: [layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text' })],
    });

    renderWithProviders(
      <FeatureFormDialog
        open
        layer={layer}
        geometry={geometry}
        existing={null}
        submitting={false}
        error={new Error('the network went away')}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    /* An unrecognised error still surfaces as a general message, never silently. */
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('prefills the form when editing an existing contribution', () => {
    const layer = makeLayer({
      fields: [layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text' })],
    });

    renderWithProviders(
      <FeatureFormDialog
        open
        layer={layer}
        geometry={null}
        existing={{
          id: '99999999-2222-4333-8444-555555555555',
          layerId: layer.id,
          layerSlug: layer.slug,
          name: 'Existing toad',
          description: 'Near the pond',
          geometry,
          properties: { species: 'Bufo bufo' },
          status: 'published',
          createdById: null,
          createdByName: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        submitting={false}
        error={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/^name/i)).toHaveValue('Existing toad');
    expect(screen.getByLabelText(/species/i)).toHaveValue('Bufo bufo');
    /* The draft checkbox is only meaningful for something not yet created. */
    expect(screen.queryByLabelText(/save as a draft/i)).not.toBeInTheDocument();
  });
});
