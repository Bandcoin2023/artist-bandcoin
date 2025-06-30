"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { AudioFile, Track, PlaybackState } from "../types/audio"

export const useAudio = () => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loop: false,
    bpm: 120,
  })
  const [masterEQ, setMasterEQ] = useState({
    low: 0,
    mid: 0,
    high: 0,
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const eqNodesRef = useRef<{
    low: BiquadFilterNode | null
    mid: BiquadFilterNode | null
    high: BiquadFilterNode | null
  }>({ low: null, mid: null, high: null })
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map())
  const trackGainNodesRef = useRef<Map<string, GainNode>>(new Map()) // Store gain nodes for each track
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const getProjectDuration = useCallback(() => {
    if (tracks.length === 0) return 0
    return Math.max(0, ...tracks.map((track) => track.endTime))
  }, [tracks])

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      )()

      gainNodeRef.current = audioContextRef.current.createGain()

      const lowShelf = audioContextRef.current.createBiquadFilter()
      lowShelf.type = "lowshelf"
      lowShelf.frequency.value = 100

      const midPeaking = audioContextRef.current.createBiquadFilter()
      midPeaking.type = "peaking"
      midPeaking.frequency.value = 1000
      midPeaking.Q.value = 1

      const highShelf = audioContextRef.current.createBiquadFilter()
      highShelf.type = "highshelf"
      highShelf.frequency.value = 8000

      lowShelf.connect(midPeaking)
      midPeaking.connect(highShelf)
      highShelf.connect(gainNodeRef.current)
      gainNodeRef.current.connect(audioContextRef.current.destination)

      eqNodesRef.current = {
        low: lowShelf,
        mid: midPeaking,
        high: highShelf,
      }
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume()
    }
  }, [])
  const generateWaveformData = useCallback((audioBuffer: AudioBuffer): Float32Array => {
    const left = audioBuffer.getChannelData(0)
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left

    const samples = 1000
    const blockSize = Math.floor(left.length / samples)
    const waveformData = new Float32Array(samples)

    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        const l = left[i * blockSize + j] ?? 0
        const r = right[i * blockSize + j] ?? 0
        sum += Math.abs((l + r) / 2)
      }
      waveformData[i] = sum / blockSize
    }

    return waveformData
  }, [])


  const loadAudioFile = useCallback(
    async (file: File): Promise<AudioFile> => {
      await initAudioContext()

      const url = URL.createObjectURL(file)
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
      const waveformData = generateWaveformData(audioBuffer)

      const audioFile: AudioFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        file,
        duration: audioBuffer.duration,
        buffer: audioBuffer,
        url,
        waveformData,
      }

      setAudioFiles((prev) => [...prev, audioFile])
      return audioFile
    },
    [initAudioContext, generateWaveformData],
  )

  const addTrack = useCallback(
    (audioFile: AudioFile, startTime = 0) => {
      const colors = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"]

      // Find next available track index
      const usedIndices = tracks.map((t) => t.trackIndex)
      const nextIndex = usedIndices.length === 0 ? 0 : Math.max(...usedIndices) + 1

      const track: Track = {
        id: Math.random().toString(36).substr(2, 9),
        audioFileId: audioFile.id,
        name: audioFile.name.replace(/\.[^/.]+$/, ""),
        startTime,
        endTime: startTime + audioFile.duration,
        volume: 1,
        muted: false,
        soloed: false,
        trimStart: 0,
        trimEnd: audioFile.duration,
        trackIndex: nextIndex,
        color: colors[nextIndex % colors.length],
        selected: false,
      }

      setTracks((prev) => [...prev, track])
      return track
    },
    [tracks],
  )

  // Real-time audio parameter update function
  const updateTrackAudioParams = useCallback(
    (track: Track, allTracks: Track[]) => {
      const gainNode = trackGainNodesRef.current.get(track.id)
      if (gainNode && audioContextRef.current) {
        // Check if track should be audible
        const soloedTracks = allTracks.filter((t) => t.soloed)
        const shouldPlay = soloedTracks.length > 0 ? track.soloed : !track.muted

        // Update gain immediately with smooth transition
        const targetGain = shouldPlay ? track.volume : 0
        gainNode.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.01)
      }
    },
    [], // Remove tracks dependency
  )

  const updateTrack = useCallback(
    (trackId: string, updates: Partial<Track>) => {
      setTracks((prev) => {
        const newTracks = prev.map((track) => {
          if (track.id === trackId) {
            const updatedTrack = { ...track, ...updates }

            // Apply real-time audio updates if playing
            if (playbackState.isPlaying) {
              setTimeout(() => updateTrackAudioParams(updatedTrack, prev), 0)
            }

            return updatedTrack
          }
          return track
        })

        // If solo/mute changed, update all tracks to handle solo logic
        if (updates.hasOwnProperty("soloed") || updates.hasOwnProperty("muted")) {
          if (playbackState.isPlaying) {
            setTimeout(() => {
              newTracks.forEach((track) => updateTrackAudioParams(track, newTracks))
            }, 0)
          }
        }

        return newTracks
      })
    },
    [playbackState.isPlaying, updateTrackAudioParams],
  )

  const deleteTrack = useCallback((trackId: string) => {
    // Clean up audio nodes
    const sourceNode = sourceNodesRef.current.get(trackId)
    const gainNode = trackGainNodesRef.current.get(trackId)

    if (sourceNode) {
      try {
        sourceNode.stop()
      } catch (e) {
        // Source may already be stopped
      }
      sourceNodesRef.current.delete(trackId)
    }

    if (gainNode) {
      gainNode.disconnect()
      trackGainNodesRef.current.delete(trackId)
    }

    setTracks((prev) => prev.filter((track) => track.id !== trackId))
  }, [])

  const duplicateTrack = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId)
      if (!track) return

      const usedIndices = tracks.map((t) => t.trackIndex)
      const nextIndex = Math.max(...usedIndices) + 1

      const newTrack: Track = {
        ...track,
        id: Math.random().toString(36).substr(2, 9),
        name: `${track.name} (Copy)`,
        startTime: track.startTime + 1,
        endTime: track.endTime + 1,
        trackIndex: nextIndex,
      }

      setTracks((prev) => [...prev, newTrack])
    },
    [tracks],
  )

  const splitTrack = useCallback(
    (trackId: string, splitTime: number) => {
      const track = tracks.find((t) => t.id === trackId)
      if (!track) return

      const relativeTime = splitTime - track.startTime
      if (relativeTime <= 0.1 || relativeTime >= track.endTime - track.startTime - 0.1) return

      const gapSize = 0.2
      const firstPartEnd = splitTime - gapSize / 2
      const secondPartStart = splitTime + gapSize / 2

      // Update original track to be first part
      updateTrack(trackId, {
        endTime: firstPartEnd,
        trimEnd: track.trimStart + (firstPartEnd - track.startTime),
      })

      // Create second part on SAME track index
      const secondPart: Track = {
        ...track,
        id: Math.random().toString(36).substr(2, 9),
        name: `${track.name.replace(" (Split)", "")} (Split)`,
        startTime: secondPartStart,
        trimStart: track.trimStart + (secondPartStart - track.startTime),
        trackIndex: track.trackIndex, // Same lane
        selected: false,
      }

      setTracks((prev) => [...prev, secondPart])
    },
    [tracks, updateTrack],
  )

  const removeAudioFile = useCallback((audioFileId: string) => {
    setAudioFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === audioFileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      return prev.filter((f) => f.id !== audioFileId)
    })
    setTracks((prev) => prev.filter((track) => track.audioFileId !== audioFileId))
  }, [])

  const play = useCallback(
    async (startTime: number = playbackState.currentTime) => {
      await initAudioContext()

      if (playbackState.isPlaying) return

      // Clear existing sources and gain nodes
      sourceNodesRef.current.forEach((source) => {
        try {
          source.stop()
        } catch (e) {
          // Source may already be stopped
        }
      })
      sourceNodesRef.current.clear()

      trackGainNodesRef.current.forEach((gainNode) => {
        gainNode.disconnect()
      })
      trackGainNodesRef.current.clear()

      const contextStartTime = audioContextRef.current!.currentTime
      startTimeRef.current = contextStartTime

      const soloedTracks = tracks.filter((track) => track.soloed)
      const tracksToPlay = soloedTracks.length > 0 ? soloedTracks : tracks.filter((track) => !track.muted)

      // Group tracks by audio file to avoid conflicts
      const tracksByAudioFile = new Map<string, Track[]>()
      tracks.forEach((track) => {
        // Use all tracks, not just tracksToPlay
        if (!tracksByAudioFile.has(track.audioFileId)) {
          tracksByAudioFile.set(track.audioFileId, [])
        }
        tracksByAudioFile.get(track.audioFileId)!.push(track)
      })

      tracksByAudioFile.forEach((tracksForFile, audioFileId) => {
        const audioFile = audioFiles.find((f) => f.id === audioFileId)
        if (!audioFile?.buffer) return

        // Create separate source for each track segment
        tracksForFile.forEach((track) => {
          const source = audioContextRef.current!.createBufferSource()
          const gainNode = audioContextRef.current!.createGain()

          source.buffer = audioFile.buffer ?? null
          source.connect(gainNode)
          gainNode.connect(eqNodesRef.current.low!)

          // Store the gain node for real-time updates
          trackGainNodesRef.current.set(track.id, gainNode)

          // Set initial gain based on track state
          const soloedTracks = tracks.filter((t) => t.soloed)
          const shouldPlay = soloedTracks.length > 0 ? track.soloed : !track.muted
          gainNode.gain.value = shouldPlay ? track.volume : 0

          const trackStartTime = Math.max(0, track.startTime - startTime)
          const sourceOffset = Math.max(0, startTime - track.startTime) + track.trimStart
          const duration = Math.min(
            track.trimEnd - track.trimStart,
            track.endTime - Math.max(track.startTime, startTime),
          )

          if (
            trackStartTime >= 0 &&
            duration > 0 &&
            audioFile.buffer &&
            sourceOffset < audioFile.buffer.duration
          ) {
            try {
              source.start(contextStartTime + trackStartTime, sourceOffset, duration)
              sourceNodesRef.current.set(track.id, source)
            } catch (e) {
              console.warn("Failed to start audio source:", e)
            }
          }
        })
      })

      setPlaybackState((prev) => ({ ...prev, isPlaying: true }))

      const updateTime = () => {
        if (audioContextRef.current) {
          const elapsed = audioContextRef.current.currentTime - startTimeRef.current
          const newTime = startTime + elapsed

          setPlaybackState((prev) => ({ ...prev, currentTime: newTime }))

          const projectDuration = getProjectDuration()
          if (newTime < projectDuration) {
            animationFrameRef.current = requestAnimationFrame(updateTime)
          } else if (playbackState.loop) {
            sourceNodesRef.current.forEach((source) => {
              try {
                source.stop()
              } catch (e) {
                // Source may already be stopped
              }
            })
            sourceNodesRef.current.clear()
            trackGainNodesRef.current.forEach((gainNode) => {
              gainNode.disconnect()
            })
            trackGainNodesRef.current.clear()

            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
            }

            setPlaybackState((prev) => ({ ...prev, currentTime: 0 }))
            setTimeout(() => {
              void play(0)
            }, 50)
          } else {
            sourceNodesRef.current.forEach((source) => {
              try {
                source.stop()
              } catch (e) {
                // Source may already be stopped
              }
            })
            sourceNodesRef.current.clear()
            trackGainNodesRef.current.forEach((gainNode) => {
              gainNode.disconnect()
            })
            trackGainNodesRef.current.clear()

            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
            }

            setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }))
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateTime)
    },
    [
      audioFiles,
      tracks,
      playbackState.isPlaying,
      playbackState.currentTime,
      playbackState.loop,
      initAudioContext,
      getProjectDuration,
    ],
  )

  const pause = useCallback(() => {
    sourceNodesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Source may already be stopped
      }
    })
    sourceNodesRef.current.clear()

    trackGainNodesRef.current.forEach((gainNode) => {
      gainNode.disconnect()
    })
    trackGainNodesRef.current.clear()

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setPlaybackState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const stop = useCallback(() => {
    pause()
    setPlaybackState((prev) => ({ ...prev, currentTime: 0 }))
  }, [pause])

  const seek = useCallback(
    (time: number) => {
      const newTime = Math.max(0, Math.min(time, getProjectDuration()))

      // If playing, stop current playback and restart from new position
      if (playbackState.isPlaying) {
        // Stop current sources
        sourceNodesRef.current.forEach((source) => {
          try {
            source.stop()
          } catch (e) {
            // Source may already be stopped
          }
        })
        sourceNodesRef.current.clear()

        trackGainNodesRef.current.forEach((gainNode) => {
          gainNode.disconnect()
        })
        trackGainNodesRef.current.clear()

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        // Update time immediately
        setPlaybackState((prev) => ({ ...prev, currentTime: newTime }))

        // Restart playback from new position after a minimal delay
        setTimeout(() => {
          play(newTime)
        }, 10)
      } else {
        // Just update the time if not playing
        setPlaybackState((prev) => ({ ...prev, currentTime: newTime }))
      }
    },
    [playbackState.isPlaying, play, getProjectDuration],
  )

  const setMasterVolume = useCallback((volume: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [])

  const updateEQ = useCallback((band: "low" | "mid" | "high", value: number) => {
    setMasterEQ((prev) => ({ ...prev, [band]: value }))

    const node = eqNodesRef.current[band]
    if (node) {
      node.gain.value = value
    }
  }, [])

  const toggleLoop = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, loop: !prev.loop }))
  }, [])

  const saveProject = useCallback(
    (name: string) => {
      const projectData = {
        name,
        tracks,
        masterEQ,
        bpm: playbackState.bpm,
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem(`music-studio-project-${Date.now()}`, JSON.stringify(projectData))
      return projectData
    },
    [tracks, masterEQ, playbackState.bpm],
  )

  const newProject = useCallback(() => {
    if (tracks.length > 0 && !confirm("Start a new project? All unsaved changes will be lost.")) {
      return
    }

    setTracks([])
    setAudioFiles((prev) => {
      prev.forEach((file) => URL.revokeObjectURL(file.url))
      return []
    })
    setPlaybackState((prev) => ({ ...prev, currentTime: 0, isPlaying: false }))
    setMasterEQ({ low: 0, mid: 0, high: 0 })
  }, [tracks.length])



  const exportProject = useCallback(
    async (format: "wav" | "mp3" = "wav"): Promise<void> => {
      if (tracks.length === 0) {
        throw new Error("No tracks to export")
      }

      await initAudioContext()

      const projectDuration = getProjectDuration()
      const sampleRate = audioContextRef.current!.sampleRate
      const numberOfChannels = 2 // Stereo
      const length = Math.ceil(projectDuration * sampleRate)

      // Create offline context for rendering
      const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)

      // Create master gain and EQ nodes for offline context
      const masterGain = offlineContext.createGain()
      masterGain.gain.value = gainNodeRef.current?.gain.value ?? 0.8

      const lowShelf = offlineContext.createBiquadFilter()
      lowShelf.type = "lowshelf"
      lowShelf.frequency.value = 100
      lowShelf.gain.value = masterEQ.low

      const midPeaking = offlineContext.createBiquadFilter()
      midPeaking.type = "peaking"
      midPeaking.frequency.value = 1000
      midPeaking.Q.value = 1
      midPeaking.gain.value = masterEQ.mid

      const highShelf = offlineContext.createBiquadFilter()
      highShelf.type = "highshelf"
      highShelf.frequency.value = 8000
      highShelf.gain.value = masterEQ.high

      // Connect EQ chain
      lowShelf.connect(midPeaking)
      midPeaking.connect(highShelf)
      highShelf.connect(masterGain)
      masterGain.connect(offlineContext.destination)

      // Process tracks
      const soloedTracks = tracks.filter((track) => track.soloed)
      const tracksToRender = soloedTracks.length > 0 ? soloedTracks : tracks.filter((track) => !track.muted)

      // Group tracks by audio file to avoid conflicts
      const tracksByAudioFile = new Map<string, Track[]>()
      tracksToRender.forEach((track) => {
        if (!tracksByAudioFile.has(track.audioFileId)) {
          tracksByAudioFile.set(track.audioFileId, [])
        }
        tracksByAudioFile.get(track.audioFileId)!.push(track)
      })

      // Create sources for each track
      tracksByAudioFile.forEach((tracksForFile, audioFileId) => {
        const audioFile = audioFiles.find((f) => f.id === audioFileId)
        if (!audioFile?.buffer) return

        tracksForFile.forEach((track) => {
          const source = offlineContext.createBufferSource()
          const gainNode = offlineContext.createGain()

          source.buffer = audioFile.buffer ?? null
          source.connect(gainNode)
          gainNode.connect(lowShelf)

          gainNode.gain.value = track.volume

          const sourceOffset = track.trimStart
          const duration = Math.min(track.trimEnd - track.trimStart, track.endTime - track.startTime)

          if (duration > 0 && audioFile.buffer && sourceOffset < audioFile.buffer.duration) {
            try {
              source.start(track.startTime, sourceOffset, duration)
            } catch (e) {
              console.warn("Failed to start offline audio source:", e)
            }
          }
        })
      })

      // Render the audio
      const renderedBuffer = await offlineContext.startRendering()

      // Convert to WAV
      const wavBuffer = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wavBuffer], { type: "audio/wav" })

      // Download the file
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `music-studio-export-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [tracks, audioFiles, masterEQ, initAudioContext, getProjectDuration],
  )
  const exportToBandcoin = useCallback(
    async (format: "wav" | "mp3" = "wav"): Promise<Blob> => {
      if (tracks.length === 0) {
        throw new Error("No tracks to export")
      }

      await initAudioContext()

      const projectDuration = getProjectDuration()
      const sampleRate = audioContextRef.current!.sampleRate
      const numberOfChannels = 2 // Stereo
      const length = Math.ceil(projectDuration * sampleRate)

      // Create offline context for rendering
      const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate)

      // Create master gain and EQ nodes for offline context
      const masterGain = offlineContext.createGain()
      masterGain.gain.value = gainNodeRef.current?.gain.value ?? 0.8

      const lowShelf = offlineContext.createBiquadFilter()
      lowShelf.type = "lowshelf"
      lowShelf.frequency.value = 100
      lowShelf.gain.value = masterEQ.low

      const midPeaking = offlineContext.createBiquadFilter()
      midPeaking.type = "peaking"
      midPeaking.frequency.value = 1000
      midPeaking.Q.value = 1
      midPeaking.gain.value = masterEQ.mid

      const highShelf = offlineContext.createBiquadFilter()
      highShelf.type = "highshelf"
      highShelf.frequency.value = 8000
      highShelf.gain.value = masterEQ.high

      // Connect EQ chain
      lowShelf.connect(midPeaking)
      midPeaking.connect(highShelf)
      highShelf.connect(masterGain)
      masterGain.connect(offlineContext.destination)

      // Process tracks
      const soloedTracks = tracks.filter((track) => track.soloed)
      const tracksToRender = soloedTracks.length > 0 ? soloedTracks : tracks.filter((track) => !track.muted)

      // Group tracks by audio file to avoid conflicts
      const tracksByAudioFile = new Map<string, Track[]>()
      tracksToRender.forEach((track) => {
        if (!tracksByAudioFile.has(track.audioFileId)) {
          tracksByAudioFile.set(track.audioFileId, [])
        }
        tracksByAudioFile.get(track.audioFileId)!.push(track)
      })

      // Create sources for each track
      tracksByAudioFile.forEach((tracksForFile, audioFileId) => {
        const audioFile = audioFiles.find((f) => f.id === audioFileId)
        if (!audioFile?.buffer) return

        tracksForFile.forEach((track) => {
          const source = offlineContext.createBufferSource()
          const gainNode = offlineContext.createGain()

          source.buffer = audioFile.buffer ?? null
          source.connect(gainNode)
          gainNode.connect(lowShelf)

          gainNode.gain.value = track.volume

          const sourceOffset = track.trimStart
          const duration = Math.min(track.trimEnd - track.trimStart, track.endTime - track.startTime)

          if (duration > 0 && audioFile.buffer && sourceOffset < audioFile.buffer.duration) {
            try {
              source.start(track.startTime, sourceOffset, duration)
            } catch (e) {
              console.warn("Failed to start offline audio source:", e)
            }
          }
        })
      })

      // Render the audio
      const renderedBuffer = await offlineContext.startRendering()

      // Convert to WAV
      const wavBuffer = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wavBuffer], { type: "audio/wav" })
      return blob
    },
    [tracks, audioFiles, masterEQ, initAudioContext, getProjectDuration],
  )

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 2
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = length * blockAlign
    const bufferSize = 44 + dataSize

    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true) // PCM format
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bytesPerSample * 8, true)
    writeString(36, "data")
    view.setUint32(40, dataSize, true)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i] ?? 0))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return arrayBuffer
  }
  useEffect(() => {
    const duration = getProjectDuration()
    setPlaybackState((prev) => ({ ...prev, duration }))
  }, [getProjectDuration])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      sourceNodesRef.current.forEach((source) => {
        try {
          source.stop()
        } catch (e) {
          // Source may already be stopped
        }
      })
      trackGainNodesRef.current.forEach((gainNode) => {
        gainNode.disconnect()
      })
      audioFiles.forEach((file) => {
        URL.revokeObjectURL(file.url)
      })
    }
  }, [audioFiles])

  return {
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
    getProjectDuration,
    saveProject,
    newProject,
    exportProject,
    exportToBandcoin
  }
}
