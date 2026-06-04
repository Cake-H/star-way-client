/**
 * 面试语音上传：将浏览器录音转为阿里云实时听写可识别的格式。
 *
 * MediaRecorder 默认产出 WebM 容器，不能当作 OPUS 裸流或 WAV 直接发给 NLS。
 * 上传前统一转为 16kHz、单声道、PCM WAV（与后端 sample-rate: 16000 对齐）。
 */

export const INTERVIEW_AUDIO_UPLOAD_NAME = 'interview-voice.wav'
export const INTERVIEW_AUDIO_UPLOAD_TYPE = 'audio/wav'

const TARGET_SAMPLE_RATE = 16000
/** 约 0.05s 16-bit mono + 44 字节头 */
const MIN_WAV_BYTES = 2000

export function pickMediaRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels } = buffer
  const out = new Float32Array(length)
  if (numberOfChannels === 1) {
    out.set(buffer.getChannelData(0))
    return out
  }
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) out[i] += ch[i] / numberOfChannels
  }
  return out
}

function floatTo16BitPcm(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function encodeWavPcm(pcm: Int16Array, sampleRate: number): Blob {
  const dataSize = pcm.length * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < pcm.length; i++, offset += 2) {
    view.setInt16(offset, pcm[i], true)
  }
  return new Blob([buffer], { type: INTERVIEW_AUDIO_UPLOAD_TYPE })
}

/** 解码任意浏览器录音 Blob，重采样为 16kHz 单声道 WAV */
export async function blobToWav16kMono(input: Blob): Promise<Blob> {
  const arrayBuffer = await input.arrayBuffer()
  if (arrayBuffer.byteLength < 100) {
    throw new Error('录音数据为空，请重新口述')
  }

  const decodeCtx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
  } catch {
    throw new Error('无法解析录音格式，请换 Chrome/Edge 重试或缩短录音后重录')
  } finally {
    await decodeCtx.close().catch(() => undefined)
  }

  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE))
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE)
  const monoSrc = offline.createBuffer(1, decoded.length, decoded.sampleRate)
  monoSrc.copyToChannel(mixToMono(decoded), 0)
  const source = offline.createBufferSource()
  source.buffer = monoSrc
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  const pcm = floatTo16BitPcm(rendered.getChannelData(0))
  return encodeWavPcm(pcm, TARGET_SAMPLE_RATE)
}

/** 供 multipart 上传：16kHz mono WAV，带正确文件名与 Content-Type */
export async function prepareInterviewAudioFile(recorded: Blob): Promise<File> {
  if (recorded.size < 100) {
    throw new Error('录音文件过小，请重新口述（建议至少 1 秒）')
  }
  const wav = await blobToWav16kMono(recorded)
  if (wav.size < MIN_WAV_BYTES) {
    throw new Error('录音有效内容过短，请重新口述')
  }
  return new File([wav], INTERVIEW_AUDIO_UPLOAD_NAME, { type: INTERVIEW_AUDIO_UPLOAD_TYPE })
}
