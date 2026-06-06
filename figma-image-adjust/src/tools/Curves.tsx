import { useRef, useCallback, useState } from 'react'
import { buildCurveLut } from '../lut/curves'
import type { CurvesParams, CurvePoint, HistogramData } from '../types'

// 曲線編輯器尺寸（px）
const W = 356
const H = 180

type CurveChannel = 'rgb' | 'r' | 'g' | 'b'

// 各色版的曲線顏色與標籤
const CHANNEL_COLOR: Record<CurveChannel, string> = {
  rgb: '#ffffff',
  r: '#ff5555',
  g: '#44bb66',
  b: '#4488ff',
}
const CHANNEL_LABEL: Record<CurveChannel, string> = {
  rgb: 'RGB', r: 'R', g: 'G', b: 'B',
}

// 像素座標 ↔ 曲線值（0-255）互轉（模組層級，不需要 W/H 以外的東西）
function svgToCurve(sx: number, sy: number): CurvePoint {
  return [
    Math.round(Math.max(0, Math.min(255, (sx / W) * 255))),
    Math.round(Math.max(0, Math.min(255, ((H - sy) / H) * 255))),
  ]
}
function curveToSvg(px: number, py: number): [number, number] {
  return [(px / 255) * W, H - (py / 255) * H]
}

interface CurvesProps {
  params: CurvesParams;
  histogram: HistogramData | null;
  onChange: (params: CurvesParams) => void;
  onReset: () => void;
}

export function Curves({ params, histogram, onChange, onReset }: CurvesProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<number | null>(null)
  // 懸停提示（input → output 數值）
  const [hoverPt, setHoverPt] = useState<[number, number] | null>(null)

  // 用 ref 儲存最新的 params / onChange，讓全域事件處理函數永遠讀到最新值
  const paramsRef = useRef(params)
  paramsRef.current = params
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const channel = params.channel
  const points = params[channel].points
  const curveColor = CHANNEL_COLOR[channel]

  // 建立曲線路徑（每 2px 取一點，效能足夠）
  const lut = buildCurveLut(points)
  const pathD = (() => {
    const parts: string[] = []
    for (let x = 0; x <= 255; x += 2) {
      const [sx, sy] = curveToSvg(x, lut[x])
      parts.push(`${x === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`)
    }
    return parts.join(' ')
  })()

  // 通用拖曳核心（給「拖現有控制點」和「新增後立即拖」共用）
  const startDragAt = useCallback((idx: number) => {
    dragRef.current = idx

    const onMove = (me: MouseEvent) => {
      if (dragRef.current === null || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const i = dragRef.current
      const pts = paramsRef.current[paramsRef.current.channel].points

      const [rawX, rawY] = svgToCurve(me.clientX - rect.left, me.clientY - rect.top)

      // 端點只能垂直移動；中間點的 x 被夾在相鄰兩點之間
      const clampedX = (i === 0 || i === pts.length - 1)
        ? pts[i][0]
        : Math.max((pts[i - 1]?.[0] ?? 0) + 1, Math.min((pts[i + 1]?.[0] ?? 255) - 1, rawX))

      const newPts: CurvePoint[] = pts.map((p, j) =>
        j === i ? [clampedX, rawY] : p
      )
      const cur = paramsRef.current
      onChangeRef.current({ ...cur, [cur.channel]: { points: newPts } })
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // 控制點按下：開始拖曳
  const handlePointMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // 防止觸發 SVG 的 mousedown（避免重複新增）
    startDragAt(idx)
  }, [startDragAt])

  // 雙擊控制點：刪除（端點不可刪，最少保留 2 點）
  const handlePointDblClick = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const pts = paramsRef.current[paramsRef.current.channel].points
    if (pts.length <= 2 || idx === 0 || idx === pts.length - 1) return
    const cur = paramsRef.current
    onChangeRef.current({ ...cur, [cur.channel]: { points: pts.filter((_, i) => i !== idx) } })
  }, [])

  // 滑鼠移入 SVG：更新懸停提示
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left
    if (sx < 0 || sx > W) { setHoverPt(null); return }
    const input = Math.round(Math.max(0, Math.min(255, (sx / W) * 255)))
    setHoverPt([input, lut[input]])
  }, [lut])

  // SVG 空白處按下：新增控制點並立即拖曳
  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const [nx, ny] = svgToCurve(e.clientX - rect.left, e.clientY - rect.top)

    const pts = paramsRef.current[paramsRef.current.channel].points

    // 距離現有控制點太近就不新增
    for (const p of pts) {
      if (Math.abs(p[0] - nx) < 8) return
    }

    const newPts: CurvePoint[] = [...pts, [nx, ny]].sort((a, b) => a[0] - b[0])
    const newIdx = newPts.findIndex(p => p[0] === nx && p[1] === ny)

    const cur = paramsRef.current
    onChangeRef.current({ ...cur, [cur.channel]: { points: newPts } })

    // 等 React 更新後（下次 onMove 讀 paramsRef），新點已在陣列裡，直接拖曳
    startDragAt(newIdx)
  }, [startDragAt])

  // 直方圖背景（R/G/B 彩色疊加）
  const histBars = histogram ? (() => {
    const { r, g, b } = histogram
    const maxV = Math.max(...r, ...g, ...b, 1)
    const bw = W / 256
    const makeRects = (channel: number[], color: string, prefix: string) =>
      channel.map((v, i) => {
        const bh = (v / maxV) * H
        return <rect key={`${prefix}${i}`} x={i * bw} y={H - bh} width={bw + 0.5} height={bh} fill={color} />
      })
    return [
      ...makeRects(b, 'rgba(80,140,255,0.4)', 'b'),
      ...makeRects(g, 'rgba(80,210,100,0.4)', 'g'),
      ...makeRects(r, 'rgba(255,90,80,0.4)',  'r'),
    ]
  })() : null

  return (
    <div style={{ padding: 12 }}>
      {/* 色版選擇器 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['rgb', 'r', 'g', 'b'] as CurveChannel[]).map(ch => {
          const isActive = channel === ch
          const activeBg = ch === 'rgb' ? '#333' : CHANNEL_COLOR[ch]
          return (
            <button
              key={ch}
              onClick={() => onChange({ ...params, channel: ch })}
              style={{
                padding: '3px 10px', border: '1px solid',
                borderColor: isActive ? (ch === 'rgb' ? '#666' : CHANNEL_COLOR[ch]) : 'var(--btn-border)',
                borderRadius: 4, fontSize: 11, cursor: 'pointer',
                background: isActive ? activeBg : 'var(--btn-bg)',
                color: isActive ? '#fff' : 'var(--text-dim)',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {CHANNEL_LABEL[ch]}
            </button>
          )
        })}
      </div>

      {/* 曲線畫布 */}
      <svg
        ref={svgRef}
        width={W}
        height={H}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={() => setHoverPt(null)}
        style={{
          display: 'block', cursor: 'crosshair',
          border: '1px solid #2a2a2a', borderRadius: 4,
          background: '#181818', userSelect: 'none',
        }}
      >
        {/* 格線 */}
        {[0.25, 0.5, 0.75].map(t => (
          <g key={t}>
            <line x1={t * W} y1={0} x2={t * W} y2={H} stroke="#282828" strokeWidth={1} />
            <line x1={0} y1={t * H} x2={W} y2={t * H} stroke="#282828" strokeWidth={1} />
          </g>
        ))}

        {/* 直方圖 */}
        {histBars}

        {/* 對角線參考（未調整時的 identity）*/}
        <line x1={0} y1={H} x2={W} y2={0} stroke="#3a3a3a" strokeWidth={0.8} />

        {/* 曲線 */}
        <path d={pathD} fill="none" stroke={curveColor} strokeWidth={1.5} />

        {/* 控制點 */}
        {points.map((p, i) => {
          const [sx, sy] = curveToSvg(p[0], p[1])
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={5}
              fill={curveColor}
              stroke="#181818"
              strokeWidth={1.5}
              style={{ cursor: 'move' }}
              onMouseDown={e => handlePointMouseDown(i, e)}
              onDoubleClick={e => handlePointDblClick(i, e)}
            />
          )
        })}
      </svg>

      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, height: 14 }}>
        {hoverPt
          ? `輸入：${hoverPt[0]}　輸出：${hoverPt[1]}`
          : '點擊曲線新增控制點・雙擊控制點刪除'}
      </div>

      <button
        onClick={onReset}
        style={{
          marginTop: 8, padding: '4px 12px', border: '1px solid var(--btn-border)',
          borderRadius: 4, fontSize: 11, cursor: 'pointer',
          background: 'var(--btn-bg)', color: 'var(--text-dim)',
        }}
      >
        重設
      </button>
    </div>
  )
}
