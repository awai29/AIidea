import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar, type ToolId } from './components/Sidebar'
import { Preview, type PreviewHandle } from './components/Preview'
import { ErrorState } from './components/ErrorState'
import { HueSaturation } from './tools/HueSaturation'
import { ColorBalance } from './tools/ColorBalance'
import { Levels } from './tools/Levels'
import { LutEngine } from './lut/LutEngine'
import {
  defaultAdjustmentParams,
  defaultHslParams,
  defaultColorBalanceParams,
  defaultLevelsParams,
  type AdjustmentParams,
  type PluginToUIMessage,
} from './types'

// 從 RGBA pixels 計算直方圖
function computeHistogramFromPixels(pixels: Uint8Array): number[] {
  const hist = new Array(256).fill(0)
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2])
    hist[Math.min(255, lum)]++
  }
  return hist
}

const lutEngine = new LutEngine()

export default function App() {
  const [tool, setTool] = useState<ToolId>('hsl')
  const [params, setParams] = useState<AdjustmentParams>(defaultAdjustmentParams())
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [histogram, setHistogram] = useState<number[] | null>(null)

  const previewRef = useRef<PreviewHandle>(null)
  const rafRef = useRef<number | null>(null)

  const waitForPreview = useCallback(async (): Promise<PreviewHandle> => {
    if (previewRef.current) return previewRef.current
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (!previewRef.current) throw new Error('Preview 尚未初始化')
    return previewRef.current
  }, [])

  // 每次 params 改變，重新計算 LUT 並更新預覽
  const scheduleLutUpdate = useCallback((nextParams: AdjustmentParams) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const lutData = lutEngine.compute(nextParams)
      previewRef.current?.updateLut(lutData)
    })
  }, [])

  const handleParamsChange = (next: AdjustmentParams) => {
    setParams(next)
    if (isLoaded) scheduleLutUpdate(next)
  }

  // 接收來自 plugin code 的訊息
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginToUIMessage | undefined
      if (!msg) return

      if (msg.type === 'error') {
        setErrorMessage(msg.message)
        return
      }

      if (msg.type === 'image') {
        setErrorMessage(null)
        setImageSize({ width: msg.width, height: msg.height })
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

        try {
          const preview = await waitForPreview()
          await preview.loadImage(msg.bytes, msg.width, msg.height)

          // 初始化預設 LUT（identity）
          const initParams = defaultAdjustmentParams()
          const lutData = lutEngine.compute(initParams)
          preview.updateLut(lutData)

          // 計算直方圖（讀取初始 RGBA pixels）
          const { pixels } = preview.readPixels()
          setHistogram(computeHistogramFromPixels(pixels))

          setIsLoaded(true)
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Preview 初始化失敗')
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [waitForPreview])

  // 通知 plugin code UI 已準備好
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'ready' } }, '*')
  }, [])

  const handleApply = async () => {
    if (!isLoaded || isApplying) return
    setIsApplying(true)
    try {
      const preview = await waitForPreview()
      const { pixels, width, height } = preview.readPixels()

      // 將 RGBA pixels 轉為 PNG bytes（使用 canvas + toBlob）
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      const plainBuffer = pixels.buffer instanceof SharedArrayBuffer
        ? (pixels.buffer.slice(0) as unknown as ArrayBuffer)
        : (pixels.buffer as unknown as ArrayBuffer)
      const imageData = new ImageData(new Uint8ClampedArray(plainBuffer), width, height)
      ctx.putImageData(imageData, 0, 0)

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 編碼失敗'))), 'image/png')
      )
      const arrayBuffer = await blob.arrayBuffer()
      const pngBytes = new Uint8Array(arrayBuffer)

      parent.postMessage(
        { pluginMessage: { type: 'apply', bytes: pngBytes, width, height } },
        '*',
        [pngBytes.buffer]
      )
    } finally {
      setIsApplying(false)
    }
  }

  const resetHsl = () => handleParamsChange({ ...params, hsl: defaultHslParams() })
  const resetColorBalance = () => handleParamsChange({ ...params, colorBalance: defaultColorBalanceParams() })
  const resetLevels = () => handleParamsChange({ ...params, levels: defaultLevelsParams() })

  if (errorMessage) {
    return <ErrorState message={errorMessage} />
  }

  return (
    <div style={{ width: 360, minHeight: 480, display: 'flex', flexDirection: 'column' }}>
      <Sidebar active={tool} onChange={setTool} />

      {/* Preview 永遠掛載（使 WebGLRenderer 在訊息到達前就初始化完成）
          圖片未載入時隱藏，顯示載入提示 */}
      <div style={{ display: isLoaded ? 'block' : 'none' }}>
        <Preview
          ref={previewRef}
          width={imageSize.width || 1}
          height={imageSize.height || 1}
        />
      </div>

      {!isLoaded && (
        <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 12 }}>
          載入圖片中…
        </div>
      )}

      {/* 工具面板 */}
      {isLoaded && (
        <>
          {tool === 'hsl' && (
            <HueSaturation
              params={params.hsl}
              onChange={(hsl) => handleParamsChange({ ...params, hsl })}
              onReset={resetHsl}
            />
          )}
          {tool === 'colorBalance' && (
            <ColorBalance
              params={params.colorBalance}
              onChange={(colorBalance) => handleParamsChange({ ...params, colorBalance })}
              onReset={resetColorBalance}
            />
          )}
          {tool === 'levels' && (
            <Levels
              params={params.levels}
              histogram={histogram}
              onChange={(levels) => handleParamsChange({ ...params, levels })}
              onReset={resetLevels}
            />
          )}
        </>
      )}

      {/* 底部按鈕列 */}
      {isLoaded && (
        <div style={{
          display: 'flex', gap: 8, padding: 12,
          borderTop: '1px solid #e5e5e5', marginTop: 'auto',
        }}>
          <button
            onClick={() => {
              setParams(defaultAdjustmentParams())
              scheduleLutUpdate(defaultAdjustmentParams())
            }}
            style={{
              flex: 1, padding: '6px 0', border: '1px solid #d4d4d4',
              borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff',
            }}
          >
            全部重設
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            style={{
              flex: 2, padding: '6px 0', border: 'none',
              borderRadius: 6, fontSize: 12, cursor: isApplying ? 'wait' : 'pointer',
              background: '#18A0FB', color: '#fff', fontWeight: 600,
            }}
          >
            {isApplying ? '套用中…' : '套用'}
          </button>
        </div>
      )}
    </div>
  )
}
