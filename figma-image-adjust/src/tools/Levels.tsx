import { useEffect, useRef } from 'react'
import type { LevelsParams, LevelsChannelParams, HistogramData } from '../types'

interface LevelsProps {
  params: LevelsParams;
  histogram: HistogramData | null;
  onChange: (params: LevelsParams) => void;
  onReset: () => void;
}

// ── 小數字輸入框 ─────────────────────────────────────────────────────────────
function NumInput({
  value, min, max, step = 1, width = 46, onChange,
}: {
  value: number; min: number; max: number; step?: number; width?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number" value={value} min={min} max={max} step={step}
      onChange={e => {
        const v = Number(e.target.value)
        if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)))
      }}
      style={{
        width, padding: '2px 3px',
        borderRadius: 3, fontSize: 11, textAlign: 'center',
      }}
    />
  )
}

// ── SVG 三角形拖桿 ───────────────────────────────────────────────────────────
// type: 'black' | 'gray' | 'white'
// pct: 0-100（相對於軌道寬度的百分比位置）
function TriHandle({
  pct, type, onMouseDown,
}: {
  pct: number; type: 'black' | 'gray' | 'white';
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const fillMap = { black: '#1a1a1a', gray: '#888888', white: '#e8e8e8' }
  const strokeMap = { black: '#999999', gray: '#444444', white: '#888888' }

  return (
    <svg
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: `${pct}%`,
        top: 0,
        transform: 'translateX(-50%)',
        width: 13, height: 11,
        overflow: 'visible',
        cursor: 'ew-resize',
        userSelect: 'none',
      }}
    >
      {/* 上方尖端、下方底部的上三角形 ▲ */}
      <polygon
        points="6.5,0 13,11 0,11"
        fill={fillMap[type]}
        stroke={strokeMap[type]}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── 直方圖 Canvas（R/G/B 彩色疊加）─────────────────────────────────────────
function HistogramCanvas({ data }: { data: HistogramData | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    if (!data) return

    const { r, g, b } = data
    const max = Math.max(...r, ...g, ...b, 1)
    const bw = Math.max(1, Math.ceil(w / 256))

    const drawChannel = (channel: number[], color: string) => {
      ctx.fillStyle = color
      for (let i = 0; i < 256; i++) {
        const bh = (channel[i] / max) * h
        const bx = Math.round(i * w / 256)
        ctx.fillRect(bx, h - bh, bw, bh)
      }
    }

    // 藍色先畫（最底層），再疊綠、紅
    drawChannel(b, 'rgba(80, 140, 255, 0.65)')
    drawChannel(g, 'rgba(80, 210, 100, 0.65)')
    drawChannel(r, 'rgba(255, 90,  80,  0.65)')
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={356}
      height={70}
      style={{
        display: 'block', width: '100%', height: 70,
        background: '#1e1e1e', borderRadius: '3px 3px 0 0',
      }}
    />
  )
}

// ── 輸入色階區段（直方圖 + 漸層 + 3 個拖桿） ─────────────────────────────────
function InputLevels({
  channelParams, histogram, onChangeKey,
}: {
  channelParams: LevelsChannelParams;
  histogram: HistogramData | null;
  onChangeKey: (key: keyof LevelsChannelParams, value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  // 用 ref 存最新值，讓全域 mousemove 讀到最新狀態
  const valRef = useRef(channelParams)
  valRef.current = channelParams

  const { inBlack, gamma, inWhite } = channelParams

  // gamma 桿的視覺位置：對應輸出 50% 的輸入值
  // 公式：mid = inBlack + (inWhite - inBlack) * 0.5^gamma
  const gammaMid = inBlack + (inWhite - inBlack) * Math.pow(0.5, gamma)
  const blackPct = (inBlack / 255) * 100
  const gammaPct = (gammaMid / 255) * 100
  const whitePct = (inWhite / 255) * 100

  const makeDragger = (handle: 'black' | 'gamma' | 'white') => (e: React.MouseEvent) => {
    e.preventDefault()
    const onMove = (me: MouseEvent) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      const raw = frac * 255
      const { inBlack: ib, inWhite: iw } = valRef.current

      if (handle === 'black') {
        onChangeKey('inBlack', Math.max(0, Math.min(Math.round(raw), iw - 2)))
      } else if (handle === 'white') {
        onChangeKey('inWhite', Math.max(ib + 2, Math.min(255, Math.round(raw))))
      } else {
        // gamma：由桿的位置反算 gamma 值
        // p = (mid - inBlack) / (inWhite - inBlack)
        // gamma = log(p) / log(0.5)
        const range = iw - ib
        if (range < 2) return
        const p = Math.max(0.01, Math.min(0.99, (raw - ib) / range))
        const g = parseFloat((Math.log(p) / Math.log(0.5)).toFixed(2))
        onChangeKey('gamma', Math.max(0.10, Math.min(9.99, g)))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
      <HistogramCanvas data={histogram} />

      {/* 漸層軌道（黑 → 白）+ 三角形拖桿 */}
      <div ref={trackRef} style={{ userSelect: 'none' }}>
        <div style={{
          height: 10,
          background: 'linear-gradient(to right, #000, #fff)',
        }} />
        {/* 拖桿 track：overflow visible 讓 SVG 三角可以超出 */}
        <div style={{ position: 'relative', height: 14, overflow: 'visible' }}>
          <TriHandle pct={blackPct} type="black" onMouseDown={makeDragger('black')} />
          <TriHandle pct={gammaPct} type="gray" onMouseDown={makeDragger('gamma')} />
          <TriHandle pct={whitePct} type="white" onMouseDown={makeDragger('white')} />
        </div>
      </div>

      {/* 三個數字輸入 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <NumInput value={inBlack} min={0} max={253} onChange={v => onChangeKey('inBlack', v)} />
        <NumInput value={gamma} min={0.10} max={9.99} step={0.01} width={52} onChange={v => onChangeKey('gamma', v)} />
        <NumInput value={inWhite} min={2} max={255} onChange={v => onChangeKey('inWhite', v)} />
      </div>
    </>
  )
}

// ── 輸出色階區段（漸層 + 2 個拖桿） ──────────────────────────────────────────
function OutputLevels({
  channelParams, onChangeKey,
}: {
  channelParams: LevelsChannelParams;
  onChangeKey: (key: keyof LevelsChannelParams, value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const valRef = useRef(channelParams)
  valRef.current = channelParams

  const { outBlack, outWhite } = channelParams
  const blackPct = (outBlack / 255) * 100
  const whitePct = (outWhite / 255) * 100

  const makeDragger = (handle: 'outBlack' | 'outWhite') => (e: React.MouseEvent) => {
    e.preventDefault()
    const onMove = (me: MouseEvent) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      const raw = Math.round(frac * 255)
      const { outBlack: ob, outWhite: ow } = valRef.current
      if (handle === 'outBlack') {
        onChangeKey('outBlack', Math.max(0, Math.min(raw, ow - 2)))
      } else {
        onChangeKey('outWhite', Math.max(ob + 2, Math.min(255, raw)))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
      <div ref={trackRef} style={{ userSelect: 'none' }}>
        <div style={{
          height: 10,
          background: 'linear-gradient(to right, #000, #fff)',
          borderRadius: '2px 2px 0 0',
        }} />
        <div style={{ position: 'relative', height: 14, overflow: 'visible' }}>
          <TriHandle pct={blackPct} type="black" onMouseDown={makeDragger('outBlack')} />
          <TriHandle pct={whitePct} type="white" onMouseDown={makeDragger('outWhite')} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <NumInput value={outBlack} min={0} max={253} onChange={v => onChangeKey('outBlack', v)} />
        <NumInput value={outWhite} min={2} max={255} onChange={v => onChangeKey('outWhite', v)} />
      </div>
    </>
  )
}

// ── 主元件 ────────────────────────────────────────────────────────────────────
const CHANNEL_OPTIONS: { value: LevelsParams['channel']; label: string }[] = [
  { value: 'rgb', label: 'RGB' },
  { value: 'r', label: '紅' },
  { value: 'g', label: '綠' },
  { value: 'b', label: '藍' },
]

export function Levels({ params, histogram, onChange, onReset }: LevelsProps) {
  const ch = params.channel
  const channelParams: LevelsChannelParams = params[ch]

  const onChangeKey = (key: keyof LevelsChannelParams, value: number) => {
    onChange({ ...params, [ch]: { ...channelParams, [key]: value } })
  }

  return (
    <div style={{ padding: 12 }}>
      {/* 色版選擇 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {CHANNEL_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...params, channel: value })}
            style={{
              flex: 1, padding: '3px 0', border: '1px solid',
              borderColor: ch === value ? '#18A0FB' : 'var(--btn-border)',
              borderRadius: 4, fontSize: 11, cursor: 'pointer',
              background: ch === value ? '#18A0FB' : 'var(--btn-bg)',
              color: ch === value ? '#fff' : 'var(--text-dim)',
              fontWeight: ch === value ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 輸入色階 */}
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>輸入色階</div>
      <InputLevels channelParams={channelParams} histogram={histogram} onChangeKey={onChangeKey} />

      {/* 輸出色階 */}
      <div style={{ fontSize: 10, color: 'var(--text-faint)', margin: '12px 0 4px' }}>輸出色階</div>
      <OutputLevels channelParams={channelParams} onChangeKey={onChangeKey} />

      <button
        onClick={onReset}
        style={{
          marginTop: 10, padding: '4px 12px', border: '1px solid var(--btn-border)',
          borderRadius: 4, fontSize: 11, cursor: 'pointer',
          background: 'var(--btn-bg)', color: 'var(--text-dim)',
        }}
      >
        重設
      </button>
    </div>
  )
}
