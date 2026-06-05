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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
        <input
          type="number"
          aria-label={label}
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
      {/* 原生 range input，gradient 透過 CSS variable 傳入 track — thumb 由瀏覽器原生處理，即時無延遲 */}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleInput}
        style={{ '--track-gradient': gradient } as React.CSSProperties}
      />
    </div>
  )
}
