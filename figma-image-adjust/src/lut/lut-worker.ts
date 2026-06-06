// Web Worker：在背景執行緒計算 LUT，讓主執行緒不被阻塞
import { LutEngine } from './LutEngine'
import type { AdjustmentParams } from '../types'

const engine = new LutEngine()

self.onmessage = (e: MessageEvent<AdjustmentParams>) => {
  const lut = engine.compute(e.data)
  // 快取持有 lut 本身，傳送前先 slice 一份，避免 transfer 後 buffer 被 detach
  const toSend = lut.slice()
  self.postMessage(toSend, [toSend.buffer])
}
