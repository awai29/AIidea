import { Slider } from '../components/Slider'
import type { HslParams, HslChannel, HslChannelAdjust } from '../types'

interface HueSaturationProps {
  params: HslParams;
  onChange: (params: HslParams) => void;
  onReset: () => void;
}

// 各色版的中心色相
const CHANNEL_CENTER: Partial<Record<HslChannel, number>> = {
  red: 0, yellow: 60, green: 120, cyan: 180, blue: 240, magenta: 300,
}

const CHANNEL_NAMES: Record<HslChannel, string> = {
  all: '全部', red: '紅色', yellow: '黃色', green: '綠色',
  cyan: '青色', blue: '藍色', magenta: '洋紅',
}

const CHANNELS: HslChannel[] = ['all', 'red', 'yellow', 'green', 'cyan', 'blue', 'magenta']

// 判斷某色版是否已被調整
function isModified(adj: HslChannelAdjust): boolean {
  return adj.hue !== 0 || adj.saturation !== 0 || adj.brightness !== 0
}

// 取得圓圈的 CSS background：
// - all → 彩虹 conic-gradient
// - 未調整 → 純色
// - 已調整 → 對角分割（左上原色 / 右下調整後）
function getCircleBg(ch: HslChannel, adj: HslChannelAdjust): string {
  if (ch === 'all') {
    return [
      'conic-gradient(',
      'hsl(0,100%,50%) 0deg,',
      'hsl(60,100%,50%) 60deg,',
      'hsl(120,100%,50%) 120deg,',
      'hsl(180,100%,50%) 180deg,',
      'hsl(240,100%,50%) 240deg,',
      'hsl(300,100%,50%) 300deg,',
      'hsl(360,100%,50%) 360deg)',
    ].join(' ')
  }

  const c = CHANNEL_CENTER[ch]!
  const origCSS = `hsl(${c}, 100%, 50%)`

  if (!isModified(adj)) return origCSS

  const newH = ((c + adj.hue) % 360 + 360) % 360
  const newS = Math.max(0, Math.min(100, 100 + adj.saturation))
  const newL = Math.max(0, Math.min(100, 50 + adj.brightness))
  const adjCSS = `hsl(${newH}, ${newS}%, ${newL}%)`

  // 對角線分割：左上 = 原始色，右下 = 調整後顏色
  return `linear-gradient(135deg, ${origCSS} 50%, ${adjCSS} 50%)`
}

export function HueSaturation({ params, onChange, onReset }: HueSaturationProps) {
  const ch = params.channel
  const adj: HslChannelAdjust = params[ch]
  const modified = isModified(adj)

  const updateAdj = (key: keyof HslChannelAdjust, value: number) => {
    onChange({ ...params, [ch]: { ...adj, [key]: value } })
  }

  return (
    <div style={{ padding: 12 }}>
      {/* 色系選擇器：圓圈色票 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        {CHANNELS.map(id => {
          const isActive = id === ch
          const circleAdj: HslChannelAdjust = params[id]
          const dotVisible = isModified(circleAdj)
          const bg = getCircleBg(id, circleAdj)

          return (
            <div
              key={id}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
            >
              <div
                title={CHANNEL_NAMES[id]}
                onClick={() => onChange({ ...params, channel: id })}
                style={{
                  width: 26, height: 26,
                  borderRadius: '50%',
                  background: bg,
                  cursor: 'pointer',
                  // 選取中：白色間隔 + 藍色外框
                  boxShadow: isActive
                    ? '0 0 0 2px #fff, 0 0 0 3px #18A0FB'
                    : '0 0 0 1px rgba(0,0,0,0.18)',
                }}
              />
              {/* 已修改指示點（小圓點） */}
              <div
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: dotVisible ? '#999' : 'transparent',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 目前色版名稱 */}
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 8 }}>
        {CHANNEL_NAMES[ch]}{modified ? '　（已調整）' : ''}
      </div>

      {/* 調整滑桿 */}
      <Slider
        label="色相"
        value={adj.hue}
        min={-180}
        max={180}
        gradient="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
        onChange={v => updateAdj('hue', v)}
      />
      <Slider
        label="飽和度"
        value={adj.saturation}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #888, #e55)"
        onChange={v => updateAdj('saturation', v)}
      />
      <Slider
        label="亮度"
        value={adj.brightness}
        min={-100}
        max={100}
        gradient="linear-gradient(to right, #000, #fff)"
        onChange={v => updateAdj('brightness', v)}
      />

      <button
        onClick={onReset}
        style={{
          marginTop: 4, padding: '4px 12px', border: '1px solid var(--btn-border)',
          borderRadius: 4, fontSize: 11, cursor: 'pointer',
          background: 'var(--btn-bg)', color: 'var(--text-dim)',
        }}
      >
        重設
      </button>
    </div>
  )
}
