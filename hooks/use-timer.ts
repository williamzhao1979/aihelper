"use client"

import { useState, useRef, useCallback } from "react"

export function useTimer() {
  const [time, setTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const start = useCallback(() => {
    if (intervalRef.current) return

    intervalRef.current = setInterval(() => {
      setTime((prev) => prev + 1)
    }, 1000)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stop()
    setTime(0)
  }, [stop])

  return { time, start, stop, reset }
}
