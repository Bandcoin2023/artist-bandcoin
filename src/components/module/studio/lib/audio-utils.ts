"use client"

export function downloadAudioBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function createAudioBlobFromChunks(chunks: ArrayBuffer[], sampleRate = 48000, channels = 2): Blob {
  if (chunks.length === 0) {
    return new Blob([], { type: "audio/wav" })
  }

  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const combinedBuffer = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    combinedBuffer.set(new Uint8Array(chunk), offset)
    offset += chunk.byteLength
  }

  // Create WAV file
  const wavBuffer = createWavFromPCM(combinedBuffer, sampleRate, channels)
  return new Blob([wavBuffer], { type: "audio/wav" })
}

function createWavFromPCM(pcmData: Uint8Array, sampleRate: number, channels: number): ArrayBuffer {
  const length = pcmData.length
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)

  // WAV header
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
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true) // byte rate
  view.setUint16(32, channels * 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, "data")
  view.setUint32(40, length, true)

  // Copy PCM data
  const pcmView = new Uint8Array(buffer, 44)
  pcmView.set(pcmData)

  return buffer
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function shareTrack(track: { title: string; prompts: string[] }): void {
  if (navigator.share) {
    navigator
      .share({
        title: track.title,
        text: `Check out this AI-generated music track: ${track.prompts.join(" + ")}`,
        url: window.location.href,
      })
      .catch(console.error)
  } else {
    // Fallback: copy to clipboard
    const text = `${track.title} - Generated with prompts: ${track.prompts.join(" + ")}\n${window.location.href}`
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Track info copied to clipboard!")
      })
      .catch(() => {
        alert("Unable to share. Please copy the URL manually.")
      })
  }
}
