import { GoogleGenAI } from "@google/genai"
import { env } from "~/env"

// Improved audio decoding utilities
function decode(base64String: string): Uint8Array {
  const binaryString = atob(base64String)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

async function decodeAudioData(
  audioData: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number,
  channels: number,
): Promise<AudioBuffer> {
  try {
    // First, try to decode as a standard audio format
    let arrayBuffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)
    // Ensure arrayBuffer is an ArrayBuffer, not SharedArrayBuffer
    if (arrayBuffer instanceof ArrayBuffer) {
      return await audioContext.decodeAudioData(arrayBuffer)
    } else {
      arrayBuffer = new Uint8Array(arrayBuffer).buffer
      return await audioContext.decodeAudioData(arrayBuffer)
    }
  } catch (error) {
    // Lyria sends raw 16-bit PCM data, so we need to convert it
    const bytesPerSample = 2 // 16-bit = 2 bytes per sample
    const totalSamples = audioData.length / bytesPerSample
    const samplesPerChannel = Math.floor(totalSamples / channels)

    if (samplesPerChannel <= 0) {
      console.warn(`Invalid audio data: ${audioData.length} bytes, creating silence buffer`)
      // Return a small silence buffer instead of throwing
      return audioContext.createBuffer(channels, 1024, sampleRate)
    }

    // Create AudioBuffer with proper error handling
    try {
      const audioBuffer = audioContext.createBuffer(channels, samplesPerChannel, sampleRate)
      const dataView = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength)

      // Convert 16-bit PCM to float32 samples with bounds checking
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        for (let i = 0; i < samplesPerChannel; i++) {
          const byteIndex = (i * channels + channel) * bytesPerSample
          if (byteIndex + bytesPerSample <= audioData.length) {
            // Read as 16-bit signed integer (little-endian) and convert to float
            const sample = dataView.getInt16(byteIndex, true)
            channelData[i] = Math.max(-1, Math.min(1, sample / 32768.0)) // Clamp to valid range
          } else {
            channelData[i] = 0 // Fill with silence if data is incomplete
          }
        }
      }

      return audioBuffer
    } catch (bufferError) {
      console.error("Failed to create audio buffer:", bufferError)
      // Return a silence buffer as fallback
      return audioContext.createBuffer(channels, 1024, sampleRate)
    }
  }
}

interface WeightedPrompt {
  text: string
  weight: number
}

interface LiveMusicGenerationConfig {
  temperature?: number
  topK?: number
  guidance?: number
  seed?: number
  bpm?: number
  density?: number
  brightness?: number
  scale?: string
  muteBass?: boolean
  muteDrums?: boolean
  onlyBassAndDrums?: boolean
}

interface MusicSessionCallbacks {
  onMessage: (audioData: ArrayBuffer) => void
  onError: (error: Error) => void
  onClose: () => void
  onSetupComplete?: () => void
  onConnecting?: () => void
  onConnected?: () => void
}

// Type definitions for Lyria session
interface LyriaMessage {
  setupComplete?: boolean
  filteredPrompt?: {
    filteredReason: string
  }
  serverContent?: {
    audioChunks: Array<{
      data?: string
    }>
  }
}

interface LyriaSession {
  setWeightedPrompts: (params: { weightedPrompts: WeightedPrompt[] }) => Promise<void>
  setMusicGenerationConfig: (params: { musicGenerationConfig: LiveMusicGenerationConfig }) => Promise<void>
  play: () => void
  pause: () => void
  stop: () => void
  resetContext: () => void
  disconnect?: () => void
}

interface LyriaSessionCallbacks {
  onmessage: (message: LyriaMessage) => Promise<void>
  onerror: (error: ErrorEvent) => void
  onclose: (event: CloseEvent) => void
}

interface GoogleGenAILive {
  music: {
    connect: (params: {
      model: string
      callbacks: LyriaSessionCallbacks
    }) => Promise<LyriaSession>
  }
}

interface ExtendedGoogleGenAI {
  live: GoogleGenAILive
}

export class LyriaRealTimeSession {
  private session: LyriaSession | null = null
  private callbacks: MusicSessionCallbacks
  private isConnected = false
  private isConnecting = false
  private ai: ExtendedGoogleGenAI
  private audioContext: AudioContext
  private outputNode!: GainNode
  private nextStartTime = 0
  private readonly bufferTime = 0.5 // Reduced buffer time for better responsiveness
  private readonly sampleRate = 48000
  private audioChunksReceived = 0
  private connectionAttempts = 0
  private maxRetries = 3
  private retryDelay = 1000
  private audioQueue: AudioBuffer[] = [] // Queue for smooth playback
  private isProcessingQueue = false
  private lastScheduledTime = 0
  private minBufferDuration = 0.1 // Minimum buffer to prevent underruns

  constructor(callbacks: MusicSessionCallbacks) {
    this.callbacks = callbacks

    const apiKey = env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable is required")
    }

    this.ai = new GoogleGenAI({
      apiKey: apiKey,
      apiVersion: "v1alpha",
    }) as ExtendedGoogleGenAI

    // Initialize Web Audio API with optimal settings
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new AudioContextClass({
      sampleRate: this.sampleRate,
      latencyHint: "interactive",
    })

    this.setupAudioChain()
  }

  private setupAudioChain() {
    this.outputNode = this.audioContext.createGain()

    // Add a compressor for better audio quality
    const compressor = this.audioContext.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime)
    compressor.knee.setValueAtTime(30, this.audioContext.currentTime)
    compressor.ratio.setValueAtTime(12, this.audioContext.currentTime)
    compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime)
    compressor.release.setValueAtTime(0.25, this.audioContext.currentTime)

    this.outputNode.connect(compressor)
    compressor.connect(this.audioContext.destination)
    this.outputNode.gain.value = 0.7
  }

  private async processAudioQueue() {
    if (this.isProcessingQueue || this.audioQueue.length === 0) return

    this.isProcessingQueue = true

    try {
      while (this.audioQueue.length > 0) {
        const audioBuffer = this.audioQueue.shift()!

        // Calculate when to start this buffer
        const currentTime = this.audioContext.currentTime
        let startTime = Math.max(currentTime + 0.01, this.lastScheduledTime)

        // If we're getting behind, skip ahead slightly to prevent buildup
        if (startTime < currentTime) {
          console.log("🔧 Adjusting playback timing to prevent lag")
          startTime = currentTime + 0.05
        }

        // Create and schedule audio source
        const source = this.audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(this.outputNode)
        source.start(startTime)

        this.lastScheduledTime = startTime + audioBuffer.duration

        // Small delay to prevent overwhelming the audio context
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log("Already connecting or connected")
      return
    }

    this.isConnecting = true
    this.callbacks.onConnecting?.()

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Connecting to Lyria RealTime (attempt ${attempt}/${this.maxRetries})...`)

        if (attempt > 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt - 1)))
        }

        this.session = await this.ai.live.music.connect({
          model: "lyria-realtime-exp",
          callbacks: {
            onmessage: async (message: LyriaMessage) => {
              console.log("Received message from Lyria:", message)

              if (message.setupComplete) {
                this.isConnected = true
                this.isConnecting = false
                this.connectionAttempts = 0
                this.callbacks.onConnected?.()
                this.callbacks.onSetupComplete?.()
                console.log("✅ Lyria setup complete - ready for audio generation")
              }

              if (message.filteredPrompt) {
                console.warn("⚠️ Prompt filtered:", message.filteredPrompt.filteredReason)
              }

              if (message.serverContent?.audioChunks && message.serverContent.audioChunks.length > 0) {
                this.audioChunksReceived++
                console.log(`🎵 Processing audio chunk #${this.audioChunksReceived}`)

                try {
                  for (const audioChunk of message.serverContent.audioChunks) {
                    if (!audioChunk.data) continue

                    const audioData = decode(audioChunk.data)
                    if (audioData.length === 0) {
                      console.warn("Received empty audio chunk")
                      continue
                    }

                    // Decode audio data to AudioBuffer
                    const audioBuffer = await decodeAudioData(audioData, this.audioContext, this.sampleRate, 2)

                    // Add to queue instead of playing immediately
                    this.audioQueue.push(audioBuffer)

                    // Process queue if not already processing
                    void this.processAudioQueue()

                    // Pass raw audio data to callback for recording
                    // Ensure we pass a real ArrayBuffer, not SharedArrayBuffer
                    this.callbacks.onMessage(
                      audioData.buffer instanceof ArrayBuffer
                        ? audioData.buffer.slice(0)
                        : new Uint8Array(audioData).buffer,
                    )
                  }
                } catch (error) {
                  console.error("❌ Error processing audio chunk:", error)
                  // Don't throw here, just log and continue
                }
              }
            },
            onerror: (error: ErrorEvent) => {
              console.error("❌ Lyria session error:", error)
              this.isConnected = false
              this.isConnecting = false

              if (attempt === this.maxRetries) {
                this.callbacks.onError(new Error(error.message || "Connection error after all retries"))
              }
            },
            onclose: (event: CloseEvent) => {
              console.log("🔌 Lyria session closed:", event)
              this.isConnected = false
              this.isConnecting = false

              if (this.connectionAttempts > 0) {
                this.callbacks.onClose()
              }
            },
          },
        })

        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (this.isConnected) {
          console.log("✅ Successfully connected to Lyria RealTime")
          this.connectionAttempts = attempt
          return
        } else {
          console.log(`⏳ Connection attempt ${attempt} - waiting for setup complete...`)
          await new Promise((resolve) => setTimeout(resolve, 3000))

          if (this.isConnected) {
            console.log("✅ Successfully connected to Lyria RealTime (delayed setup)")
            this.connectionAttempts = attempt
            return
          }
        }
      } catch (error) {
        console.error(`❌ Connection attempt ${attempt} failed:`, error)

        if (this.session) {
          try {
            this.session.disconnect?.()
          } catch (disconnectError) {
            console.error("Error disconnecting failed session:", disconnectError)
          }
          this.session = null
        }

        if (attempt === this.maxRetries) {
          this.isConnecting = false
          const errorMessage = error instanceof Error ? error.message : String(error)
          throw new Error(`Failed to connect to Lyria RealTime after ${this.maxRetries} attempts: ${errorMessage}`)
        }
      }
    }

    this.isConnecting = false
    throw new Error("Failed to connect to Lyria RealTime - setup did not complete")
  }

  async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      return
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (this.isConnected) {
        return
      }
    }

    await this.connect()
  }

  async setWeightedPrompts(prompts: WeightedPrompt[]) {
    await this.ensureConnected()
    console.log("🎯 Setting weighted prompts:", prompts)
    if (this.session) {
      await this.session.setWeightedPrompts({ weightedPrompts: prompts })
    }
  }

  async setMusicGenerationConfig(config: LiveMusicGenerationConfig) {
    await this.ensureConnected()
    console.log("⚙️ Setting music generation config:", config)
    if (this.session) {
      await this.session.setMusicGenerationConfig({ musicGenerationConfig: config })
    }
  }

  async play() {
    await this.ensureConnected()

    // Reset audio state
    this.audioQueue = []
    this.nextStartTime = 0
    this.lastScheduledTime = 0
    this.audioChunksReceived = 0
    this.isProcessingQueue = false

    await this.audioContext.resume()
    if (this.session) {
      this.session.play()
    }

    console.log("▶️ Started Lyria playback")

    // Smooth fade in
    this.outputNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    this.outputNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + 0.2)
  }

  pause() {
    if (!this.session || !this.isConnected) return

    console.log("⏸️ Pausing Lyria playback")
    this.session.pause()

    // Smooth fade out
    this.outputNode.gain.setValueAtTime(0.7, this.audioContext.currentTime)
    this.outputNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1)

    // Clear audio queue and reset timing
    this.audioQueue = []
    this.nextStartTime = 0
    this.lastScheduledTime = 0
    this.isProcessingQueue = false
    this.setupAudioChain()
  }

  stop() {
    if (!this.session || !this.isConnected) return

    console.log("⏹️ Stopping Lyria playback")
    this.session.stop()

    // Immediate stop
    this.outputNode.gain.setValueAtTime(0, this.audioContext.currentTime)

    // Clear all audio state
    this.audioQueue = []
    this.nextStartTime = 0
    this.lastScheduledTime = 0
    this.audioChunksReceived = 0
    this.isProcessingQueue = false
  }

  async resetContext() {
    await this.ensureConnected()
    console.log("🔄 Resetting Lyria context")
    if (this.session) {
      this.session.resetContext()
    }

    // Reset audio state
    this.audioQueue = []
    this.nextStartTime = 0
    this.lastScheduledTime = 0
    this.audioChunksReceived = 0
    this.isProcessingQueue = false
  }

  disconnect() {
    console.log("🔌 Disconnecting from Lyria")
    this.isConnected = false
    this.isConnecting = false

    // Clear audio queue
    this.audioQueue = []
    this.isProcessingQueue = false

    if (this.session) {
      try {
        this.session.disconnect?.()
      } catch (error) {
        console.error("Error disconnecting session:", error)
      }
      this.session = null
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close()
    }
  }

  get connected(): boolean {
    return this.isConnected
  }

  get connecting(): boolean {
    return this.isConnecting
  }
}
