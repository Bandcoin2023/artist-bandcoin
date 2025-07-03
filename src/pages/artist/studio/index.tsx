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
import ExportSongModal from "~/components/modal/export-create-song-modal"
import { ExportOptionsModal } from "~/components/modal/export-options-modal"
import { useExportCreateSongModalStore } from "~/components/store/export-create-song-modal-store"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/shadcn/ui/dialog"
import { X, Play, Pause, Grid3X3, Home, Plus, Minus, RotateCcw, Upload, MousePointer, Keyboard, Music, Settings } from 'lucide-react';

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
        exportToBandcoin,
        exportTrackAsBlob
    } = useAudio()

    const [showExportOptionsModal, setShowExportOptionsModal] = useState(false)
    const { isOpen, setIsOpen, data, setData } = useExportCreateSongModalStore()
    const [pixelsPerSecond, setPixelsPerSecond] = useState(21)
    const [snapToGrid, setSnapToGrid] = useState(true)
    const [masterVolume, setMasterVolumeState] = useState(0.8)
    const [draggedAudioFile, setDraggedAudioFile] = useState<AudioFile | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activePanel, setActivePanel] = useState<"library" | "mixer" | "ai" | "settings">("library")
    const [workspaceLayout, setWorkspaceLayout] = useState<"standard" | "compact" | "focus">("standard")
    const [isDark, setIsDark] = useState(false)
    const [activeTab, setActiveTab] = useState('shortcuts');

    const { setTheme, theme } = useTheme()
    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
        setIsDark((prev) => !prev)
    }

    const tips = {
        shortcuts: [
            { icon: <MousePointer className="w-4 h-4" />, key: 'Shift + Scroll', action: 'Scroll timeline horizontally' },
            { icon: <Play className="w-4 h-4" />, key: 'Space', action: 'Play/Pause playback' },
            { icon: <Keyboard className="w-4 h-4" />, key: '1-4', action: 'Switch between panels' },
            { icon: <Grid3X3 className="w-4 h-4" />, key: 'G', action: 'Toggle grid view' },
            { icon: <Plus className="w-4 h-4" />, key: '+', action: 'Zoom in timeline' },
            { icon: <Minus className="w-4 h-4" />, key: '-', action: 'Zoom out timeline' },
            { icon: <RotateCcw className="w-4 h-4" />, key: 'L', action: 'Toggle loop mode' },
            { icon: <Home className="w-4 h-4" />, key: 'Home', action: 'Jump to beginning' },
            { icon: <Keyboard className="w-4 h-4" />, key: 'End', action: 'Jump to end' },

        ],
        workflow: [
            { icon: <Upload className="w-4 h-4" />, title: 'Import Audio', desc: 'Drag and drop audio files directly onto the timeline or use the import button' },
            { icon: <MousePointer className="w-4 h-4" />, title: 'Precise Movement', desc: 'Hold Shift while dragging to move songs horizontally with precision' },
            { icon: <Music className="w-4 h-4" />, title: 'Layer Tracks', desc: 'Use multiple panels to create complex compositions with layered audio' },
            { icon: <Settings className="w-4 h-4" />, title: 'Grid Snap', desc: 'Enable grid mode (G) for precise timing and alignment' },
        ],
        advanced: [
            { title: 'Multi-selection', desc: 'Hold Ctrl/Cmd and click to select multiple audio clips for batch operations' },
            { title: 'Quick Preview', desc: 'Click anywhere on the timeline to instantly preview from that position' },
            { title: 'Zoom Navigation', desc: 'Use mouse wheel + Ctrl to zoom in/out at cursor position' },
            { title: 'Panel Organization', desc: 'Drag panel tabs to reorder your workspace layout' },
        ]
    };

    const tabs = [
        { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="w-4 h-4" /> },
        { id: 'workflow', label: 'Workflow', icon: <Music className="w-4 h-4" /> },
        { id: 'advanced', label: 'Advanced', icon: <Settings className="w-4 h-4" /> },
    ];
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
            toast.error("No tracks to export. Add some audio files to the timeline first.")
            return
        }

        setIsLoading(true)
        try {
            const audioBlob = await exportProject()

            toast.success("Project exported successfully!")
        } catch (error) {
            toast.error(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        } finally {
            setIsLoading(false)
        }
    }, [tracks.length, exportProject])

    const handleExportToBandcoin = useCallback(async () => {
        if (tracks.length === 0) {

            toast.error("No tracks to export. Add some audio files to the timeline first.")
            return
        }

        setIsLoading(true)
        try {
            const audioBlob = await exportToBandcoin()
            const tracksBlobs = await Promise.all(
                tracks.map(async (track) => {
                    return {
                        ...track,
                        blob: await exportTrackAsBlob(track)
                    }
                })
            )

            console.log("Exported tracks blobs:", tracksBlobs)
            setData({
                audioBlob,
                TracksBlob: tracksBlobs
            })
            setShowExportOptionsModal(false)
            setIsOpen(true)
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


    const handleExportClick = useCallback(() => {
        if (tracks.length === 0) {
            toast.error("No tracks to export. Add some audio files to the timeline first.")
            return
        }

        setShowExportOptionsModal(true)
    }, [tracks.length])
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
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Show Tips</Button>
                        </DialogTrigger>

                        <DialogContent className=" rounded-lg">
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/20 rounded-lg">
                                                    <Music className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-bold">Pro Tips & Shortcuts</h2>
                                                    <p className="text-blue-100 text-sm">Master your music workflow</p>
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        {tabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === tab.id
                                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-900'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                                    }`}
                                            >
                                                {tab.icon}
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 max-h-96 overflow-y-auto">
                                        {activeTab === 'shortcuts' && (
                                            <div className="space-y-3">
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Keyboard Shortcuts</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Speed up your workflow with these handy shortcuts</p>
                                                </div>
                                                {tips.shortcuts.map((tip, index) => (
                                                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">
                                                            {tip.icon}
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono">
                                                                {tip.key}
                                                            </kbd>
                                                            <span className="text-gray-700 dark:text-gray-300">{tip.action}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'workflow' && (
                                            <div className="space-y-4">
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workflow Tips</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Optimize your creative process</p>
                                                </div>
                                                {tips.workflow.map((tip, index) => (
                                                    <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg">
                                                                {tip.icon}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{tip.title}</h4>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">{tip.desc}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'advanced' && (
                                            <div className="space-y-4">
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Advanced Techniques</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Pro-level features for power users</p>
                                                </div>
                                                {tips.advanced.map((tip, index) => (
                                                    <div key={index} className="p-4 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-l-4 border-blue-500">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{tip.title}</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">{tip.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">

                                            </p>
                                            <DialogClose>
                                                <button

                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Got it!
                                                </button>
                                            </DialogClose>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
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
                onExport={handleExportClick}
                isDark={isDark}
                onToggleDarkMode={toggleTheme}
                layout={workspaceLayout}
            />
            <ExportOptionsModal
                isOpen={showExportOptionsModal}
                setIsOpen={setShowExportOptionsModal}
                onDownload={handleExport}
                onExportToBandcoin={handleExportToBandcoin}
                isExporting={isLoading}
                trackCount={tracks.length}
                isDark={isDark}
            />
            {/* <ExportSongModal
                isOpen={showExportModal}
                setIsOpen={setShowExportModal}
                audioBlob={exportAudioBlob}
                projectName="My Studio Project"
            /> */}
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
