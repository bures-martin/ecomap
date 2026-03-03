/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_LOCATION: string
  readonly VITE_MAP_CENTER_LAT: string
  readonly VITE_MAP_CENTER_LNG: string
  readonly VITE_MAP_ZOOM: string
  readonly VITE_MAP_BOUNDS_SOUTH: string
  readonly VITE_MAP_BOUNDS_WEST: string
  readonly VITE_MAP_BOUNDS_NORTH: string
  readonly VITE_MAP_BOUNDS_EAST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
