import { JSX, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from '@/features/navbar/Navbar'
import { routes } from '@/routes/routes'

export default function App(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const routeContext = {
    sidebarOpen,
    onCloseSidebar: (): void => setSidebarOpen(false),
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Routes>
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={route.getElement(routeContext)}
          />
        ))}
      </Routes>
    </div>
  )
}
