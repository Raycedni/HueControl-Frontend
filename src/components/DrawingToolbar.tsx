import { Button } from '@/components/ui/button'
import { useRegionStore } from '@/store/useRegionStore'
import { deleteAllRegions } from '@/api/regions'

interface DrawingToolbarProps {
  onDelete: () => void
}

export function DrawingToolbar({ onDelete }: DrawingToolbarProps) {
  const drawingMode = useRegionStore((s) => s.drawingMode)
  const setDrawingMode = useRegionStore((s) => s.setDrawingMode)
  const setRegions = useRegionStore((s) => s.setRegions)
  const setSelectedId = useRegionStore((s) => s.setSelectedId)

  async function handleClearAll() {
    try {
      await deleteAllRegions()
      setRegions([])
      setSelectedId(null)
    } catch (err) {
      console.error('Failed to clear regions:', err)
    }
  }

  return (
    <div className="flex gap-2 p-2 border-b">
      <Button
        variant={drawingMode === 'rectangle' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDrawingMode('rectangle')}
      >
        Rectangle
      </Button>
      <Button
        variant={drawingMode === 'polygon' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDrawingMode('polygon')}
      >
        Polygon
      </Button>
      <Button
        variant={drawingMode === 'select' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDrawingMode('select')}
      >
        Select
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDelete}
      >
        Delete
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleClearAll}
      >
        Clear All
      </Button>
    </div>
  )
}
