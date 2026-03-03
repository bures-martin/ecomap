import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { JSX } from 'react'

interface NavbarProps {
  onToggleSidebar: () => void
}

export default function Navbar({ onToggleSidebar }: NavbarProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="bg-green-700 text-white shadow-md z-10">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-90">
          {t('navbar.brand')}
          {import.meta.env.VITE_APP_LOCATION && (
            <span className="ml-1.5 font-normal">
              {import.meta.env.VITE_APP_LOCATION}
            </span>
          )}
        </Link>
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-green-600 transition-colors cursor-pointer"
          aria-label={t('navbar.toggleSidebar')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
