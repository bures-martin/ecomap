import { ref } from 'vue';

/**
 * The read-only demo build (`VITE_DEMO=true`, e.g. on GitHub Pages): the map,
 * filters and places work; signing in and adding places explain that this is
 * a demo instead (see DemoDialog.vue).
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true';

/** One dialog for the whole app, opened from wherever a visitor runs into the demo's limits. */
const dialogOpen = ref(false);

export function useDemoDialog() {
  return {
    open: dialogOpen,
    show: (): void => {
      dialogOpen.value = true;
    },
    hide: (): void => {
      dialogOpen.value = false;
    },
  };
}
