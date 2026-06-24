import { useState } from 'react';

/* ── shadcn-like button styles ─────────────────────────────────────────── */
const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '0 12px', height: 32, borderRadius: 6,
  fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
  transition: 'background 0.15s, opacity 0.15s',
  cursor: 'pointer',
};
const btnDefault = { ...btnBase, background: '#18181b', color: '#fafafa' };
const btnSecondary = { ...btnBase, background: '#f4f4f5', color: '#18181b' };
const btnOutline = { ...btnBase, background: '#fff', color: '#18181b', border: '1px solid #e4e4e7' };
const btnActive = { ...btnBase, background: '#18181b', color: '#fafafa', border: '1px solid #18181b' };
const btnPurple = { ...btnBase, background: '#7c3aed', color: '#fff' };

const separator = { width: 1, height: 20, background: '#e4e4e7', flexShrink: 0 };

export default function Toolbar({
  brushRadius, onBrushChange,
  onClearMask, onToggleMask, showMask,
  onUpload, onGenerate,
  disabled,
}) {
  const [genPrompt, setGenPrompt] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  const handleGenerate = () => {
    if (!genPrompt.trim() || disabled) return;
    onGenerate(genPrompt);
    setGenPrompt('');
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 16px', height: 52, borderBottom: '1px solid #e4e4e7',
      background: '#fff', flexShrink: 0,
    }}>
      {/* Logo */}
      <span style={{ fontWeight: 600, fontSize: 14, color: '#09090b', marginRight: 4 }}>
        AI Canvas
      </span>

      <div style={separator} />

      {/* 上傳 */}
      <label style={{ ...btnOutline, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
        上傳圖片
        <input
          type="file" accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange} style={{ display: 'none' }}
          disabled={disabled}
        />
      </label>

      <div style={separator} />

      {/* 筆刷 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#71717a', fontWeight: 500 }}>筆刷</span>
        <input
          type="range" min="5" max="80" value={brushRadius}
          onChange={(e) => onBrushChange(Number(e.target.value))}
          disabled={disabled}
          style={{ width: 72, accentColor: '#18181b', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 12, color: '#71717a', minWidth: 30, tabularNums: true }}>
          {brushRadius}px
        </span>
      </div>

      <div style={separator} />

      {/* 遮罩控制 */}
      <button onClick={onClearMask} disabled={disabled} style={btnSecondary}>
        清除遮罩
      </button>
      <button
        onClick={onToggleMask}
        disabled={disabled}
        style={showMask ? btnActive : btnOutline}
      >
        {showMask ? '隱藏遮罩' : '顯示遮罩'}
      </button>

      {/* 彈性空間 */}
      <div style={{ flex: 1 }} />

      {/* 文字生圖 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          value={genPrompt}
          onChange={(e) => setGenPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
          placeholder="描述想生成的圖片…"
          disabled={disabled}
          style={{
            height: 32, padding: '0 10px',
            border: '1px solid #e4e4e7', borderRadius: 6,
            fontSize: 13, color: '#09090b', background: '#fff',
            width: 240,
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#18181b'; e.target.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.08)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#e4e4e7'; e.target.style.boxShadow = 'none'; }}
        />
        <button
          onClick={handleGenerate}
          disabled={disabled || !genPrompt.trim()}
          style={btnPurple}
        >
          生成圖片
        </button>
      </div>
    </div>
  );
}
