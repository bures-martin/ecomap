import { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavbarProps {
  onToggleSidebar: () => void
}

export default function Navbar({ onToggleSidebar }: NavbarProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="bg-navbar text-navbar-foreground shadow-md z-10">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-90">
          {t('navbar.brand')}
          {import.meta.env.VITE_APP_LOCATION && (
            <span className="ml-1.5 font-normal opacity-80">
              {import.meta.env.VITE_APP_LOCATION}
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={t('navbar.toggleSidebar')}
          className="text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-foreground"
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  )
}
