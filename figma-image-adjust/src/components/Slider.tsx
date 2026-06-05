import type { ChangeEvent } from 'react'

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  gradient: string; // CSS linear-gradient 字串
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 1, gradient, onChange }: SliderProps) {
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }
  const handleNumberInput = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)))
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleNumberInput}
          style={{
            width: 48, padding: '2px 4px', border: '1px solid #d4d4d4',
            borderRadius: 3, fontSize: 11, textAlign: 'right',
          }}
        />
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: gradient }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
        {/* 拖柄 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${((value - min) / (max - min)) * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          border: '1px solid #ccc',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}
