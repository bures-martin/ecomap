import { JSX, useCallback, useState } from 'react'
import Map from '@/features/map/Map'
import type { LatLng } from '@/features/map/Map'
import Sidebar from '@/features/sidebar/Sidebar'
import AddPointModal from '@/features/points/AddPointModal'
import type { PointDto } from '@/services/api'

interface HomePageProps {
  sidebarOpen: boolean
  onCloseSidebar: () => void
  onPointCreated: (point: PointDto) => void
}

export default function HomePage({ sidebarOpen, onCloseSidebar, onPointCreated }: HomePageProps): JSX.Element {
  const [picking, setPicking] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [coords, setCoords] = useState<LatLng | null>(null)

  const handleAddPoint = (): void => {
    setPicking(true)
  }

  const handleMapClick = useCallback((latlng: LatLng): void => {
    if (!picking) return
    setPicking(false)
    setCoords(latlng)
    setModalOpen(true)
  }, [picking])

  const handleClose = (): void => {
    setModalOpen(false)
    setCoords(null)
  }

  const handleCreated = (point: PointDto): void => {
    handleClose()
    onPointCreated(point)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1">
        <Map picking={picking} onMapClick={handleMapClick} />
      </div>
      <Sidebar
        open={sidebarOpen}
        onClose={onCloseSidebar}
        onAddPoint={handleAddPoint}
        picking={picking}
        onCancelPicking={() => setPicking(false)}
      />
      <AddPointModal
        open={modalOpen}
        coords={coords}
        onClose={handleClose}
        onCreated={handleCreated}
      />
    </div>
  )
}
