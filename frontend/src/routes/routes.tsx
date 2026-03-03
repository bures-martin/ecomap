import type { ReactNode } from 'react'
import HomePage from '@/pages/HomePage'

export interface RouteConfig {
  path: string
  getElement: (props: RouteContext) => ReactNode
}

export interface RouteContext {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    getElement: ({ sidebarOpen, onCloseSidebar }) => (
      <HomePage sidebarOpen={sidebarOpen} onCloseSidebar={onCloseSidebar} />
    ),
  },
]
