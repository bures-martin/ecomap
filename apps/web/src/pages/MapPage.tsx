import {
  DEFAULT_COMMUNITY_SETTINGS,
  isGeometryWithinBBox,
  type Feature,
  type Geometry,
  type GeometryKind,
  type Layer,
} from '@ecomap/shared';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import {
  useCommunitySettings,
  useCreateFeature,
  useDeleteFeature,
  useFeatures,
  useLayers,
  useModerateFeature,
  useUpdateFeature,
} from '../api/hooks.js';
import { useAuth } from '../auth/useAuth.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { useToast } from '../components/ToastProvider.js';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { FeatureDetailsPanel } from '../map/FeatureDetailsPanel.js';
import { FeatureFormDialog, type FeatureFormValues } from '../map/FeatureFormDialog.js';
import { LayerFilterPanel } from '../map/LayerFilterPanel.js';
import { MapCanvas, featureCenter } from '../map/MapCanvas.js';
import { DrawingToolbar } from '../map/DrawingToolbar.js';
import { StartDrawingDialog } from '../map/StartDrawingDialog.js';
import { readFilters, writeFilters, type MapFilters } from '../map/filters.js';
import { useDrawing } from '../map/useDrawing.js';

const SIDEBAR_WIDTH = 320;

/**
 * The map, its filters and the whole contribute flow.
 *
 * Filter state is read from and written to the URL rather than held in this
 * component, so a filtered map is a link somebody can send to a neighbour.
 */
export function MapPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  /* The search box updates as you type; the URL and the request wait for a pause. */
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(searchDraft, 300);

  const settingsQuery = useCommunitySettings();
  const layersQuery = useLayers();
  const featuresQuery = useFeatures({ ...filters, q: debouncedSearch });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [deleting, setDeleting] = useState<Feature | null>(null);

  const drawing = useDrawing();
  const createFeature = useCreateFeature();
  const updateFeature = useUpdateFeature();
  const deleteFeature = useDeleteFeature();
  const moderateFeature = useModerateFeature();

  const settings = settingsQuery.data;
  const layers = useMemo(() => layersQuery.data ?? [], [layersQuery.data]);
  const features = useMemo(() => featuresQuery.data?.features ?? [], [featuresQuery.data]);
  const layersBySlug = useMemo(() => new Map(layers.map((layer) => [layer.slug, layer])), [layers]);

  const selectedFeatureId = searchParams.get('feature');
  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId],
  );

  /* Keep the search box in step when the URL changes underneath us (back button). */
  useEffect(() => {
    setSearchDraft((current) => (current === filters.q ? current : filters.q));
  }, [filters.q]);

  const applyFilters = useCallback(
    (next: MapFilters) => {
      setSearchParams((params) => writeFilters(next, params), { replace: true });
    },
    [setSearchParams],
  );

  /* Push the debounced search term into the URL once typing settles. */
  useEffect(() => {
    if (debouncedSearch === filters.q) return;
    applyFilters({ ...filters, q: debouncedSearch });
  }, [debouncedSearch, filters, applyFilters]);

  const selectFeature = useCallback(
    (feature: Feature | null) => {
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          if (feature) {
            next.set('feature', feature.id);
          } else {
            next.delete('feature');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedFeature) return featureCenter(selectedFeature);
    const view = settings?.initialView ?? DEFAULT_COMMUNITY_SETTINGS.initialView;
    return [view.lat, view.lng];
  }, [selectedFeature, settings?.initialView]);

  const mapZoom = settings?.initialView.zoom ?? DEFAULT_COMMUNITY_SETTINGS.initialView.zoom;

  const startDrawing = (layer: Layer, kind: GeometryKind) => {
    setStartDialogOpen(false);
    setEditing(null);
    setPendingGeometry(null);
    drawing.start(layer, kind);
  };

  const finishDrawing = () => {
    const geometry = drawing.toGeometry();
    if (!geometry) return;

    if (
      settings?.contributionBounds &&
      !isGeometryWithinBBox(geometry, settings.contributionBounds)
    ) {
      toast.showError(t('draw.outsideBounds'));
      return;
    }

    setPendingGeometry(geometry);
    setFormOpen(true);
  };

  const submitForm = (values: FeatureFormValues) => {
    if (editing) {
      updateFeature.mutate(
        {
          id: editing.id,
          input: {
            name: values.name,
            description: values.description,
            properties: values.properties,
          },
        },
        {
          onSuccess: () => {
            toast.showSuccess(t('feature.updated'));
            closeForm();
          },
          onError: (error) => {
            toast.showError(errorMessage(error));
          },
        },
      );
      return;
    }

    const layer = drawing.drawing?.layer;
    if (!layer || !pendingGeometry) return;

    createFeature.mutate(
      {
        layerId: layer.id,
        name: values.name,
        description: values.description,
        properties: values.properties,
        geometry: pendingGeometry,
        isDraft: values.isDraft,
      },
      {
        onSuccess: (feature) => {
          toast.showSuccess(
            feature.status === 'pending' ? t('feature.createdPending') : t('feature.created'),
          );
          closeForm();
          selectFeature(feature);
        },
        onError: (error) => {
          toast.showError(errorMessage(error));
        },
      },
    );
  };

  function closeForm() {
    setFormOpen(false);
    setPendingGeometry(null);
    setEditing(null);
    drawing.cancel();
  }

  const confirmDelete = () => {
    if (!deleting) return;
    deleteFeature.mutate(deleting.id, {
      onSuccess: () => {
        toast.showSuccess(t('feature.deleted'));
        selectFeature(null);
        setDeleting(null);
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
        setDeleting(null);
      },
    });
  };

  const sidebar = (
    <LayerFilterPanel
      layers={layers}
      filters={filters}
      searchDraft={searchDraft}
      onSearchDraftChange={setSearchDraft}
      onFiltersChange={applyFilters}
      shown={features.length}
      total={featuresQuery.data?.total ?? 0}
    />
  );

  const contributableLayers = layers.filter((layer) => layer.isPublished);

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
      {isDesktop ? (
        <Box
          component="aside"
          aria-label={t('map.filters')}
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          {sidebar}
        </Box>
      ) : (
        <Drawer
          open={sidebarOpen}
          onClose={() => {
            setSidebarOpen(false);
          }}
          slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH } } }}
        >
          {sidebar}
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {featuresQuery.isFetching && (
          <LinearProgress
            aria-label={t('app.loading')}
            sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1200 }}
          />
        )}

        <MapCanvas
          basemap={settings?.basemap ?? DEFAULT_COMMUNITY_SETTINGS.basemap}
          center={mapCenter}
          zoom={mapZoom}
          features={features}
          layersBySlug={layersBySlug}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={selectFeature}
          drawing={drawing.drawing}
          onDrawPosition={drawing.addPosition}
        />

        {drawing.drawing && (
          <DrawingToolbar
            drawing={drawing.drawing}
            canFinish={drawing.canFinish}
            onFinish={finishDrawing}
            onUndo={drawing.undo}
            onReset={drawing.reset}
            onCancel={drawing.cancel}
          />
        )}

        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {!isDesktop && (
            <Fab
              size="medium"
              color="default"
              aria-label={t('map.openLegend')}
              onClick={() => {
                setSidebarOpen(true);
              }}
            >
              <FilterListIcon />
            </Fab>
          )}

          {user ? (
            <Fab
              color="primary"
              aria-label={t('map.addContribution')}
              disabled={drawing.isDrawing || contributableLayers.length === 0}
              onClick={() => {
                setStartDialogOpen(true);
              }}
            >
              <AddIcon />
            </Fab>
          ) : (
            <Tooltip title={t('map.addContributionHint')}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  void navigate('/sign-in');
                }}
              >
                {t('map.addContribution')}
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      <StartDrawingDialog
        open={startDialogOpen}
        layers={contributableLayers}
        onStart={startDrawing}
        onCancel={() => {
          setStartDialogOpen(false);
        }}
      />

      <FeatureFormDialog
        open={formOpen}
        layer={editing ? layersBySlug.get(editing.layerSlug) : drawing.drawing?.layer}
        geometry={pendingGeometry}
        existing={editing}
        submitting={createFeature.isPending || updateFeature.isPending}
        error={createFeature.error ?? updateFeature.error}
        onSubmit={submitForm}
        onCancel={closeForm}
      />

      <FeatureDetailsPanel
        feature={selectedFeature}
        layer={selectedFeature ? layersBySlug.get(selectedFeature.layerSlug) : undefined}
        onClose={() => {
          selectFeature(null);
        }}
        onEdit={(feature) => {
          setEditing(feature);
          setPendingGeometry(null);
          setFormOpen(true);
        }}
        onDelete={setDeleting}
        onModerate={(feature, status) => {
          moderateFeature.mutate(
            { id: feature.id, input: { status } },
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
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('feature.deleteConfirmTitle')}
        body={t('feature.deleteConfirmBody', { name: deleting?.name ?? '' })}
        confirmLabel={t('app.delete')}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleting(null);
        }}
      />
    </Box>
  );
}
