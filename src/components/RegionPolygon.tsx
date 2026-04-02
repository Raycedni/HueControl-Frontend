import { useRef, useState, useEffect } from 'react'
import { Group, Line, Circle, Text } from 'react-konva'
import type Konva from 'konva'
import type { Region } from '@/api/regions'
import { useRegionStore } from '@/store/useRegionStore'
import { denormalize, normalize } from '@/utils/geometry'
import { updateRegion as updateRegionAPI } from '@/api/regions'

interface RegionPolygonProps {
  region: Region
  isSelected: boolean
  stageWidth: number
  stageHeight: number
  color?: string
}

export function RegionPolygon({
  region,
  isSelected,
  stageWidth,
  stageHeight,
  color,
}: RegionPolygonProps) {
  const setSelectedId = useRegionStore((s) => s.setSelectedId)
  const setDrawingMode = useRegionStore((s) => s.setDrawingMode)
  const updateRegionInStore = useRegionStore((s) => s.updateRegion)

  // Local pixel coordinates for immediate visual feedback
  const [localPoints, setLocalPoints] = useState<[number, number][]>(() =>
    denormalize(region.polygon as [number, number][], stageWidth, stageHeight),
  )

  // Keep local points in sync when region changes OR stage dimensions change
  const prevRegionRef = useRef(region.polygon)
  const prevDimsRef = useRef({ w: stageWidth, h: stageHeight })
  if (
    region.polygon !== prevRegionRef.current ||
    stageWidth !== prevDimsRef.current.w ||
    stageHeight !== prevDimsRef.current.h
  ) {
    prevRegionRef.current = region.polygon
    prevDimsRef.current = { w: stageWidth, h: stageHeight }
    setLocalPoints(denormalize(region.polygon as [number, number][], stageWidth, stageHeight))
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctrlHeldRef = useRef(false)
  const dragStartPointsRef = useRef<[number, number][] | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Control') ctrlHeldRef.current = true }
    const up = (e: KeyboardEvent) => { if (e.key === 'Control') ctrlHeldRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  function scheduleSave(newPoints: [number, number][]) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const normalized = normalize(newPoints, stageWidth, stageHeight)
      try {
        await updateRegionAPI(region.id, { polygon: normalized })
        updateRegionInStore(region.id, { polygon: normalized })
      } catch (err) {
        console.error('Failed to save region:', err)
      }
    }, 400)
  }

  function handleGroupClick(e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    setSelectedId(region.id)
    setDrawingMode('select')
  }

  function handleGroupDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const dx = e.target.x()
    const dy = e.target.y()

    // Bake offset into points
    const newPoints: [number, number][] = localPoints.map(([x, y]) => [x + dx, y + dy])

    // Reset group position to avoid drift
    e.target.position({ x: 0, y: 0 })

    setLocalPoints(newPoints)
    scheduleSave(newPoints)
  }

  function handleVertexDragStart(_index: number) {
    dragStartPointsRef.current = localPoints.map(([x, y]) => [x, y] as [number, number])
  }

  function applyRectConstraint(
    index: number,
    newX: number,
    newY: number,
    base: [number, number][],
  ): [number, number][] {
    if (base.length !== 4 || ctrlHeldRef.current) {
      // Free-form: only move the dragged vertex
      const updated = [...base]
      updated[index] = [newX, newY]
      return updated
    }
    // Rectangle constraint: winding is TL(0), TR(1), BR(2), BL(3)
    // Adjacent vertices share an edge — determine horizontal vs vertical by
    // checking which coordinate was closer in the original rectangle.
    const prev = (index + 3) % 4
    const next = (index + 1) % 4
    const updated: [number, number][] = base.map(([x, y]) => [x, y])
    updated[index] = [newX, newY]

    const orig = dragStartPointsRef.current ?? base
    // prev-index edge: if they shared similar X, it's a vertical edge → sync X; else sync Y
    if (Math.abs(orig[prev][0] - orig[index][0]) < Math.abs(orig[prev][1] - orig[index][1])) {
      updated[prev] = [newX, updated[prev][1]]
    } else {
      updated[prev] = [updated[prev][0], newY]
    }
    // index-next edge: same logic
    if (Math.abs(orig[next][0] - orig[index][0]) < Math.abs(orig[next][1] - orig[index][1])) {
      updated[next] = [newX, updated[next][1]]
    } else {
      updated[next] = [updated[next][0], newY]
    }
    return updated
  }

  function handleVertexDragMove(index: number, e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true
    const newX = e.target.x()
    const newY = e.target.y()
    setLocalPoints((prev) => applyRectConstraint(index, newX, newY, prev))
  }

  function handleVertexDragEnd(index: number, e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true
    const newX = e.target.x()
    const newY = e.target.y()
    const newPoints = applyRectConstraint(index, newX, newY, localPoints)
    setLocalPoints(newPoints)
    scheduleSave(newPoints)
    dragStartPointsRef.current = null
  }

  // Compute centroid for label
  const cx = localPoints.reduce((sum, [x]) => sum + x, 0) / localPoints.length
  const cy = localPoints.reduce((sum, [, y]) => sum + y, 0) / localPoints.length

  const flatPoints = localPoints.flatMap(([x, y]) => [x, y])
  const fillColor = color ?? 'rgba(255,255,255,0.2)'

  return (
    <Group
      draggable={isSelected}
      onClick={handleGroupClick}
      onDragEnd={handleGroupDragEnd}
    >
      <Line
        points={flatPoints}
        closed
        fill={fillColor}
        stroke="white"
        strokeWidth={2}
        listening
      />
      <Text
        x={cx - 50}
        y={cy - 8}
        width={100}
        text={region.name}
        fontSize={12}
        fill={region.light_id ? 'yellow' : 'rgba(255,255,255,0.6)'}
        align="center"
        listening={false}
      />
      {/* Vertex handles — only when selected */}
      {isSelected &&
        localPoints.map(([x, y], i) => (
          <Circle
            key={i}
            x={x}
            y={y}
            radius={6}
            fill="white"
            draggable
            onDragStart={() => handleVertexDragStart(i)}
            onDragMove={(e) => handleVertexDragMove(i, e)}
            onDragEnd={(e) => handleVertexDragEnd(i, e)}
            onClick={(e) => {
              e.cancelBubble = true
            }}
          />
        ))}
    </Group>
  )
}
