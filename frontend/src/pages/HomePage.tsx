import { JSX } from 'react'
import Map from '@/features/map/Map'
import Sidebar from '@/features/sidebar/Sidebar'

interface HomePageProps {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

export default function HomePage({ sidebarOpen, onCloseSidebar }: HomePageProps): JSX.Element {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1">
        <Map />
      </div>
      <Sidebar open={sidebarOpen} onClose={onCloseSidebar} />
    </div>
  )
}
