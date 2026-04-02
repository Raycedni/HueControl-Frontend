import { useEffect, useRef, useState } from 'react'
import { DrawingToolbar } from './DrawingToolbar'
import { EditorCanvas, handleEditorDelete } from './EditorCanvas'
import { LightPanel } from './LightPanel'
import { useRegionStore } from '@/store/useRegionStore'

export function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasDims, setCanvasDims] = useState({ width: 640, height: 360 })

  const regions = useRegionStore((s) => s.regions)
  const assignedCount = regions.filter((r) => r.light_id !== null).length

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function fitCanvas(containerW: number, containerH: number) {
      const w = Math.floor(containerW)
      const h = Math.floor(containerH)
      if (w <= 0 || h <= 0) return
      // Fit 16:9 within available space
      const byWidth = { width: w, height: Math.round(w * 9 / 16) }
      if (byWidth.height <= h) {
        setCanvasDims(byWidth)
      } else {
        // Height-constrained
        const fitW = Math.round(h * 16 / 9)
        setCanvasDims({ width: fitW, height: h })
      }
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        fitCanvas(entry.contentRect.width, entry.contentRect.height)
      }
    })
    observer.observe(container)

    // Set initial size
    fitCanvas(container.clientWidth, container.clientHeight)

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-1 min-h-0 text-left">
      {/* Left: canvas area ~70% */}
      <div className="flex flex-col flex-[7]">
        <DrawingToolbar onDelete={handleEditorDelete} />
        {assignedCount > 20 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-xs px-3 py-2 text-center">
            {assignedCount}/20 channels assigned — bridge will ignore excess channels.
          </div>
        )}
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <EditorCanvas
            width={canvasDims.width}
            height={canvasDims.height}
            onDeleteRequest={handleEditorDelete}
          />
        </div>
      </div>

      {/* Right: light panel ~30% */}
      <div className="flex flex-[3] min-h-0 overflow-hidden">
        <LightPanel />
      </div>
    </div>
  )
}
