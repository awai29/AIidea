import { useEffect, useRef } from 'react'
import type { LevelsParams, LevelsChannelParams } from '../types'

interface LevelsProps {
  params: LevelsParams;
  histogram: number[] | null; // 256 個亮度 bucket 的計數
  onChange: (params: LevelsParams) => void;
  onReset: () => void;
}

const CHANNEL_OPTIONS: { value: LevelsParams['channel']; label: string }[] = [
  { value: 'rgb', label: 'RGB' },
  { value: 'r', label: '紅' },
  { value: 'g', label: '綠' },
  { value: 'b', label: '藍' },
]

function HistogramCanvas({ data }: { data: number[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const max = Math.max(...data, 1)
    ctx.fillStyle = '#aaa'
    for (let i = 0; i < 256; i++) {
      const barH = (data[i] / max) * h
      ctx.fillRect(Math.round(i * w / 256), h - barH, Math.max(1, w / 256), barH)
    }
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={312}
      height={60}
      style={{ width: '100%', height: 60, background: '#f5f5f5', borderRadius: 3 }}
    />
  )
}

function LevelSliderRow({
  label, value, min, max, step = 1, onChange
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: '#555', width: 80, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v))) }}
        style={{ width: 52, padding: '2px 4px', border: '1px solid #d4d4d4', borderRadius: 3, fontSize: 11 }}
      />
    </div>
  )
}

export function Levels({ params, histogram, onChange, onReset }: LevelsProps) {
  const ch = params.channel
  const channelParams: LevelsChannelParams = ch === 'rgb' ? params.rgb
    : ch === 'r' ? params.r
    : ch === 'g' ? params.g
    : params.b

  const updateChannel = (key: keyof LevelsChannelParams) => (value: number) => {
    const updated = { ...channelParams, [key]: value }
    onChange({ ...params, [ch === 'rgb' ? 'rgb' : ch]: updated })
  }

  return (
    <div style={{ padding: 12 }}>
      {/* 色版選擇 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {CHANNEL_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...params, channel: value })}
            style={{
              flex: 1, padding: '3px 0', border: '1px solid',
              borderColor: ch === value ? '#18A0FB' : '#d4d4d4',
              borderRadius: 4, fontSize: 11, cursor: 'pointer',
              background: ch === value ? '#18A0FB' : '#fff',
              color: ch === value ? '#fff' : '#555',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 直方圖 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>輸入色階</div>
        <HistogramCanvas data={histogram} />
      </div>

      <LevelSliderRow label="黑點" value={channelParams.inBlack} min={0} max={253} onChange={updateChannel('inBlack')} />
      <LevelSliderRow label="中間調 γ" value={channelParams.gamma} min={0.1} max={9.99} step={0.01} onChange={updateChannel('gamma')} />
      <LevelSliderRow label="白點" value={channelParams.inWhite} min={2} max={255} onChange={updateChannel('inWhite')} />

      <div style={{ fontSize: 11, color: '#888', margin: '10px 0 4px' }}>輸出色階</div>
      <LevelSliderRow label="黑點" value={channelParams.outBlack} min={0} max={253} onChange={updateChannel('outBlack')} />
      <LevelSliderRow label="白點" value={channelParams.outWhite} min={2} max={255} onChange={updateChannel('outWhite')} />

      <button
        onClick={onReset}
        style={{
          marginTop: 4, padding: '4px 12px', border: '1px solid #d4d4d4',
          borderRadius: 4, fontSize: 11, cursor: 'pointer', background: '#fff',
        }}
      >
        重設
      </button>
    </div>
  )
}
