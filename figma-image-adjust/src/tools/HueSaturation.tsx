import { Slider } from '../components/Slider'
import type { HslParams } from '../types'

interface HueSaturationProps {
  params: HslParams;
  onChange: (params: HslParams) => void;
  onReset: () => void;
}

export function HueSaturation({ params, onChange, onReset }: HueSaturationProps) {
  const update = (key: keyof HslParams) => (value: number) =>
    onChange({ ...params, [key]: value })

  return (
    <div style={{ padding: 12 }}>
      <Slider
        label="色相"
        value={params.hue}
        min={-180}
        max={180}
        gradient="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
        onChange={update('hue')}
      />
      <Slider
        label="飽和度"
        value={params.saturation}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #888, #e55)"
        onChange={update('saturation')}
      />
      <Slider
        label="亮度"
        value={params.brightness}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #000, #fff)"
        onChange={update('brightness')}
      />
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
