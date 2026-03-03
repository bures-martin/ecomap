import { JSX, useEffect, useRef } from 'react'
import L from 'leaflet'

export interface LatLng {
  lat: number
  lng: number
}

interface MapProps {
  picking?: boolean | undefined
  onMapClick?: ((coords: LatLng) => void) | undefined
}

export default function Map({ picking, onMapClick }: MapProps): JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const onMapClickRef = useRef(onMapClick)

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    const container = mapInstanceRef.current?.getContainer()
    if (!container) return
    if (picking) {
      container.classList.add('picking-mode')
    } else {
      container.classList.remove('picking-mode')
    }
  }, [picking])

  useEffect((): void | (() => void) => {
    if (!mapRef.current || mapInstanceRef.current) return

    const center: L.LatLngTuple = [
      parseFloat(import.meta.env.VITE_MAP_CENTER_LAT),
      parseFloat(import.meta.env.VITE_MAP_CENTER_LNG),
    ]
    const zoom = parseInt(import.meta.env.VITE_MAP_ZOOM, 10)

    const bounds = L.latLngBounds(
      [parseFloat(import.meta.env.VITE_MAP_BOUNDS_SOUTH), parseFloat(import.meta.env.VITE_MAP_BOUNDS_WEST)],
      [parseFloat(import.meta.env.VITE_MAP_BOUNDS_NORTH), parseFloat(import.meta.env.VITE_MAP_BOUNDS_EAST)],
    )

    mapInstanceRef.current = L.map(mapRef.current, {
      center,
      zoom,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      minZoom: zoom,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstanceRef.current)

    mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({
        lat: Math.round(e.latlng.lat * 1e6) / 1e6,
        lng: Math.round(e.latlng.lng * 1e6) / 1e6,
      })
    })

    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize()
    })
    observer.observe(mapRef.current)

    return (): void => {
      observer.disconnect()
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  return <div ref={mapRef} className="h-full w-full" />
}
