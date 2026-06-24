import { Upload, Brush, EyeOff, Eye, Trash2 } from 'lucide-react';

/* ── Button helpers ─────────────────────────────────────────────── */
const iconBtn = (active = false) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 5, height: 30, padding: '0 10px',
  background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
  color: active ? '#8b5cf6' : '#a1a1aa',
  border: `1px solid ${active ? 'rgba(139,92,246,0.4)' : 'transparent'}`,
  borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
});

const divider = {
  width: 1, height: 18, background: '#2a2a2a', flexShrink: 0, margin: '0 2px',
};

export default function Toolbar({
  brushRadius, onBrushChange,
  onClearMask, onToggleMask, showMask,
  onUpload, disabled,
}) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '0 16px', height: 48,
      borderBottom: '1px solid #1f1f1f',
      background: '#0f0f0f', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
        }}>
          AI
        </div>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#f5f5f5', letterSpacing: '-0.01em' }}>
          Canvas
        </span>
      </div>

      <div style={divider} />

      {/* 上傳 */}
      <label style={{
        ...iconBtn(false),
        color: '#f5f5f5', background: '#1c1c1c',
        border: '1px solid #2a2a2a',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}>
        <Upload size={13} />
        上傳圖片
        <input
          type="file" accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange} style={{ display: 'none' }}
          disabled={disabled}
        />
      </label>

      <div style={divider} />

      {/* 筆刷大小 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Brush size={13} color="#a1a1aa" />
        <input
          type="range" min="5" max="80" value={brushRadius}
          onChange={(e) => onBrushChange(Number(e.target.value))}
          disabled={disabled}
          style={{
            width: 80, accentColor: '#8b5cf6', cursor: 'pointer',
            height: 3, background: '#2a2a2a',
          }}
        />
        <span style={{ fontSize: 11, color: '#52525b', minWidth: 28 }}>{brushRadius}px</span>
      </div>

      <div style={divider} />

      {/* 遮罩控制 */}
      <button
        onClick={onClearMask}
        disabled={disabled}
        style={iconBtn(false)}
        title="清除遮罩"
      >
        <Trash2 size={12} />
        清除
      </button>

      <button
        onClick={onToggleMask}
        disabled={disabled}
        style={iconBtn(showMask)}
        title={showMask ? '隱藏遮罩' : '顯示遮罩'}
      >
        {showMask ? <Eye size={12} /> : <EyeOff size={12} />}
        {showMask ? '遮罩' : '隱藏'}
      </button>

      {/* 彈性空間 */}
      <div style={{ flex: 1 }} />

      {/* 狀態指示 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: '#52525b',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: disabled ? '#8b5cf6' : '#22c55e',
          boxShadow: disabled ? '0 0 6px #8b5cf6' : '0 0 6px #22c55e',
        }} />
        {disabled ? '處理中' : '就緒'}
      </div>
    </div>
  );
}
