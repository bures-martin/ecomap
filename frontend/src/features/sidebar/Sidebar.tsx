import { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onAddPoint: () => void
  picking: boolean
  onCancelPicking: () => void
}

export default function Sidebar({ open, onClose, onAddPoint, picking, onCancelPicking }: SidebarProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <aside
      className={`bg-background border-l border-border flex flex-col h-full overflow-hidden transition-all duration-300 ${open ? 'w-80 min-w-80' : 'w-0 min-w-0'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border whitespace-nowrap">
        <h2 className="text-lg font-semibold">{t('sidebar.title')}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('sidebar.close')}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {picking ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <MapPin className="h-4 w-4 animate-pulse" />
              {t('sidebar.pickingHint')}
            </div>
            <Button variant="outline" onClick={onCancelPicking} className="w-full">
              {t('sidebar.cancelPicking')}
            </Button>
          </div>
        ) : (
          <Button onClick={onAddPoint} className="w-full">
            <Plus className="h-4 w-4" />
            {t('sidebar.addPoint')}
          </Button>
        )}
      </div>
    </aside>
  )
}
