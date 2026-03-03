import { JSX } from 'react'
import { useTranslation } from 'react-i18next'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <aside
      className={`bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden transition-all duration-300 ${open ? 'w-80 min-w-80' : 'w-0 min-w-0'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 whitespace-nowrap">
        <h2 className="text-lg font-semibold text-gray-800">{t('sidebar.title')}</h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label={t('sidebar.close')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
      </div>
    </aside>
  )
}
