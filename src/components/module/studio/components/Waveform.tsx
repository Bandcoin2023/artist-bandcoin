"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import type { AudioFile } from "../types/audio"

interface WaveformProps {
  audioFile: AudioFile
  width: number
  height: number
  startTime?: number
  endTime?: number
  color?: string
  isDark: boolean
}

export const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  height,
  startTime = 0,
  endTime,
  color = "#8B5CF6",
  isDark,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!audioFile.waveformData || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with device pixel ratio for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const waveformData = audioFile.waveformData
    const actualEndTime = endTime ?? audioFile.duration

    // Ensure we have valid time ranges
    const validStartTime = Math.max(0, Math.min(startTime, audioFile.duration))
    const validEndTime = Math.max(validStartTime + 0.01, Math.min(actualEndTime, audioFile.duration))

    // Calculate which part of the waveform to show based on trim points
    const startRatio = validStartTime / audioFile.duration
    const endRatio = validEndTime / audioFile.duration

    // Calculate indices with better precision
    const totalSamples = waveformData.length
    const startIndex = Math.floor(startRatio * totalSamples)
    const endIndex = Math.min(totalSamples, Math.ceil(endRatio * totalSamples))

    // Ensure we have at least some data to show
    const actualStartIndex = Math.max(0, startIndex)
    const actualEndIndex = Math.max(actualStartIndex + 1, endIndex)

    const visibleData = waveformData.slice(actualStartIndex, actualEndIndex)

    if (visibleData.length === 0) {
      // Draw a flat line if no data
      ctx.strokeStyle = `rgba(139, 92, 246, 0.3)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
      return
    }

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    const baseColor = color ?? "#8B5CF6"

    // Convert hex to RGB for gradient manipulation
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
          r: Number.parseInt(result[1] ?? "00", 16),
          g: Number.parseInt(result[2] ?? "00", 16),
          b: Number.parseInt(result[3] ?? "00", 16),
        }
        : { r: 139, g: 92, b: 246 }
    }

    const rgb = hexToRgb(baseColor)

    if (isDark) {
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`)
      gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`)
      gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`)
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
    } else {
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`)
      gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`)
      gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`)
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`)
    }

    ctx.fillStyle = gradient

    // Draw waveform
    const centerY = height / 2
    const maxAmplitude = Math.max(...visibleData.map(Math.abs))

    if (maxAmplitude === 0) {
      // Draw a flat line if no audio data
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(width, centerY)
      ctx.stroke()
      return
    }

    // Calculate samples per pixel for smooth rendering
    const samplesPerPixel = visibleData.length / width

    ctx.beginPath()
    ctx.moveTo(0, centerY)

    // Draw upper part of waveform with better interpolation
    for (let x = 0; x < width; x++) {
      let maxSample = 0
      let minSample = 0

      // Sample multiple points per pixel for better accuracy
      const startSample = Math.floor(x * samplesPerPixel)
      const endSample = Math.min(visibleData.length - 1, Math.floor((x + 1) * samplesPerPixel))

      for (let i = startSample; i <= endSample; i++) {
        const sample = visibleData[i] ?? 0
        maxSample = Math.max(maxSample, sample)
        minSample = Math.min(minSample, sample)
      }

      // Normalize and calculate Y positions
      const normalizedMax = maxSample / maxAmplitude
      const normalizedMin = minSample / maxAmplitude

      const yMax = centerY - normalizedMax * centerY * 0.9
      const yMin = centerY - normalizedMin * centerY * 0.9

      if (x === 0) {
        ctx.moveTo(x, yMax)
      } else {
        ctx.lineTo(x, yMax)
      }
    }

    // Draw lower part of waveform (mirror)
    for (let x = width - 1; x >= 0; x--) {
      let maxSample = 0
      let minSample = 0

      const startSample = Math.floor(x * samplesPerPixel)
      const endSample = Math.min(visibleData.length - 1, Math.floor((x + 1) * samplesPerPixel))

      for (let i = startSample; i <= endSample; i++) {
        const sample = visibleData[i] ?? 0
        maxSample = Math.max(maxSample, sample)
        minSample = Math.min(minSample, sample)
      }

      const normalizedMax = maxSample / maxAmplitude
      const normalizedMin = minSample / maxAmplitude

      const yMax = centerY + normalizedMax * centerY * 0.9
      const yMin = centerY + normalizedMin * centerY * 0.9

      ctx.lineTo(x, yMax)
    }

    ctx.closePath()
    ctx.fill()

    // Add subtle outline
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Add center line
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()

    // Add debug info for development (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Waveform render: ${audioFile.name}, samples: ${visibleData.length}, width: ${width}, startTime: ${validStartTime}, endTime: ${validEndTime}`,
      )
    }
  }, [audioFile.waveformData, audioFile.duration, audioFile.name, width, height, startTime, endTime, color, isDark])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ width, height }} />
  )
}
