import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar, type ToolId } from './components/Sidebar'
import { Preview, type PreviewHandle } from './components/Preview'
import { ErrorState } from './components/ErrorState'
import { HueSaturation } from './tools/HueSaturation'
import { ColorBalance } from './tools/ColorBalance'
import { Levels } from './tools/Levels'
import { Curves } from './tools/Curves'
import { LutEngine } from './lut/LutEngine'
// @ts-ignore - Vite ?worker&inline：打包進 HTML，不產生獨立檔案
import LutWorker from './lut/lut-worker?worker&inline'
import {
  defaultAdjustmentParams,
  defaultHslParams,
  defaultColorBalanceParams,
  defaultLevelsParams,
  defaultCurvesParams,
  type AdjustmentParams,
  type HistogramData,
  type PluginToUIMessage,
} from './types'

// 模組級別的預設值（用於 modifiedTools 比較，避免每次 render 重新建立）
const DEFAULT_PARAMS = defaultAdjustmentParams()

// 從 RGBA pixels 計算 RGB + 亮度直方圖
function computeHistogramFromPixels(pixels: Uint8Array): HistogramData {
  const lum = new Array(256).fill(0)
  const r = new Array(256).fill(0)
  const g = new Array(256).fill(0)
  const b = new Array(256).fill(0)
  for (let i = 0; i < pixels.length; i += 4) {
    r[pixels[i]]++
    g[pixels[i + 1]]++
    b[pixels[i + 2]]++
    const l = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2])
    lum[Math.min(255, l)]++
  }
  return { lum, r, g, b }
}

export default function App() {
  const lutEngine = useRef(new LutEngine()).current
  const [tool, setTool] = useState<ToolId>('hsl')
  const [params, setParams] = useState<AdjustmentParams>(defaultAdjustmentParams())
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [histogram, setHistogram] = useState<HistogramData | null>(null)
  // 預設跟隨系統主題，使用者可手動切換覆蓋
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  // 每張圖片各自的調整參數（key = Figma nodeId）
  const imageParamsMap = useRef<Map<string, AdjustmentParams>>(new Map())
  // 目前正在編輯的圖片節點 ID
  const currentNodeIdRef = useRef<string | null>(null)

  // Undo / Redo 歷史堆疊
  const undoStack = useRef<AdjustmentParams[]>([])
  const redoStack = useRef<AdjustmentParams[]>([])
  // 本次連續修改開始前的快照（800ms debounce 後才 commit 進 stack）
  const pendingUndoSnapshot = useRef<AdjustmentParams | null>(null)
  const undoDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 永遠指向最新 params，讓 undo/redo callback 讀到即時值
  const paramsRef = useRef<AdjustmentParams>(defaultAdjustmentParams())

  // Web Worker（背景執行緒計算 LUT）
  const workerRef = useRef<Worker | null>(null)
  const lutGenRef = useRef(0)  // 版本號：忽略過期的 Worker 回應

  // 儲存最後一張圖片 bytes，讓 WebGL context restore 時可重新載入
  const currentImageBytesRef = useRef<{ bytes: Uint8Array; width: number; height: number } | null>(null)

  // 分割預覽
  const [isSplit, setIsSplit] = useState(false)
  const [splitX, setSplitX] = useState(0.5)
  const isSplitRef = useRef(false)

  // 將 data-theme 設到 <html>，讓 CSS 變數在全域生效
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // 建立 Web Worker（若 Figma iframe CSP 不允許則 fallback 到同步計算）
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workerRef.current = new (LutWorker as any)()
    } catch {
      console.warn('LUT Worker 無法啟動，改用同步計算')
      workerRef.current = null
    }
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  const previewRef = useRef<PreviewHandle>(null)
  const rafRef = useRef<number | null>(null)
  const currentLutRef = useRef<Uint8Array | null>(null)   // 目前調整後的 LUT

  const waitForPreview = useCallback(async (): Promise<PreviewHandle> => {
    if (previewRef.current) return previewRef.current
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (!previewRef.current) throw new Error('Preview 尚未初始化')
    return previewRef.current
  }, [])

  // 每次 params 改變，重新計算 LUT 並更新預覽（含即時直方圖）
  const scheduleLutUpdate = useCallback((nextParams: AdjustmentParams) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const gen = ++lutGenRef.current

      const applyLut = (lutData: Uint8Array) => {
        if (gen !== lutGenRef.current) return  // 被新的請求取代，忽略
        currentLutRef.current = lutData
        previewRef.current?.updateLut(lutData)
        // 即時直方圖：從 preview viewport 讀取調整後的像素
        // 分割模式下 viewport 含原圖像素，跳過直方圖更新
        if (!isSplitRef.current) {
          const px = previewRef.current?.readViewportPixels()
          if (px) setHistogram(computeHistogramFromPixels(px))
        }
      }

      const worker = workerRef.current
      if (worker) {
        worker.onmessage = (e: MessageEvent<Uint8Array>) => applyLut(e.data)
        worker.postMessage(nextParams)
      } else {
        applyLut(lutEngine.compute(nextParams))
      }
    })
  }, [])

  // 同步 isSplitRef 讓 scheduleLutUpdate 讀到最新值
  useEffect(() => {
    isSplitRef.current = isSplit
    // 通知 WebGL renderer 更新分割線
    previewRef.current?.setSplit(isSplit ? splitX : -1)
  }, [isSplit, splitX])

  // paramsRef 永遠指向最新 params（讓 undo/redo callback 不需要 deps）
  paramsRef.current = params

  // 提交 undo 快照到堆疊（最多保留 50 步）
  const commitUndoSnapshot = useCallback(() => {
    if (pendingUndoSnapshot.current) {
      undoStack.current.push(pendingUndoSnapshot.current)
      if (undoStack.current.length > 50) undoStack.current.shift()
      pendingUndoSnapshot.current = null
    }
  }, [])

  const handleParamsChange = (updater: (prev: AdjustmentParams) => AdjustmentParams) => {
    if (isLoaded) {
      // 任何使用者修改都清除 redo
      redoStack.current = []
      // 第一次修改時，快照修改前的狀態
      if (!pendingUndoSnapshot.current) {
        pendingUndoSnapshot.current = paramsRef.current
      }
      // 800ms 內無新修改才 commit（把連續拖曳當成一個步驟）
      if (undoDebounceTimer.current) clearTimeout(undoDebounceTimer.current)
      undoDebounceTimer.current = setTimeout(commitUndoSnapshot, 800)
    }

    setParams(prev => {
      const next = updater(prev)
      if (isLoaded) {
        scheduleLutUpdate(next)
        if (currentNodeIdRef.current) {
          imageParamsMap.current.set(currentNodeIdRef.current, next)
        }
      }
      return next
    })
  }

  // 清除 undo/redo 暫存（切換圖片時呼叫）
  const clearUndoState = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    pendingUndoSnapshot.current = null
    if (undoDebounceTimer.current) {
      clearTimeout(undoDebounceTimer.current)
      undoDebounceTimer.current = null
    }
  }, [])

  // Ctrl+Z / Cmd+Z：還原上一步
  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return
    if (undoDebounceTimer.current) { clearTimeout(undoDebounceTimer.current); undoDebounceTimer.current = null }
    pendingUndoSnapshot.current = null
    redoStack.current.push(paramsRef.current)
    const prev = undoStack.current.pop()!
    setParams(prev)
    scheduleLutUpdate(prev)
    if (currentNodeIdRef.current) imageParamsMap.current.set(currentNodeIdRef.current, prev)
  }, [scheduleLutUpdate])

  // Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y：重做
  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return
    if (undoDebounceTimer.current) { clearTimeout(undoDebounceTimer.current); undoDebounceTimer.current = null }
    pendingUndoSnapshot.current = null
    undoStack.current.push(paramsRef.current)
    const next = redoStack.current.pop()!
    setParams(next)
    scheduleLutUpdate(next)
    if (currentNodeIdRef.current) imageParamsMap.current.set(currentNodeIdRef.current, next)
  }, [scheduleLutUpdate])

  // WebGL context 重建後，重新載入圖片並套用目前 LUT
  const handleContextRestored = useCallback(async () => {
    const imgData = currentImageBytesRef.current
    const preview = previewRef.current
    if (!imgData || !preview) return
    try {
      await preview.loadImage(imgData.bytes, imgData.width, imgData.height)
      if (currentLutRef.current) preview.updateLut(currentLutRef.current)
      if (isSplitRef.current) preview.setSplit(splitX)
    } catch (err) {
      console.error('WebGL context restore：重新載入失敗', err)
    }
  }, [splitX])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && !e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo() }
      else if (mod && e.shiftKey && e.key === 'z') { e.preventDefault(); handleRedo() }
      else if (mod && e.key === 'y') { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  // 計算哪些工具有非預設值（顯示 sidebar 指示點）
  const modifiedTools = useMemo<Set<ToolId>>(() => {
    const set = new Set<ToolId>()
    const tools: ToolId[] = ['hsl', 'colorBalance', 'levels', 'curves']
    for (const t of tools) {
      if (JSON.stringify(params[t]) !== JSON.stringify(DEFAULT_PARAMS[t])) set.add(t)
    }
    return set
  }, [params])

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
          // 切換圖片時清除 undo 歷史（各圖片的 undo 不共用）
          undoStack.current = []
          pendingUndoSnapshot.current = null
          if (undoDebounceTimer.current) {
            clearTimeout(undoDebounceTimer.current)
            undoDebounceTimer.current = null
          }

          clearUndoState()

          // 儲存圖片 bytes 供 WebGL context restore 使用
          currentImageBytesRef.current = { bytes: msg.bytes, width: msg.width, height: msg.height }

          // 記錄目前節點 ID，並取出該圖片之前保存的調整數值（若有）
          const nodeId = msg.nodeId
          currentNodeIdRef.current = nodeId
          const savedParams = imageParamsMap.current.get(nodeId) ?? defaultAdjustmentParams()

          const preview = await waitForPreview()
          await preview.loadImage(msg.bytes, msg.width, msg.height)

          // 先用 identity LUT 讀取原始像素，計算初始直方圖
          const identityLut = lutEngine.compute(defaultAdjustmentParams())
          preview.updateLut(identityLut)
          const { pixels } = preview.readPixels()
          setHistogram(computeHistogramFromPixels(pixels))

          // 套用儲存的（或預設）調整數值
          const savedLut = lutEngine.compute(savedParams)
          currentLutRef.current = savedLut
          preview.updateLut(savedLut)

          // 進入分割模式時，重置分割線到中間
          if (isSplitRef.current) preview.setSplit(splitX)

          // 同步 React 狀態（讓面板顯示正確數值）
          setParams(savedParams)
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
  const resetCurves = () => handleParamsChange(prev => ({ ...prev, curves: defaultCurvesParams() }))

  if (errorMessage) {
    return <ErrorState message={errorMessage} />
  }

  return (
    <div style={{ width: 380, minHeight: 480, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)', color: 'var(--text)' }}>
      <Sidebar active={tool} onChange={setTool} theme={theme} onThemeToggle={toggleTheme} modifiedTools={modifiedTools} />

      {/* Preview 永遠掛載（使 WebGLRenderer 在訊息到達前就初始化完成）
          圖片未載入時隱藏，顯示載入提示 */}
      <div style={{ display: isLoaded ? 'block' : 'none' }}>
        <Preview
          ref={previewRef}
          width={imageSize.width || 1}
          height={imageSize.height || 1}
          isSplit={isSplit}
          splitX={splitX}
          onSplitDrag={(x) => setSplitX(x)}
          onContextRestored={handleContextRestored}
        />
      </div>

      {!isLoaded && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
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
          {tool === 'curves' && (
            <Curves
              params={params.curves}
              histogram={histogram}
              onChange={(curves) => handleParamsChange(prev => ({ ...prev, curves }))}
              onReset={resetCurves}
            />
          )}
        </>
      )}

      {/* 底部按鈕列 */}
      {isLoaded && (
        <div style={{
          display: 'flex', gap: 8, padding: 12,
          borderTop: '1px solid var(--border)', marginTop: 'auto',
          background: 'var(--app-bg)',
        }}>
          {/* 全部重設 */}
          <button
            onClick={() => handleParamsChange(() => defaultAdjustmentParams())}
            style={{
              flex: 1, padding: '6px 0',
              border: '1px solid var(--btn-border)',
              borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: 'var(--btn-bg)', color: 'var(--text-dim)',
            }}
          >
            全部重設
          </button>

          {/* 分割預覽 toggle */}
          <button
            onClick={() => setIsSplit(v => !v)}
            title="切換原圖/調整後分割對比"
            style={{
              flex: 1, padding: '6px 4px',
              border: '1px solid',
              borderColor: isSplit ? '#18A0FB' : 'var(--btn-border)',
              borderRadius: 6, fontSize: 11, cursor: 'pointer',
              background: isSplit ? '#18A0FB' : 'var(--btn-bg)',
              color: isSplit ? '#fff' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
            對比
          </button>

          {/* 套用 */}
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
