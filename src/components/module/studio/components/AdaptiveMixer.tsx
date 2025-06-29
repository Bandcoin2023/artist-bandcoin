"use client"

import type React from "react"
import { Volume2, Sliders, RotateCcw, TrendingUp, BarChart3 } from "lucide-react"

interface AdaptiveMixerProps {
  masterVolume: number
  onMasterVolumeChange: (volume: number) => void
  masterEQ: {
    low: number
    mid: number
    high: number
  }
  onEQChange: (band: "low" | "mid" | "high", value: number) => void
  isDark: boolean
}

export const AdaptiveMixer: React.FC<AdaptiveMixerProps> = ({
  masterVolume,
  onMasterVolumeChange,
  masterEQ,
  onEQChange,
  isDark,
}) => {
  const resetEQ = () => {
    onEQChange("low", 0)
    onEQChange("mid", 0)
    onEQChange("high", 0)
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold `}>Master Mixer</h2>
            <p className={`text-sm`}>Global audio controls</p>
          </div>
        </div>
      </div>

      {/* Master Volume */}
      <div className={`p-6 rounded-2xl bg-primary shadow-md  `}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Volume2 className={`w-5 h-5 `} />
            <label className={`text-sm font-medium `}>Master Volume</label>
          </div>
          <span className={`text-sm font-mono `}>
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number.parseFloat(e.target.value))}
            className={`w-full rounded-full appearance-none cursor-pointer 
              }`}
          />
          <div
            className="absolute top-1 h-3 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full pointer-events-none"
            style={{ width: `${masterVolume * 100}%` }}
          />
        </div>
      </div>

      {/* EQ Section */}
      <div className={`p-6 rounded-2xl  bg-primary shadow-md`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className={`w-5 h-5 ${isDark ? "text-violet-400" : "text-violet-600"}`} />
            <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>3-Band EQ</h3>
          </div>
          <button
            onClick={resetEQ}
            className={`p-2 rounded-xl transition-colors ${isDark
              ? "text-gray-400 hover:text-white hover:bg-gray-700"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              }`}
            title="Reset EQ"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* High Frequency */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>HIGH (8kHz)</label>
              <span className={`text-xs font-mono ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {masterEQ.high > 0 ? "+" : ""}
                {masterEQ.high.toFixed(1)}dB
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={masterEQ.high}
                onChange={(e) => onEQChange("high", Number.parseFloat(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${isDark ? "bg-gray-700" : "bg-gray-200"
                  }`}
              />
              <div
                className="absolute top-0 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full pointer-events-none"
                style={{
                  width: `${((masterEQ.high + 12) / 24) * 100}%`,
                  opacity: Math.abs(masterEQ.high) / 12,
                }}
              />
            </div>
          </div>

          {/* Mid Frequency */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>MID (1kHz)</label>
              <span className={`text-xs font-mono ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {masterEQ.mid > 0 ? "+" : ""}
                {masterEQ.mid.toFixed(1)}dB
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={masterEQ.mid}
                onChange={(e) => onEQChange("mid", Number.parseFloat(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${isDark ? "bg-gray-700" : "bg-gray-200"
                  }`}
              />
              <div
                className="absolute top-0 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full pointer-events-none"
                style={{
                  width: `${((masterEQ.mid + 12) / 24) * 100}%`,
                  opacity: Math.abs(masterEQ.mid) / 12,
                }}
              />
            </div>
          </div>

          {/* Low Frequency */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>LOW (100Hz)</label>
              <span className={`text-xs font-mono ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {masterEQ.low > 0 ? "+" : ""}
                {masterEQ.low.toFixed(1)}dB
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={masterEQ.low}
                onChange={(e) => onEQChange("low", Number.parseFloat(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${isDark ? "bg-gray-700" : "bg-gray-200"
                  }`}
              />
              <div
                className="absolute top-0 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full pointer-events-none"
                style={{
                  width: `${((masterEQ.low + 12) / 24) * 100}%`,
                  opacity: Math.abs(masterEQ.low) / 12,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* VU Meter */}
      <div className={`p-6 rounded-2xl  bg-primary shadow-md`}>
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className={`w-5 h-5 ${isDark ? "text-violet-400" : "text-violet-600"}`} />
          <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Level Meter</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className={`text-xs font-mono w-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>L</span>
            <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(100, masterVolume * 80 + Math.random() * 20)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-xs font-mono w-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>R</span>
            <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(100, masterVolume * 75 + Math.random() * 25)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio Info */}
      <div className={`p-6 rounded-2xl  bg-primary shadow-md`}>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Audio Info</h4>
        <div className={`text-xs space-y-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          <div className="flex justify-between">
            <span>Sample Rate:</span>
            <span className="font-mono">44.1 kHz</span>
          </div>
          <div className="flex justify-between">
            <span>Bit Depth:</span>
            <span className="font-mono">16-bit</span>
          </div>
          <div className="flex justify-between">
            <span>Channels:</span>
            <span className="font-mono">Stereo</span>
          </div>
          <div className="flex justify-between">
            <span>Latency:</span>
            <span className="font-mono">~10ms</span>
          </div>
        </div>
      </div>
    </div>
  )
}
