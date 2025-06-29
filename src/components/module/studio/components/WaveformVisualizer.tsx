"use client"

import { useEffect, useRef, useState } from "react"

interface WaveformVisualizerProps {
  isPlaying: boolean
  isDark?: boolean
  className?: string
}

export function WaveformVisualizer({ isPlaying, isDark = false, className = "" }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [bars] = useState(() => Array.from({ length: 32 }, () => Math.random() * 0.5 + 0.1))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const animate = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const barWidth = width / bars.length
      const gradient = ctx.createLinearGradient(0, 0, width, 0)

      if (isDark) {
        gradient.addColorStop(0, "#10b981")
        gradient.addColorStop(0.5, "#3b82f6")
        gradient.addColorStop(1, "#8b5cf6")
      } else {
        gradient.addColorStop(0, "#059669")
        gradient.addColorStop(0.5, "#2563eb")
        gradient.addColorStop(1, "#7c3aed")
      }

      bars.forEach((bar, index) => {
        if (isPlaying) {
          if (typeof bars[index] !== "undefined") {
            bars[index] = Math.max(0.1, bars[index] + (Math.random() - 0.5) * 0.1)
            if (bars[index] > 1) bars[index] = 1
          }
        } else {
          if (typeof bars[index] !== "undefined") {
            bars[index] = Math.max(0.1, bars[index] * 0.95)
          }
        }

        const barHeight = bars[index]! * height * 0.8
        const x = index * barWidth
        const y = (height - barHeight) / 2

        ctx.fillStyle = gradient
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, bars, isDark])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={60}
      className={`w-full h-full ${className}`}
      style={{ imageRendering: "pixelated" }}
    />
  )
}
