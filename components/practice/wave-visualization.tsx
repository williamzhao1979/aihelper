"use client"

import { useEffect, useRef } from "react"

interface WaveVisualizationProps {
  isActive: boolean
}

export function WaveVisualization({ isActive }: WaveVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      if (isActive) {
        // Draw animated wave
        const time = Date.now() * 0.005
        const amplitude = 20
        const frequency = 0.02

        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.beginPath()

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * frequency + time) * amplitude * Math.random()
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.stroke()
      } else {
        // Draw flat line
        ctx.strokeStyle = "#9ca3af"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        ctx.lineTo(width, height / 2)
        ctx.stroke()
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  return (
    <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} width={800} height={96} className="w-full h-full" />
    </div>
  )
}
