import { JSX, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pointsApi, type CreatePointPayload, type PointDto } from '@/services/api'
import type { LatLng } from '@/features/map/Map'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AddPointModalProps {
  open: boolean
  coords: LatLng | null
  onClose: () => void
  onCreated: (point: PointDto) => void
}

export default function AddPointModal({ open, coords, onClose, onCreated }: AddPointModalProps): JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
      setError(null)
    }
  }, [open])

  const handleOpenChange = (value: boolean): void => {
    if (!value) onClose()
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('addPoint.errors.nameRequired'))
      return
    }
    if (!coords) {
      setError(t('addPoint.errors.invalidCoords'))
      return
    }

    setSubmitting(true)
    try {
      const payload: CreatePointPayload = {
        name: name.trim(),
        description: description.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
      }
      const { data } = await pointsApi.create(payload)
      onCreated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addPoint.errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('addPoint.title')}</DialogTitle>
            <DialogDescription>{t('addPoint.subtitle')}</DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="point-name">{t('addPoint.name')}</Label>
            <Input
              id="point-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="point-description">{t('addPoint.description')}</Label>
            <Textarea
              id="point-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="point-lat">{t('addPoint.latitude')}</Label>
              <Input
                id="point-lat"
                type="number"
                step="any"
                value={coords?.lat ?? ''}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="point-lng">{t('addPoint.longitude')}</Label>
              <Input
                id="point-lng"
                type="number"
                step="any"
                value={coords?.lng ?? ''}
                disabled
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('addPoint.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('addPoint.submitting') : t('addPoint.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
