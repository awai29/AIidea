import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { WebGLRenderer } from '../lut/webgl'

export interface PreviewHandle {
  loadImage: (bytes: Uint8Array, width: number, height: number) => Promise<void>;
  updateLut: (lutData: Uint8Array) => void;
  readPixels: () => { pixels: Uint8Array; width: number; height: number };
}

interface PreviewProps {
  width: number;   // 圖片原始寬度（用於計算顯示比例）
  height: number;  // 圖片原始高度
}

export const Preview = forwardRef<PreviewHandle, PreviewProps>(function Preview({ width, height }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)

  // 顯示尺寸：寬度固定 336px（360 - 24px padding），高度按比例
  const displayWidth = 336
  const displayHeight = width > 0 ? Math.round(displayWidth * (height / width)) : 200

  useLayoutEffect(() => {
    if (!canvasRef.current) return
    try {
      rendererRef.current = new WebGLRenderer(canvasRef.current)
    } catch (e) {
      console.error('WebGL 初始化失敗：', e)
    }
    return () => {
      rendererRef.current?.destroy()
      rendererRef.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    loadImage: async (bytes: Uint8Array, w: number, h: number) => {
      if (!rendererRef.current) throw new Error('WebGL 未初始化')
      await rendererRef.current.loadImage(bytes, w, h)
    },
    updateLut: (lutData: Uint8Array) => {
      rendererRef.current?.updateLut(lutData)
    },
    readPixels: () => {
      if (!rendererRef.current) throw new Error('WebGL 未初始化')
      return rendererRef.current.readPixels()
    },
  }), [])

  return (
    <div style={{ padding: '12px 12px 0', background: '#f0f0f0', display: 'flex', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={displayWidth}
        height={displayHeight}
        style={{ width: displayWidth, height: displayHeight, display: 'block', borderRadius: 4 }}
      />
    </div>
  )
})
