import { JSX, useEffect, useRef } from 'react'
import L from 'leaflet'

export default function Map(): JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

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
