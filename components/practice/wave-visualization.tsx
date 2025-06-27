"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"

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

      if (!isActive) {
        // Draw flat line when not active
        ctx.strokeStyle = "#e5e7eb"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        ctx.lineTo(width, height / 2)
        ctx.stroke()
        return
      }

      // Draw animated wave when active
      const time = Date.now() * 0.005
      const amplitude = 20
      const frequency = 0.02

      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 3
      ctx.beginPath()

      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * frequency + time) * amplitude * (0.5 + 0.5 * Math.sin(x * 0.01 + time * 2))

        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()

      // Add glow effect
      ctx.shadowColor = "#3b82f6"
      ctx.shadowBlur = 10
      ctx.stroke()
      ctx.shadowBlur = 0

      if (isActive) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    draw()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center mb-2">
          <span className="text-sm text-muted-foreground">音频波形</span>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-20 rounded-lg bg-muted/30"
          style={{ width: "100%", height: "80px" }}
        />
      </CardContent>
    </Card>
  )
}
