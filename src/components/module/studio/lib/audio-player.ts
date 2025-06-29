export class AudioPlayer {
  private audioContext: AudioContext
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode
  private isPlaying = false
  private isPaused = false
  private pausedAt = 0
  private startedAt = 0
  private audioBuffer: AudioBuffer | null = null
  private seekOffset = 0

  constructor() {
    this.audioContext = new (
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
    )()
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    this.gainNode.gain.value = 0.8
  }

  async loadFromBlob(blob: Blob): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer()
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
  }

  async loadFromArrayBuffers(chunks: ArrayBuffer[]): Promise<void> {
    if (chunks.length === 0) return

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const combinedBuffer = new Uint8Array(totalLength)

    let offset = 0
    for (const chunk of chunks) {
      combinedBuffer.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    try {
      this.audioBuffer = await this.audioContext.decodeAudioData(combinedBuffer.buffer)
    } catch (error) {
      const wavBuffer = this.createWavFromPCM(combinedBuffer, 48000, 2)
      this.audioBuffer = await this.audioContext.decodeAudioData(wavBuffer)
    }
  }

  private createWavFromPCM(pcmData: Uint8Array, sampleRate: number, channels: number): ArrayBuffer {
    const length = pcmData.length
    const buffer = new ArrayBuffer(44 + length)
    const view = new DataView(buffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + length, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true)
    view.setUint16(32, channels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, length, true)

    const pcmView = new Uint8Array(buffer, 44)
    pcmView.set(pcmData)

    return buffer
  }

  private createSourceAndPlay(startTime = 0, duration?: number): void {
    if (!this.audioBuffer) return

    this.currentSource = this.audioContext.createBufferSource()
    this.currentSource.buffer = this.audioBuffer
    this.currentSource.connect(this.gainNode)

    const when = this.audioContext.currentTime
    const offset = startTime
    const actualDuration = duration ?? this.audioBuffer.duration - startTime

    this.currentSource.start(when, offset, actualDuration)
    this.startedAt = when - offset
    this.seekOffset = startTime

    this.currentSource.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false
        this.isPaused = false
        this.pausedAt = this.audioBuffer?.duration ?? 0
      }
    }
  }

  play(): void {
    if (!this.audioBuffer) return

    this.audioContext.resume()

    if (this.isPaused) {
      // Resume from pause
      this.createSourceAndPlay(this.pausedAt)
      this.isPaused = false
    } else {
      // Start from beginning
      this.createSourceAndPlay(0)
      this.pausedAt = 0
    }

    this.isPlaying = true
  }

  pause(): void {
    if (!this.isPlaying || !this.currentSource) return

    this.pausedAt = this.getCurrentTime()
    this.currentSource.stop()
    this.currentSource = null
    this.isPlaying = false
    this.isPaused = true
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.isPlaying = false
    this.isPaused = false
    this.pausedAt = 0
    this.seekOffset = 0
  }

  seekTo(time: number): void {
    if (!this.audioBuffer) return

    const wasPlaying = this.isPlaying
    const clampedTime = Math.max(0, Math.min(time, this.audioBuffer.duration))

    // Stop current playback
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }

    this.pausedAt = clampedTime

    // If we were playing, start from the new position
    if (wasPlaying) {
      this.createSourceAndPlay(clampedTime)
      this.isPlaying = true
      this.isPaused = false
    } else {
      this.isPlaying = false
      this.isPaused = clampedTime > 0
    }
  }

  getCurrentTime(): number {
    if (!this.audioBuffer) return 0

    if (this.isPlaying && this.startedAt !== undefined) {
      const elapsed = this.audioContext.currentTime - this.startedAt
      return Math.min(elapsed, this.audioBuffer.duration)
    }
    return this.pausedAt
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0
  }

  setVolume(volume: number): void {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
  }

  get playing(): boolean {
    return this.isPlaying
  }

  get paused(): boolean {
    return this.isPaused
  }
}
