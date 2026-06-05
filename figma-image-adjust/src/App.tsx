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

export default function App() {
  const lutEngine = useRef(new LutEngine()).current
  const [tool, setTool] = useState<ToolId>('hsl')
  const [params, setParams] = useState<AdjustmentParams>(defaultAdjustmentParams())
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [histogram, setHistogram] = useState<number[] | null>(null)

  const [isComparing, setIsComparing] = useState(false)

  const previewRef = useRef<PreviewHandle>(null)
  const rafRef = useRef<number | null>(null)
  const identityLutRef = useRef<Uint8Array | null>(null)  // 原圖 identity LUT（對比用）
  const currentLutRef = useRef<Uint8Array | null>(null)   // 目前調整後的 LUT

  const waitForPreview = useCallback(async (): Promise<PreviewHandle> => {
    if (previewRef.current) return previewRef.current
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (!previewRef.current) throw new Error('Preview 尚未初始化')
    return previewRef.current
  }, [])

  // 每次 params 改變，重新計算 LUT 並更新預覽（非對比模式才顯示）
  const scheduleLutUpdate = useCallback((nextParams: AdjustmentParams) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const lutData = lutEngine.compute(nextParams)
      currentLutRef.current = lutData
      if (!isComparingRef.current) previewRef.current?.updateLut(lutData)
    })
  }, [])

  // 用 ref 追蹤 isComparing，讓 scheduleLutUpdate callback 不需要重建
  const isComparingRef = useRef(false)

  // 對比切換：按住看原圖，放開看調整後
  useEffect(() => {
    isComparingRef.current = isComparing
    if (!previewRef.current) return
    if (isComparing && identityLutRef.current) {
      previewRef.current.updateLut(identityLutRef.current)
    } else if (!isComparing && currentLutRef.current) {
      previewRef.current.updateLut(currentLutRef.current)
    }
  }, [isComparing])

  const handleParamsChange = (updater: (prev: AdjustmentParams) => AdjustmentParams) => {
    setParams(prev => {
      const next = updater(prev)
      if (isLoaded) scheduleLutUpdate(next)
      return next
    })
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
          identityLutRef.current = lutData   // 存起來供對比用
          currentLutRef.current = lutData
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
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('無法建立 2D canvas context')
      const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height)
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

  const resetHsl = () => handleParamsChange(prev => ({ ...prev, hsl: defaultHslParams() }))
  const resetColorBalance = () => handleParamsChange(prev => ({ ...prev, colorBalance: defaultColorBalanceParams() }))
  const resetLevels = () => handleParamsChange(prev => ({ ...prev, levels: defaultLevelsParams() }))

  if (errorMessage) {
    return <ErrorState message={errorMessage} />
  }

  return (
    <div style={{ width: 380, minHeight: 480, display: 'flex', flexDirection: 'column' }}>
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
              onChange={(hsl) => handleParamsChange(prev => ({ ...prev, hsl }))}
              onReset={resetHsl}
            />
          )}
          {tool === 'colorBalance' && (
            <ColorBalance
              params={params.colorBalance}
              onChange={(colorBalance) => handleParamsChange(prev => ({ ...prev, colorBalance }))}
              onReset={resetColorBalance}
            />
          )}
          {tool === 'levels' && (
            <Levels
              params={params.levels}
              histogram={histogram}
              onChange={(levels) => handleParamsChange(prev => ({ ...prev, levels }))}
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
              const defaults = defaultAdjustmentParams()
              setParams(defaults)
              scheduleLutUpdate(defaults)
            }}
            style={{
              flex: 1, padding: '6px 0', border: '1px solid #d4d4d4',
              borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff',
            }}
          >
            重設
          </button>
          {/* 按住查看原圖，放開回到調整後 */}
          <button
            onMouseDown={() => setIsComparing(true)}
            onMouseUp={() => setIsComparing(false)}
            onMouseLeave={() => setIsComparing(false)}
            style={{
              flex: 1, padding: '6px 0', border: '1px solid',
              borderColor: isComparing ? '#18A0FB' : '#d4d4d4',
              borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: isComparing ? '#e8f4ff' : '#fff',
              color: isComparing ? '#18A0FB' : '#555',
            }}
          >
            {isComparing ? '原圖' : '對比'}
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
