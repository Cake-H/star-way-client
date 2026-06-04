import { onBeforeUnmount, ref } from 'vue'

/** 环绕麦克风的放射条数量 */
const BAR_COUNT = 36

/** 从麦克风流读取音量，驱动波形条（0~1） */
export function useMicLevel() {
  const level = ref(0)
  const bars = ref<number[]>(Array.from({ length: BAR_COUNT }, () => 0.12))

  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let rafId = 0
  let dataArray: Uint8Array = new Uint8Array(0)
  let silentFrames = 0

  /** 连续约 2s 几乎无声音 */
  const isSilent = ref(false)

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    analyser = null
    if (audioContext) {
      audioContext.close().catch(() => undefined)
      audioContext = null
    }
    level.value = 0
    bars.value = Array.from({ length: BAR_COUNT }, () => 0.12)
    silentFrames = 0
    isSilent.value = false
  }

  function start(stream: MediaStream) {
    stop()
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    source.connect(analyser)
    dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      if (!analyser) return
      analyser.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      const instant = Math.min(1, (sum / dataArray.length / 255) * 2.2)
      level.value = level.value * 0.65 + instant * 0.35

      if (level.value < 0.06) {
        silentFrames += 1
        isSilent.value = silentFrames > 50
      } else {
        silentFrames = 0
        isSilent.value = false
      }

      bars.value = bars.value.map((prev, i) => {
        const idx = Math.floor((i / BAR_COUNT) * dataArray.length)
        const band = dataArray[idx] / 255
        const target = Math.max(0.12, Math.min(1, band * 1.35 + level.value * 0.25))
        return prev * 0.55 + target * 0.45
      })

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  }

  onBeforeUnmount(stop)

  return { level, bars, isSilent, start, stop }
}
