"use client"
import { useState, useCallback, useEffect } from "react"
import { ModernSidebar } from "~/components/module/studio/components/ModernSidebar"
import { FlexibleTimeline } from "~/components/module/studio/components/FlexibleTimeline"
import { FloatingControls } from "~/components/module/studio/components/FloatingControls"
import { useAudio } from "~/components/module/studio/hooks/useAudio"
import type { AudioFile } from "~/components/module/studio/types/audio"
import { useLyriaStatus } from "~/components/module/studio/hooks/use-lyria-status"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { AlertTriangle, ArrowLeft, Lock, Shield } from "lucide-react"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Arrow } from "@radix-ui/react-select"

function App() {
    const {
        audioFiles,
        tracks,
        playbackState,
        masterEQ,
        loadAudioFile,
        addTrack,
        updateTrack,
        deleteTrack,
        duplicateTrack,
        splitTrack,
        removeAudioFile,
        play,
        pause,
        stop,
        seek,
        setMasterVolume,
        updateEQ,
        toggleLoop,
        saveProject,
        newProject,
        exportProject,
    } = useAudio()


    const [pixelsPerSecond, setPixelsPerSecond] = useState(21)
    const [snapToGrid, setSnapToGrid] = useState(true)
    const [masterVolume, setMasterVolumeState] = useState(0.8)
    const [draggedAudioFile, setDraggedAudioFile] = useState<AudioFile | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activePanel, setActivePanel] = useState<"library" | "mixer" | "ai" | "settings">("library")
    const [workspaceLayout, setWorkspaceLayout] = useState<"standard" | "compact" | "focus">("standard")
    const [isDark, setIsDark] = useState(false)
    const { setTheme, theme } = useTheme()
    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
        setIsDark((prev) => !prev)
    }
    const creator = api.fan.creator.meCreator.useQuery(undefined, {
        refetchOnWindowFocus: false,
    })
    const handleFilesAdded = useCallback(
        async (files: File[]) => {
            setIsLoading(true)
            const loadPromises = files.map(async (file) => {
                try {
                    await loadAudioFile(file)
                } catch (error) {
                    console.error("Error loading audio file:", error)
                    alert(`Failed to load ${file.name}. Please make sure it's a valid audio file.`)
                }
            })

            await Promise.all(loadPromises)
            setIsLoading(false)
        },
        [loadAudioFile],
    )

    const handleRemoveAll = useCallback(() => {
        if (audioFiles.length === 0) return

        if (confirm(`Are you sure you want to remove all ${audioFiles.length} audio files?`)) {
            audioFiles.forEach((file) => removeAudioFile(file.id))
        }
    }, [audioFiles, removeAudioFile])

    const handleMasterVolumeChange = useCallback(
        (volume: number) => {
            setMasterVolumeState(volume)
            setMasterVolume(volume)
        },
        [setMasterVolume],
    )

    const handleExport = useCallback(async () => {
        if (tracks.length === 0) {
            alert("No tracks to export. Add some audio files to the timeline first.")
            return
        }

        setIsLoading(true)
        try {
            await exportProject()
            alert("Project exported successfully!")
        } catch (error) {
            console.error("Export failed:", error)
            alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        } finally {
            setIsLoading(false)
        }
    }, [tracks.length, exportProject])

    const handleDragStart = useCallback((audioFile: AudioFile) => {
        setDraggedAudioFile(audioFile)
    }, [])

    const handleSaveProject = useCallback(
        (name: string) => {
            saveProject(name)
            alert(`Project "${name}" saved successfully!`)
        },
        [saveProject],
    )

    const handleLoadProject = useCallback((projectId: string) => {
        alert("Load project functionality would restore saved project state.")
    }, [])

    const handleNewProject = useCallback(() => {
        newProject()
    }, [newProject])

    const handleAIAudioGenerated = useCallback(
        async (audioBlob: Blob, title: string) => {
            try {
                setIsLoading(true)
                const file = new File([audioBlob], `${title}.wav`, { type: "audio/wav" })
                await loadAudioFile(file)
                setActivePanel("library")
                toast.success(`AI-generated audio "${title}" imported successfully!`, {
                    description: "You can find it in your library.",
                })
            } catch (error) {
                console.error("Error importing AI-generated audio:", error)
                toast.error("Failed to import AI-generated audio. Please try again.")
            } finally {
                setIsLoading(false)
            }
        },
        [loadAudioFile],
    )

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return

            switch (e.key.toLowerCase()) {
                case " ":
                    e.preventDefault()
                    playbackState.isPlaying ? pause() : play()
                    break
                case "l":
                    e.preventDefault()
                    toggleLoop()
                    break
                case "g":
                    e.preventDefault()
                    setSnapToGrid(!snapToGrid)
                    break
                case "=":
                case "+":
                    e.preventDefault()
                    setPixelsPerSecond(Math.min(200, pixelsPerSecond + 10))
                    break
                case "-":
                    e.preventDefault()
                    setPixelsPerSecond(Math.max(10, pixelsPerSecond - 10))
                    break
                case "home":
                    e.preventDefault()
                    seek(0)
                    break
                case "end":
                    e.preventDefault()
                    seek(playbackState.duration)
                    break
                case "1":
                    e.preventDefault()
                    setActivePanel("library")
                    break
                case "2":
                    e.preventDefault()
                    setActivePanel("mixer")
                    break
                case "3":
                    e.preventDefault()
                    setActivePanel("ai")
                    break
                case "4":
                    e.preventDefault()
                    setActivePanel("settings")
                    break
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [playbackState.isPlaying, playbackState.duration, play, pause, seek, toggleLoop, snapToGrid, pixelsPerSecond])

    if (creator.isLoading) {
        return <LoadingScreen isDark={isDark} />
    }
    if (!creator.data?.id) {
        return <AccessDenied isDark={isDark} />
    }

    return (
        <div
            className={`h-[calc(100vh-10vh)] flex flex-col  transition-colors duration-300`}
        >
            {/* Modern Header */}
            <div
                className={`h-16 px-6 flex items-center justify-between border-b backdrop-blur-xl bg-background shadow-sm`}
            >
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => (window.location.href = "/")}
                    >
                        <ArrowLeft /> Back
                    </Button>
                    <div>
                        <h1
                            className={`text-xl font-bold `}
                        >
                            BC STUDIO
                        </h1>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Professional Audio Workstation</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-3">

                    <div className={`flex items-center rounded-xl p-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                        <button
                            onClick={() => setWorkspaceLayout("standard")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${workspaceLayout === "standard"
                                ? "bg-violet-500 text-white shadow-md"
                                : isDark
                                    ? "text-gray-300 hover:text-white hover:bg-gray-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                                }`}
                        >
                            Standard
                        </button>
                        {/* <button
              onClick={() => setWorkspaceLayout("compact")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${workspaceLayout === "compact"
                ? "bg-violet-500 text-white shadow-md"
                : isDark
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
                }`}
            >
              Compact
            </button> */}
                        <button
                            onClick={() => setWorkspaceLayout("focus")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${workspaceLayout === "focus"
                                ? "bg-violet-500 text-white shadow-md"
                                : isDark
                                    ? "text-gray-300 hover:text-white hover:bg-gray-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                                }`}
                        >
                            Focus
                        </button>
                    </div>



                    {isLoading && (
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Processing...</span>
                        </div>
                    )}

                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} hidden md:block`}>
                        {tracks.length} tracks • {audioFiles.length} files
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Adaptive Sidebar */}
                <div className={`${workspaceLayout === "focus" ? "w-20" : "w-[25rem]"} transition-all duration-300 flex-shrink-0`}>
                    <ModernSidebar
                        activePanel={activePanel}
                        onPanelChange={setActivePanel}
                        audioFiles={audioFiles}
                        onFilesAdded={handleFilesAdded}
                        onRemoveFile={removeAudioFile}
                        onRemoveAll={handleRemoveAll}
                        onDragStart={handleDragStart}
                        onAudioGenerated={handleAIAudioGenerated}
                        masterVolume={masterVolume}
                        onMasterVolumeChange={handleMasterVolumeChange}
                        masterEQ={masterEQ}
                        onEQChange={updateEQ}
                        isDark={isDark}
                        isCompact={workspaceLayout === "focus"}
                    />
                </div>

                {/* Timeline Area */}
                <FlexibleTimeline
                    tracks={tracks}
                    audioFiles={audioFiles}
                    currentTime={playbackState.currentTime}
                    duration={playbackState.duration}
                    onTrackUpdate={updateTrack}
                    onTrackDelete={deleteTrack}
                    onTrackDuplicate={duplicateTrack}
                    onTrackSplit={splitTrack}
                    onAddTrack={addTrack}
                    onSeek={seek}
                    pixelsPerSecond={pixelsPerSecond}
                    snapToGrid={snapToGrid}
                    isDark={isDark}
                    layout={workspaceLayout}
                />
            </div>

            {/* Floating Controls */}
            <FloatingControls
                playbackState={playbackState}
                onPlay={() => play()}
                onPause={pause}
                onStop={stop}
                onSeek={seek}
                onToggleLoop={toggleLoop}
                masterVolume={masterVolume}
                onMasterVolumeChange={handleMasterVolumeChange}
                pixelsPerSecond={pixelsPerSecond}
                onZoomChange={setPixelsPerSecond}
                snapToGrid={snapToGrid}
                onSnapToggle={() => setSnapToGrid(!snapToGrid)}
                onExport={handleExport}
                isDark={isDark}
                onToggleDarkMode={toggleTheme}
                layout={workspaceLayout}
            />

            {/* Quick Help */}
            {workspaceLayout !== "focus" && (
                <div
                    className={`fixed bottom-2 left-1/3 text-xs ${isDark ? "text-gray-500" : "text-gray-400"} pointer-events-none`}
                >
                    <div className="space-y-1 text-right">
                        <div>Space: Play/Pause • 1-4: Switch Panels • G: Grid • +/-: Zoom • L: Loop • Home/End: Navigate • Drag files to timeline</div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Access Denied Component
const AccessDenied = ({ isDark }: { isDark: boolean }) => {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
            <div className="max-w-md w-full mx-4">
                <div
                    className={`rounded-2xl p-8 text-center shadow-2xl ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}
                >
                    <div className="mb-6">
                        <div
                            className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isDark ? "bg-red-900/20" : "bg-red-50"}`}
                        >
                            <Shield className={`w-10 h-10 ${isDark ? "text-red-400" : "text-red-500"}`} />
                        </div>
                    </div>

                    <h1 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Access Restricted</h1>

                    <div
                        className={`flex items-center justify-center space-x-2 mb-4 ${isDark ? "text-amber-400" : "text-amber-600"}`}
                    >
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Creator Access Required</span>
                    </div>

                    <p className={`text-sm mb-6 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        BANDCOIN STUDIO is exclusively available to verified creators. This professional audio workstation requires
                        creator-level permissions to access its advanced features.
                    </p>

                    <div className={`rounded-lg p-4 mb-6 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                        <div className="flex items-center space-x-3">
                            <Lock className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                            <div className="text-left">
                                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                    Your Current Role: User
                                </div>
                                <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Required Role: Creator</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => (window.location.href = "/artist/create")}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Upgrade to Creator
                        </button>

                        <button
                            onClick={() => (window.location.href = "/")}
                            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                        >
                            Back to Home
                        </button>
                    </div>

                    <div
                        className={`mt-6 pt-6 border-t text-xs ${isDark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}
                    >
                        Need help? Contact support at{" "}
                        <a
                            href="mailto:support@bandcoin.io"
                            className={`${isDark ? "text-purple-400" : "text-purple-600"} hover:underline`}
                        >
                            support@bandcoin.io
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Loading Component
const LoadingScreen = ({ isDark }: { isDark: boolean }) => {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Verifying access permissions...</p>
            </div>
        </div>
    )
}

export default App
