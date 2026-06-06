import { useRef, useState, type ChangeEvent } from 'react'

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;  // 雙擊歸零用
  gradient: string; // CSS linear-gradient 字串
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 1, defaultValue = 0, gradient, onChange }: SliderProps) {
  // range 拖曳時顯示 tooltip
  const [isDragging, setIsDragging] = useState(false)
  // number input 拖曳 scrub 的狀態
  const dragStateRef = useRef<{ startX: number; startVal: number } | null>(null)

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }

  const handleNumberInput = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)))
  }

  // 拖曳數字輸入框改值（像 Figma 一樣左右拖動）
  const handleNumberMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    dragStateRef.current = { startX: e.clientX, startVal: value }
    let isDrag = false

    const onMove = (me: MouseEvent) => {
      if (!dragStateRef.current) return
      const dx = me.clientX - dragStateRef.current.startX
      if (!isDrag) {
        if (Math.abs(dx) < 4) return
        isDrag = true
        // 進入拖曳模式，blur 輸入框避免觸發 onChange 衝突
        ;(document.activeElement as HTMLElement)?.blur()
      }
      me.preventDefault()
      const speed = (max - min) / 200
      const raw = dragStateRef.current.startVal + dx * speed
      const snapped = Math.round(raw / step) * step
      // 四捨五入到 step 的精度（避免浮點誤差）
      const decimals = step < 1 ? Math.round(-Math.log10(step)) : 0
      const clamped = Math.max(min, Math.min(max, parseFloat(snapped.toFixed(decimals))))
      onChange(clamped)
    }

    const onUp = () => {
      dragStateRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // 雙擊任意輸入歸零
  const handleDoubleClick = () => onChange(defaultValue)

  // range input 開始拖曳時顯示 tooltip
  const handleRangeMouseDown = () => {
    setIsDragging(true)
    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mouseup', onUp)
  }

  // tooltip 位置（0-100%）
  const pct = (value - min) / (max - min) * 100
  // tooltip 顯示的數值文字
  const tooltipText = step < 1 ? value.toFixed(Math.round(-Math.log10(step))) : String(value)

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
        {/* 數字輸入：支援直接輸入 + 左右拖曳改值 */}
        <input
          type="number"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleNumberInput}
          onMouseDown={handleNumberMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{
            width: 48, padding: '2px 4px',
            borderRadius: 3, fontSize: 11, textAlign: 'right',
            cursor: 'ew-resize',
          }}
        />
      </div>

      {/* range input + 浮動 tooltip */}
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          onMouseDown={handleRangeMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{ '--track-gradient': gradient } as React.CSSProperties}
        />
        {isDragging && (
          <div style={{
            position: 'absolute',
            left: `${pct}%`,
            bottom: '100%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.78)',
            color: '#fff',
            borderRadius: 3,
            padding: '2px 6px',
            fontSize: 10,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            marginBottom: 4,
            zIndex: 10,
          }}>
            {tooltipText}
          </div>
        )}
      </div>
    </div>
  )
}
