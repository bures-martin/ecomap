import type { ReactNode } from 'react'
import type { PointDto } from '@/services/api'
import HomePage from '@/pages/HomePage'

export interface RouteConfig {
  path: string
  getElement: (props: RouteContext) => ReactNode
}

export interface RouteContext {
  sidebarOpen: boolean
  onCloseSidebar: () => void
  onPointCreated: (point: PointDto) => void
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    getElement: ({ sidebarOpen, onCloseSidebar, onPointCreated }) => (
      <HomePage sidebarOpen={sidebarOpen} onCloseSidebar={onCloseSidebar} onPointCreated={onPointCreated} />
    ),
  },
]
