"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Card } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { Progress } from "~/components/shadcn/ui/progress"
import { Input } from "~/components/shadcn/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Slider } from "~/components/shadcn/ui/slider"
import {
  Search,
  Plus,
  Play,
  Sparkles,
  Download,
  X,
  Music2,
  Disc3,
  Heart,
  Type,
  RotateCcw,
  Settings,
  Square,
  Volume2,
  Loader2,
  ChevronRight,
  Star,
  TrendingUp,
  Flame,
} from "lucide-react"
import { LyriaRealTimeSession } from "../lib/lyria-realtime"
import { WaveformVisualizer } from "../components/WaveformVisualizer"
import { downloadAudioBlob, createAudioBlobFromChunks } from "../lib/audio-utils"
import { useLyriaStatus } from "../hooks/use-lyria-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"

interface GeneratedTrack {
  id: string
  title: string
  duration: string
  genre: string
  timestamp: string
  prompts: string[]
  audioBlob?: Blob
  audioChunks?: ArrayBuffer[]
  parameters?: {
    bpm: number
    density: number
    brightness: number
    scale: string
  }
}

interface WeightedPrompt {
  id: string
  text: string
  weight: number
  color: string
}

const INSTRUMENTS = [
  { name: "Guitar", category: "Strings", popular: true, icon: "🎸" },
  { name: "Piano", category: "Keys", popular: true, icon: "🎹" },
  { name: "Drums", category: "Percussion", popular: true, icon: "🥁" },
  { name: "Bass", category: "Strings", popular: true, icon: "🎸" },
  { name: "Violin", category: "Strings", popular: true, icon: "🎻" },
  { name: "Saxophone", category: "Winds", popular: true, icon: "🎷" },
  { name: "Trumpet", category: "Winds", popular: false, icon: "🎺" },
  { name: "Synth", category: "Electronic", popular: true, icon: "🎛️" },
  { name: "Flute", category: "Winds", popular: false, icon: "🪈" },
  { name: "Cello", category: "Strings", popular: false, icon: "🎻" },
  { name: "Harp", category: "Strings", popular: false, icon: "🪕" },
  { name: "Harmonica", category: "Winds", popular: false, icon: "🎵" },
]

const GENRES = [
  { name: "Pop", trending: true, color: "bg-pink-500", icon: "⭐" },
  { name: "Rock", trending: true, color: "bg-red-500", icon: "🤘" },
  { name: "Jazz", trending: false, color: "bg-blue-500", icon: "🎷" },
  { name: "Electronic", trending: true, color: "bg-purple-500", icon: "🎛️" },
  { name: "Hip Hop", trending: true, color: "bg-orange-500", icon: "🎤" },
  { name: "Classical", trending: false, color: "bg-indigo-500", icon: "🎼" },
  { name: "Country", trending: false, color: "bg-yellow-500", icon: "🤠" },
  { name: "R&B", trending: true, color: "bg-emerald-500", icon: "💫" },
  { name: "Reggae", trending: false, color: "bg-green-500", icon: "🌴" },
  { name: "Blues", trending: false, color: "bg-cyan-500", icon: "🎸" },
  { name: "Folk", trending: false, color: "bg-amber-500", icon: "🪕" },
  { name: "Ambient", trending: true, color: "bg-slate-500", icon: "🌙" },
]

const MOODS = [
  { name: "Happy", intensity: "high", color: "bg-yellow-400", icon: "😊" },
  { name: "Energetic", intensity: "high", color: "bg-red-400", icon: "⚡" },
  { name: "Calm", intensity: "low", color: "bg-blue-400", icon: "🧘" },
  { name: "Romantic", intensity: "medium", color: "bg-pink-400", icon: "💕" },
  { name: "Mysterious", intensity: "medium", color: "bg-purple-400", icon: "🔮" },
  { name: "Uplifting", intensity: "high", color: "bg-emerald-400", icon: "🚀" },
  { name: "Melancholic", intensity: "low", color: "bg-gray-400", icon: "🌧️" },
  { name: "Dreamy", intensity: "low", color: "bg-indigo-400", icon: "☁️" },
  { name: "Intense", intensity: "high", color: "bg-orange-400", icon: "🔥" },
  { name: "Peaceful", intensity: "low", color: "bg-green-400", icon: "🕊️" },
  { name: "Playful", intensity: "medium", color: "bg-cyan-400", icon: "🎈" },
  { name: "Dark", intensity: "high", color: "bg-slate-600", icon: "🌑" },
]

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
]

interface IntelligentAIPanelProps {
  onAudioGenerated: (audioBlob: Blob, title: string) => void
  isDark: boolean
}

export function IntelligentAIPanel({ onAudioGenerated, isDark }: IntelligentAIPanelProps) {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [customPrompts, setCustomPrompts] = useState<WeightedPrompt[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [customPromptText, setCustomPromptText] = useState("")
  const [activeTab, setActiveTab] = useState("create")
  const { setLyriaStatus } = useLyriaStatus()
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState<ArrayBuffer[]>([])
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected")
  const [generationProgress, setGenerationProgress] = useState(0)

  const sessionRef = useRef<LyriaRealTimeSession | null>(null)

  // Parameters
  const [duration, setDuration] = useState([30])
  const [bpm, setBpm] = useState([120])
  const [selectedScale, setSelectedScale] = useState("SCALE_UNSPECIFIED")
  const [density, setDensity] = useState([0.5])
  const [brightness, setBrightness] = useState([0.5])
  const [guidance, setGuidance] = useState([4.0])
  const [temperature, setTemperature] = useState([1.1])

  const totalSelections =
    selectedInstruments.length + selectedGenres.length + selectedMoods.length + customPrompts.length

  // Real-time updates
  useEffect(() => {
    if (sessionRef.current && isConnected) {
      sessionRef.current
        .setMusicGenerationConfig({
          bpm: bpm[0],
          density: density[0],
          brightness: brightness[0],
          guidance: guidance[0],
          temperature: temperature[0],
          scale: selectedScale,
        })
        .catch(console.error)
    }
  }, [bpm, density, brightness, guidance, temperature, selectedScale, isConnected])

  useEffect(() => {
    if (sessionRef.current && isConnected) {
      const allPrompts = [
        ...selectedInstruments,
        ...selectedGenres,
        ...selectedMoods,
        ...customPrompts.map((p) => p.text),
      ]

      if (allPrompts.length > 0) {
        sessionRef.current.setWeightedPrompts(allPrompts.map((text) => ({ text, weight: 1.0 }))).catch(console.error)
      } else {
        sessionRef.current.setWeightedPrompts([]).catch(console.error)
      }
    }
  }, [selectedInstruments, selectedGenres, selectedMoods, customPrompts, isConnected])

  useEffect(() => {
    if (totalSelections > 0 && !isConnected && !isConnecting) {
      initializeSession().catch(console.error)
    }
  }, [totalSelections, isConnected, isConnecting])

  const getUnusedColor = () => {
    const usedColors = customPrompts.map((p) => p.color)
    const availableColors = COLORS.filter((c) => !usedColors.includes(c))
    return availableColors.length > 0 ? availableColors[0] : COLORS[Math.floor(Math.random() * COLORS.length)]
  }

  const handleInstrumentToggle = (instrument: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(instrument) ? prev.filter((i) => i !== instrument) : [...prev, instrument],
    )
  }

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
  }

  const handleMoodToggle = (mood: string) => {
    setSelectedMoods((prev) => (prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]))
  }

  const handleAddCustomPrompt = () => {
    if (customPromptText.trim()) {
      const newPrompt: WeightedPrompt = {
        id: Date.now().toString(),
        text: customPromptText.trim(),
        weight: 1.0,
        color: getUnusedColor() ?? "#10b981",
      }
      setCustomPrompts((prev) => [...prev, newPrompt])
      setCustomPromptText("")
    }
  }

  const handleRemoveCustomPrompt = (id: string) => {
    setCustomPrompts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleClearAll = () => {
    setSelectedInstruments([])
    setSelectedGenres([])
    setSelectedMoods([])
    setCustomPrompts([])
  }

  const initializeSession = async () => {
    if (sessionRef.current) {
      sessionRef.current.disconnect()
    }

    setRecordedChunks([])
    setGenerationProgress(0)

    try {
      const session = new LyriaRealTimeSession({
        onMessage: (audioData: ArrayBuffer) => {
          setRecordedChunks((prev) => [...prev, audioData])

          if (recordingStartTime !== null && duration[0] !== undefined) {
            const elapsed = (Date.now() - recordingStartTime) / 1000
            const progress = Math.min((elapsed / duration[0]) * 100, 100)
            console.log("Progress:", progress)
            setGenerationProgress(progress)
          }

        },
        onError: (error: Error) => {
          console.error("Session error:", error)
          setConnectionStatus("Error: " + error.message)
          setLyriaStatus("Error")
          setIsConnected(false)
          setIsPlaying(false)
          setIsConnecting(false)
          setGenerationProgress(0)
        },
        onClose: () => {
          setConnectionStatus("Disconnected")
          setLyriaStatus("Disconnected")
          setIsConnected(false)
          setIsPlaying(false)
          setGenerationProgress(0)
        },
        onConnecting: () => {
          setIsConnecting(true)
          setConnectionStatus("Connecting...")
          setLyriaStatus("Connecting")
        },
        onConnected: () => {
          setIsConnecting(false)
          setConnectionStatus("Connected")
          setLyriaStatus("Connected")
        },
        onSetupComplete: () => {
          setIsConnected(true)
          setIsConnecting(false)
          setConnectionStatus("Ready")
          setLyriaStatus("Ready")
        },
      })

      sessionRef.current = session
      await session.connect()

      await session.setMusicGenerationConfig({
        bpm: bpm[0],
        density: density[0],
        brightness: brightness[0],
        guidance: guidance[0],
        temperature: temperature[0],
        scale: selectedScale,
      })

      const allPrompts = [
        ...selectedInstruments,
        ...selectedGenres,
        ...selectedMoods,
        ...customPrompts.map((p) => p.text),
      ]

      if (allPrompts.length > 0) {
        await session.setWeightedPrompts(allPrompts.map((text) => ({ text, weight: 1.0 })))
      }
    } catch (error) {
      console.error("Failed to initialize session:", error)
      setConnectionStatus("Failed to connect")
      setLyriaStatus("Failed")
      setIsConnecting(false)
      throw error
    }
  }

  const handleGenerateAndPlay = async () => {
    try {
      if (!sessionRef.current || !isConnected) {
        await initializeSession()
      } else {
        await sessionRef.current.setMusicGenerationConfig({
          bpm: bpm[0],
          density: density[0],
          brightness: brightness[0],
          guidance: guidance[0],
          temperature: temperature[0],
          scale: selectedScale,
        })

        const allPrompts = [
          ...selectedInstruments,
          ...selectedGenres,
          ...selectedMoods,
          ...customPrompts.map((p) => p.text),
        ]

        if (allPrompts.length > 0) {
          await sessionRef.current.setWeightedPrompts(allPrompts.map((text) => ({ text, weight: 1.0 })))
        }
      }

      setRecordingStartTime(Date.now())
      setGenerationProgress(0)
      await sessionRef.current!.play()
      setIsPlaying(true)
      setLyriaStatus("Playing")

      const progressInterval = setInterval(() => {
        if (recordingStartTime !== null && duration[0] !== undefined) {
          const elapsed = (Date.now() - recordingStartTime) / 1000
          const progress = Math.min((elapsed / duration[0]) * 100, 100)
          setGenerationProgress(progress)

          if (progress >= 100) {
            clearInterval(progressInterval)
          }
        }
      }, 100)

      if (duration[0] !== undefined) {
        setTimeout(() => {
          clearInterval(progressInterval)
          if (sessionRef.current && isPlaying) {
            (async () => {
              await handleStop()
            })()
          }
        }, duration[0] * 1000)
      }
    } catch (error) {
      console.error("Failed to generate:", error)
      setConnectionStatus("Generation failed")
      setLyriaStatus("Failed")
      setGenerationProgress(0)
    }
  }

  const handleStop = async () => {
    if (!sessionRef.current) return

    try {
      sessionRef.current.stop()
      setIsPlaying(false)
      setIsPaused(false)
      setGenerationProgress(100)

      if (recordedChunks.length > 0 && recordingStartTime) {
        const audioBlob = createAudioBlobFromChunks(recordedChunks)
        const allElements = [
          ...selectedInstruments,
          ...selectedGenres,
          ...selectedMoods,
          ...customPrompts.map((p) => p.text),
        ]
        const trackTitle =
          allElements.slice(0, 3).join(" × ") + (allElements.length > 3 ? ` +${allElements.length - 3}` : "")

        const newTrack: GeneratedTrack = {
          id: `track-${Date.now()}`,
          title: trackTitle ?? "AI Generated Track",
          duration: `${Math.floor((duration[0] ?? 0) / 60)}:${((duration[0] ?? 0) % 60).toString().padStart(2, "0")}`,
          genre: selectedGenres[0] ?? "AI Generated",
          timestamp: new Date().toLocaleString(),
          prompts: allElements,
          audioBlob,
          audioChunks: [...recordedChunks],
          parameters: {
            bpm: bpm[0] ?? 120,
            density: density[0] ?? 1,
            brightness: brightness[0] ?? 1,
            scale: selectedScale ?? 1,
          },
        }

        setGeneratedTracks((prev) => [newTrack, ...prev])
        onAudioGenerated(audioBlob, trackTitle ?? "AI Generated Track")
      }

      setRecordedChunks([])
      setRecordingStartTime(null)
      setLyriaStatus("Stopped")
      setConnectionStatus("Disconnected")
      setTimeout(() => setGenerationProgress(0), 1000)
    } catch (error) {
      console.error("Failed to stop:", error)
      setIsPlaying(false)
      setIsPaused(false)
      setRecordedChunks([])
      setRecordingStartTime(null)
      setGenerationProgress(0)
    }
  }

  const filteredInstruments = INSTRUMENTS.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredGenres = GENRES.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredMoods = MOODS.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  return (
    <div className="h-full  flex flex-col bg-background">

      {/* Live Generation Status */}
      {isPlaying && (
        <div className="flex-shrink-0 mx-6  p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
              <span className="text-emerald-400 font-semibold">Generating Music...</span>
              <Badge variant="outline" className="border-emerald-400/50 text-emerald-400">
                <Volume2 className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            </div>
            {/* <span className="text-emerald-400 font-mono text-lg">{generationProgress.toFixed(0)}%</span> */}
          </div>
          {/* <Progress value={generationProgress} className="h-2 mb-4" /> */}
          <div className="h-12  rounded-xl overflow-hidden border border-white/10">
            <WaveformVisualizer isPlaying={isPlaying} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-6  border border-white/10 rounded-xl p-1">
            <TabsTrigger
              value="create"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            {/* <TabsTrigger
              value="tracks"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              <Music2 className="w-4 h-4 mr-2" />
              Tracks ({generatedTracks.length})
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="create" className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8 w-full">
            {/* Selected Items Summary */}
            {totalSelections > 0 && (
              <Card className="p-6 bg-background border-purple-500/20 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-400">Your Selection</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAll}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedInstruments.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    >
                      {item}
                      <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleInstrumentToggle(item)} />
                    </Badge>
                  ))}
                  {selectedGenres.map((item) => (
                    <Badge key={item} variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {item}
                      <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleGenreToggle(item)} />
                    </Badge>
                  ))}
                  {selectedMoods.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                    >
                      {item}
                      <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleMoodToggle(item)} />
                    </Badge>
                  ))}
                  {customPrompts.map((prompt) => (
                    <Badge
                      key={prompt.id}
                      variant="secondary"
                      className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    >
                      {prompt.text}
                      <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleRemoveCustomPrompt(prompt.id)} />
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Instruments */}
            <div className="space-y-4 ">
              <div className="flex items-center space-x-3">
                <Music2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-semibold text-emerald-400">Instruments</h3>
                {selectedInstruments.length > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {selectedInstruments.length}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3  gap-3">
                {filteredInstruments.map((instrument) => {
                  const isSelected = selectedInstruments.includes(instrument.name)
                  return (
                    <Card
                      key={instrument.name}
                      onClick={() => handleInstrumentToggle(instrument.name)}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${isSelected
                        ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20"
                        : ""
                        }`}
                    >
                      <div className="text-center space-y-2">
                        <div className="text-2xl">{instrument.icon}</div>
                        <div className="text-sm font-medium">{instrument.name}</div>
                        {/* {instrument.popular && (
                          <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )} */}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Genres */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Disc3 className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-blue-400">Genres</h3>
                {selectedGenres.length > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{selectedGenres.length}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredGenres.map((genre) => {
                  const isSelected = selectedGenres.includes(genre.name)
                  return (
                    <Card
                      key={genre.name}
                      onClick={() => handleGenreToggle(genre.name)}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${isSelected
                        ? "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/20"
                        : ""
                        }`}
                    >
                      <div className="text-center space-y-2">
                        <div className="text-2xl">{genre.icon}</div>
                        <div className="text-sm font-medium">{genre.name}</div>
                        {/* {genre.trending && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-400/50">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Trending
                          </Badge>
                        )} */}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Moods */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Heart className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-semibold text-purple-400">Moods & Style</h3>
                {selectedMoods.length > 0 && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {selectedMoods.length}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3  gap-3">
                {filteredMoods.map((mood) => {
                  const isSelected = selectedMoods.includes(mood.name)
                  return (
                    <Card
                      key={mood.name}
                      onClick={() => handleMoodToggle(mood.name)}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${isSelected
                        ? "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/20"
                        : ""
                        }`}
                    >
                      <div className="text-center space-y-2">
                        <div className="text-2xl">{mood.icon}</div>
                        <div className="text-sm font-medium">{mood.name}</div>
                        {/* <Badge
                          variant="outline"
                          className={`text-xs ${mood.intensity === "high"
                            ? "text-red-400 border-red-400/50"
                            : mood.intensity === "medium"
                              ? "text-yellow-400 border-yellow-400/50"
                              : "text-green-400 border-green-400/50"
                            }`}
                        >
                          <Flame className="w-3 h-3 mr-1" />
                          {mood.intensity}
                        </Badge> */}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Custom Prompts */}
            <div className="space-y-4 ">
              <div className="flex items-center space-x-3">
                <Type className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xl font-semibold text-yellow-400">Custom Prompts</h3>
                {customPrompts.length > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    {customPrompts.length}
                  </Badge>
                )}
              </div>

              <div className="flex space-x-3">
                <Input
                  placeholder="Describe your musical vision..."
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomPrompt()}
                  className="flex-1 h-12   placeholder-slate-400 focus:border-yellow-500/50 rounded-xl"
                />
                <Button
                  onClick={handleAddCustomPrompt}
                  disabled={!customPromptText.trim()}
                  className="h-12 px-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {customPrompts.length > 0 && (
                <div className="grid gap-3">
                  {customPrompts.map((prompt) => (
                    <Card key={prompt.id} className="p-4 bg-white/5 border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: prompt.color }} />
                          <span className="font-medium">{prompt.text}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCustomPrompt(prompt.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide w-full">
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Settings */}
              <Card className="p-6 shadow-lg rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Basic Settings</h3>
                <div className="space-y-6">
                  {/* <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Duration</label>
                      <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                        {Math.floor((duration[0] ?? 0) / 60)}:{((duration[0] ?? 0) % 60).toString().padStart(2, "0")}
                      </Badge>
                    </div>
                    <Slider
                      value={duration}
                      onValueChange={setDuration}
                      max={180}
                      min={15}
                      step={15}
                      className="w-full"
                    />
                  </div> */}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Tempo (BPM)</label>
                      <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                        {bpm[0]} BPM
                      </Badge>
                    </div>
                    <Slider value={bpm} onValueChange={setBpm} max={200} min={60} step={5} className="w-full" />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Musical Scale</label>
                    <Select
                      value={selectedScale}
                      onValueChange={(value) => setSelectedScale(value)}

                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a scale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCALE_UNSPECIFIED">Auto (AI Decides)</SelectItem>
                        <SelectItem value="C_MAJOR_A_MINOR">C Major / A Minor</SelectItem>
                        <SelectItem value="D_MAJOR_B_MINOR">D Major / B Minor</SelectItem>
                        <SelectItem value="E_MAJOR_D_FLAT_MINOR">E Major / C♯ Minor</SelectItem>
                        <SelectItem value="F_MAJOR_D_MINOR">F Major / D Minor</SelectItem>
                        <SelectItem value="G_MAJOR_E_MINOR">G Major / E Minor</SelectItem>
                        <SelectItem value="A_MAJOR_G_FLAT_MINOR">A Major / F♯ Minor</SelectItem>
                        <SelectItem value="B_MAJOR_A_FLAT_MINOR">B Major / G♯ Minor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Advanced Settings */}
              <Card className="p-6 shadow-lg rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 text-purple-400">Advanced Settings</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Density</label>
                      <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                        {(density[0] ?? 1 * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Slider value={density} onValueChange={setDensity} max={1} min={0} step={0.05} className="w-full" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Brightness</label>
                      <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                        {(brightness[0] ?? 1 * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Slider
                      value={brightness}
                      onValueChange={setBrightness}
                      max={1}
                      min={0}
                      step={0.05}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Guidance</label>
                      <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                        {guidance[0]?.toFixed(1)}
                      </Badge>
                    </div>
                    <Slider
                      value={guidance}
                      onValueChange={setGuidance}
                      max={6}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Temperature</label>
                      <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                        {(temperature[0] ?? 0).toFixed(1)}
                      </Badge>
                    </div>
                    <Slider
                      value={temperature}
                      onValueChange={setTemperature}
                      max={3}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* <TabsContent value="tracks" className="flex-1 overflow-y-auto p-6 scrollbar-hide w-full">
            {generatedTracks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Music2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No tracks yet</h3>
                <p className="text-slate-400 mb-6">Generate your first AI track to see it here</p>
                <Button
                  onClick={() => setActiveTab("create")}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Start Creating
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedTracks.map((track) => (
                  <Card key={track.id} className="p-6 bg-white/5 border-white/10 rounded-2xl">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{track.title}</h3>
                          <p className="text-slate-400">
                            {track.duration} • {track.timestamp}
                          </p>
                        </div>
                        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Lyria
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {track.prompts.slice(0, 6).map((prompt, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {prompt}
                          </Badge>
                        ))}
                        {track.prompts.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{track.prompts.length - 6} more
                          </Badge>
                        )}
                      </div>

                      <TrackPlayer
                        audioBlob={track.audioBlob}
                        audioChunks={track.audioChunks}
                        title={track.title}

                      />

                      <div className="flex space-x-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (track.audioBlob) {
                              const filename = `${track.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.wav`
                              downloadAudioBlob(track.audioBlob, filename)
                            }
                          }}
                          className="border-white/20 hover:bg-white/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => track.audioBlob && onAudioGenerated(track.audioBlob, track.title)}
                          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                        >
                          Import to DAW
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent> */}
        </Tabs>
      </div>

      {/* Bottom Generate Section */}
      <div className="flex-shrink-0 p-6  backdrop-blur-sm border-t  rounded-t-2xl">
        {!isPlaying ? (
          <Button
            onClick={handleGenerateAndPlay}
            disabled={isConnecting || totalSelections === 0}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                CONNECTING TO LYRIA...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-3" />
                GENERATE MUSIC
              </>
            )}
          </Button>
        ) : (
          <div className="grid grid-cols-4 space-x-3">
            <Button
              variant='destructive'
              onClick={handleStop}
              className="w-full col-span-3"
            >
              <Square className="w-5 h-5 mr-3" />
              STOP
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                if (recordedChunks.length > 0) {
                  handleStop()
                }
              }}
              disabled={recordedChunks.length === 0}
              className="w-full"
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        )}

        {totalSelections === 0 && (
          <p className="text-center text-slate-400 text-sm mt-3">
            Select instruments, genres, or moods to start generating music
          </p>
        )}
      </div>
    </div>
  )
}
