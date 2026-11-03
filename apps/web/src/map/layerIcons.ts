import type { LayerIcon } from '@ecomap/shared';
import {
  mdiAccountGroup,
  mdiAlert,
  mdiBank,
  mdiBasket,
  mdiBike,
  mdiBookOpenVariant,
  mdiCarrot,
  mdiEvStation,
  mdiHeart,
  mdiLeaf,
  mdiMapMarker,
  mdiPaw,
  mdiPineTree,
  mdiRecycle,
  mdiStorefrontOutline,
  mdiWater,
  mdiWhiteBalanceSunny,
} from '@mdi/js';

/**
 * The icon an admin picks for a layer, as Material Design Icons path data
 * (24x24). The `Record` makes a new icon in `LAYER_ICONS` a type error here
 * until it has a picture.
 */
const LAYER_ICON_PATHS: Readonly<Record<LayerIcon, string>> = {
  leaf: mdiLeaf,
  tree: mdiPineTree,
  paw: mdiPaw,
  bike: mdiBike,
  recycle: mdiRecycle,
  sun: mdiWhiteBalanceSunny,
  droplet: mdiWater,
  basket: mdiBasket,
  people: mdiAccountGroup,
  book: mdiBookOpenVariant,
  landmark: mdiBank,
  alert: mdiAlert,
  heart: mdiHeart,
  pin: mdiMapMarker,
  plug: mdiEvStation,
  carrot: mdiCarrot,
  store: mdiStorefrontOutline,
};

/** Path data for a layer's icon; an unknown name (an older layer) falls back to a pin. */
export function layerIconPath(icon: string): string {
  return (LAYER_ICON_PATHS as Readonly<Record<string, string | undefined>>)[icon] ?? mdiMapMarker;
}
