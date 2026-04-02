import { useEffect, useRef, useState } from 'react'

export function usePreviewWS(enabled: boolean): string | null {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const prevUrlRef = useRef<string | null>(null)
  const destroyedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      destroyedRef.current = true
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current)
        prevUrlRef.current = null
      }
      setImgSrc(null)
      return
    }

    destroyedRef.current = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (destroyedRef.current) return

      const ws = new WebSocket(`ws://${location.host}/ws/preview`)
      ws.binaryType = 'blob'
      wsRef.current = ws

      ws.onmessage = (ev: MessageEvent) => {
        const blob = ev.data as Blob
        const url = URL.createObjectURL(blob)

        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current)
        }
        prevUrlRef.current = url
        setImgSrc(url)
      }

      ws.onclose = () => {
        if (!destroyedRef.current) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      destroyedRef.current = true
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current)
        prevUrlRef.current = null
      }
    }
  }, [enabled])

  return imgSrc
}
