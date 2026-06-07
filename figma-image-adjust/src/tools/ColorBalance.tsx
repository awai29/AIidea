import { useState } from 'react'
import { Slider } from '../components/Slider'
import type { ColorBalanceParams, ColorBalanceTone } from '../types'

interface ColorBalanceProps {
  params: ColorBalanceParams;
  onChange: (params: ColorBalanceParams) => void;
  onReset: () => void;
}

type ToneKey = 'shadows' | 'midtones' | 'highlights'
const TONE_LABELS: { key: ToneKey; label: string }[] = [
  { key: 'shadows', label: '陰影' },
  { key: 'midtones', label: '中間調' },
  { key: 'highlights', label: '亮部' },
]

export function ColorBalance({ params, onChange, onReset }: ColorBalanceProps) {
  const [activeTone, setActiveTone] = useState<ToneKey>('midtones')

  const updateTone = (key: keyof ColorBalanceTone) => (value: number) => {
    onChange({
      ...params,
      [activeTone]: { ...params[activeTone], [key]: value },
    })
  }

  const tone = params[activeTone]

  return (
    <div style={{ padding: 12 }}>
      {/* 色調切換 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {TONE_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTone(key)}
            style={{
              flex: 1, padding: '4px 0', border: '1px solid',
              borderColor: activeTone === key ? '#18A0FB' : 'var(--btn-border)',
              borderRadius: 4, fontSize: 11, cursor: 'pointer',
              background: activeTone === key ? '#18A0FB' : 'var(--btn-bg)',
              color: activeTone === key ? '#fff' : 'var(--text-dim)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Slider
        label="青色 ↔ 紅色"
        value={tone.cyanRed}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #00ffff, #ff0000)"
        onChange={updateTone('cyanRed')}
      />
      <Slider
        label="洋紅 ↔ 綠色"
        value={tone.magentaGreen}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #ff00ff, #00ff00)"
        onChange={updateTone('magentaGreen')}
      />
      <Slider
        label="黃色 ↔ 藍色"
        value={tone.yellowBlue}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #ffff00, #0000ff)"
        onChange={updateTone('yellowBlue')}
      />

      {/* 保留明度 */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={params.preserveLuminosity}
          onChange={(e) => onChange({ ...params, preserveLuminosity: e.target.checked })}
        />
        保留明度
      </label>

      <button
        onClick={onReset}
        style={{
          padding: '4px 12px', border: '1px solid var(--btn-border)',
          borderRadius: 4, fontSize: 11, cursor: 'pointer',
          background: 'var(--btn-bg)', color: 'var(--text-dim)',
        }}
      >
        重設
      </button>
    </div>
  )
}
