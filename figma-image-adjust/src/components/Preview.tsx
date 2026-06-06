import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { WebGLRenderer } from '../lut/webgl'

export interface PreviewHandle {
  loadImage: (bytes: Uint8Array, width: number, height: number) => Promise<void>;
  updateLut: (lutData: Uint8Array) => void;
  readPixels: () => { pixels: Uint8Array; width: number; height: number };
  readViewportPixels: () => Uint8Array;
  setSplit: (x: number) => void;
}

interface PreviewProps {
  width: number;
  height: number;
  isSplit: boolean;
  splitX: number;            // 0-1，分割線位置
  onSplitDrag: (x: number) => void;
  onContextRestored?: () => void;  // WebGL context 重建後回呼（重新載入圖片）
}

export const Preview = forwardRef<PreviewHandle, PreviewProps>(
  function Preview({ width, height, isSplit, splitX, onSplitDrag, onContextRestored }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<WebGLRenderer | null>(null)
    // 永遠指向最新回呼，讓 useLayoutEffect 閉包不需要 deps
    const onContextRestoredRef = useRef(onContextRestored)
    onContextRestoredRef.current = onContextRestored

    // 顯示尺寸：最大寬 336px、最大高 240px，等比例縮放
    const MAX_W = 336
    const MAX_H = 240
    const aspectRatio = width > 0 && height > 0 ? height / width : 1
    let displayWidth = MAX_W
    let displayHeight = Math.round(displayWidth * aspectRatio)
    if (displayHeight > MAX_H) {
      displayHeight = MAX_H
      displayWidth = Math.round(displayHeight / aspectRatio)
    }

    useLayoutEffect(() => {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      try {
        rendererRef.current = new WebGLRenderer(canvas)
      } catch (e) {
        console.error('WebGL 初始化失敗：', e)
      }

      // GPU context 遺失時阻止頁面報錯，並在恢復後重建 renderer
      const handleLost = (e: Event) => {
        e.preventDefault()
        rendererRef.current?.destroy()
        rendererRef.current = null
      }
      const handleRestored = () => {
        try {
          rendererRef.current = new WebGLRenderer(canvas)
          onContextRestoredRef.current?.()
        } catch (err) {
          console.error('WebGL context restore 失敗：', err)
        }
      }
      canvas.addEventListener('webglcontextlost', handleLost)
      canvas.addEventListener('webglcontextrestored', handleRestored)

      return () => {
        canvas.removeEventListener('webglcontextlost', handleLost)
        canvas.removeEventListener('webglcontextrestored', handleRestored)
        rendererRef.current?.destroy()
        rendererRef.current = null
      }
    }, [])

    useImperativeHandle(ref, () => ({
      loadImage: async (bytes, w, h) => {
        if (!rendererRef.current) throw new Error('WebGL 未初始化')
        await rendererRef.current.loadImage(bytes, w, h)
      },
      updateLut: (lutData) => {
        rendererRef.current?.updateLut(lutData)
      },
      readPixels: () => {
        if (!rendererRef.current) throw new Error('WebGL 未初始化')
        return rendererRef.current.readPixels()
      },
      readViewportPixels: () => {
        if (!rendererRef.current) throw new Error('WebGL 未初始化')
        return rendererRef.current.readViewportPixels()
      },
      setSplit: (x) => {
        rendererRef.current?.setSplit(x)
      },
    }), [])

    // 拖曳分割線
    const handleSplitMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return
      const onMove = (me: MouseEvent) => {
        const rect = container.getBoundingClientRect()
        const x = Math.max(0.02, Math.min(0.98, (me.clientX - rect.left) / rect.width))
        onSplitDrag(x)
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    return (
      <div
        ref={containerRef}
        style={{
          padding: '12px 12px 0',
          display: 'flex',
          justifyContent: 'center',
          // 棋盤格背景：透明區域可見
          background: '#e0e0e0',
          backgroundImage: [
            'linear-gradient(45deg, #bbb 25%, transparent 25%, transparent 75%, #bbb 75%)',
            'linear-gradient(45deg, #bbb 25%, transparent 25%, transparent 75%, #bbb 75%)',
          ].join(', '),
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px',
        }}
      >
        {/* 相對定位容器，讓分割線疊在 canvas 上 */}
        <div style={{ position: 'relative', width: displayWidth, height: displayHeight }}>
          <canvas
            ref={canvasRef}
            width={displayWidth}
            height={displayHeight}
            style={{ display: 'block', borderRadius: 4, width: displayWidth, height: displayHeight }}
          />

          {/* 分割線 UI */}
          {isSplit && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 4, overflow: 'hidden' }}>
              {/* 原圖 / 調整後 標籤 */}
              <span style={{
                position: 'absolute', top: 6, left: 8, fontSize: 10, color: '#fff',
                background: 'rgba(0,0,0,0.55)', padding: '1px 6px', borderRadius: 3,
              }}>
                原圖
              </span>
              <span style={{
                position: 'absolute', top: 6, right: 8, fontSize: 10, color: '#fff',
                background: 'rgba(0,0,0,0.55)', padding: '1px 6px', borderRadius: 3,
              }}>
                調整後
              </span>

              {/* 分割線本體（可拖曳） */}
              <div
                onMouseDown={handleSplitMouseDown}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${splitX * 100}%`,
                  width: 2,
                  background: '#fff',
                  boxShadow: '0 0 4px rgba(0,0,0,0.4)',
                  transform: 'translateX(-50%)',
                  cursor: 'ew-resize',
                  pointerEvents: 'all',
                }}
              >
                {/* 拖曳手把 */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="#666">
                    <polygon points="0,4 3.5,0.5 3.5,7.5" />
                    <polygon points="10,4 6.5,0.5 6.5,7.5" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)
