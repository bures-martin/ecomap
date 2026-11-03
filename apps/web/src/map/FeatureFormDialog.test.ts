import {
  createLayerInputSchema,
  layerFieldSchema,
  layerSchema,
  type CreateLayerInputDraft,
  type Feature,
  type Geometry,
  type Layer,
} from '@ecomap/shared';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FeatureFormDialog from './FeatureFormDialog.vue';
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

function dialogProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    open: true,
    layer: makeLayer(),
    geometry,
    existing: null,
    submitting: false,
    error: null,
    ...overrides,
  };
}

/** Vuetify renders a floating and a resting label for each field; either finds the input. */
function input(label: RegExp): HTMLElement {
  const [first] = screen.getAllByLabelText(label);
  if (!first) throw new Error(`No input labelled ${String(label)}`);
  return first;
}

describe('FeatureFormDialog', () => {
  it('renders the layer’s own fields, not a fixed set', async () => {
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

    await renderWithProviders(FeatureFormDialog, { props: dialogProps({ layer }) });

    expect(input(/species/i)).toBeInTheDocument();
    expect(input(/how many/i)).toBeInTheDocument();
    expect(input(/season/i)).toBeInTheDocument();
    expect(input(/confirmed/i)).toBeInTheDocument();
  });

  it('keeps submit disabled until a name is entered', async () => {
    const user = userEvent.setup();
    await renderWithProviders(FeatureFormDialog, { props: dialogProps() });

    const submit = screen.getByRole('button', { name: /add it/i });
    expect(submit).toBeDisabled();

    await user.type(input(/^name/i), 'Toad crossing');
    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
  });

  it('hands the entered values back on submit', async () => {
    const user = userEvent.setup();
    const layer = makeLayer({
      fields: [layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text' })],
    });

    const view = await renderWithProviders(FeatureFormDialog, {
      props: dialogProps({ layer }),
    });

    await user.type(input(/^name/i), 'Toad crossing');
    await user.type(input(/species/i), 'Bufo bufo');
    await user.click(screen.getByRole('button', { name: /add it/i }));

    expect(view.emitted()['submit']?.[0]).toEqual([
      expect.objectContaining({
        name: 'Toad crossing',
        properties: { species: 'Bufo bufo' },
        isDraft: false,
      }),
    ]);
  });

  it('shows a general message for an error it does not recognise', async () => {
    await renderWithProviders(FeatureFormDialog, {
      props: dialogProps({ error: new Error('the network went away') }),
    });

    /* An unrecognised error still surfaces as a general message, never silently. */
    const message = screen.getByText(/something went wrong/i);
    expect(message.closest('[role="alert"]')).not.toBeNull();
  });

  it('prefills the form when editing an existing contribution', async () => {
    const layer = makeLayer({
      fields: [layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text' })],
    });
    const existing: Feature = {
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
      createdByAvatarUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await renderWithProviders(FeatureFormDialog, {
      props: dialogProps({ layer, geometry: null, existing }),
    });

    expect(input(/^name/i)).toHaveValue('Existing toad');
    expect(input(/species/i)).toHaveValue('Bufo bufo');
    /* The draft checkbox is only meaningful for something not yet created. */
    expect(screen.queryByLabelText(/save as a draft/i)).not.toBeInTheDocument();
  });
});
