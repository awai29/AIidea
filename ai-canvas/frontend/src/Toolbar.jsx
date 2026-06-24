import { useState } from 'react';

const btn = (bg = '#444') => ({
  padding: '6px 14px', background: bg, color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
});

/**
 * 頂部工具列
 *
 * Props:
 *   brushRadius    number   — 目前筆刷半徑
 *   onBrushChange  fn       — 筆刷半徑改變
 *   onClearMask    fn       — 清除遮罩
 *   onToggleMask   fn       — 切換遮罩顯示
 *   showMask       bool     — 目前是否顯示遮罩
 *   onUpload       fn(File) — 上傳圖片
 *   onGenerate     fn(str)  — 文字生圖
 *   disabled       bool     — 處理中時禁用所有控件
 */
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
    e.target.value = ''; // 清除，允許重複上傳同一檔案
  };

  const handleGenerate = () => {
    if (!genPrompt.trim() || disabled) return;
    onGenerate(genPrompt);
    setGenPrompt('');
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', borderBottom: '1px solid #ddd', background: '#f9f9f9',
      flexWrap: 'wrap',
    }}>
      {/* 上傳圖片 */}
      <label style={{ ...btn('#1a1a1a'), cursor: disabled ? 'not-allowed' : 'pointer' }}>
        上傳圖片
        <input
          type="file" accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange} style={{ display: 'none' }}
          disabled={disabled}
        />
      </label>

      <div style={{ width: 1, height: 24, background: '#ddd' }} />

      {/* 筆刷大小 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#555' }}>筆刷</span>
        <input
          type="range" min="5" max="80" value={brushRadius}
          onChange={(e) => onBrushChange(Number(e.target.value))}
          disabled={disabled} style={{ width: 80 }}
        />
        <span style={{ fontSize: 12, color: '#888', minWidth: 32 }}>{brushRadius}px</span>
      </div>

      <button onClick={onClearMask} disabled={disabled} style={btn('#888')}>清除遮罩</button>
      <button onClick={onToggleMask} disabled={disabled} style={btn(showMask ? '#2563eb' : '#888')}>
        {showMask ? '隱藏遮罩' : '顯示遮罩'}
      </button>

      {/* 文字生圖 */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <input
          value={genPrompt}
          onChange={(e) => setGenPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
          placeholder="文字生圖…"
          disabled={disabled}
          style={{
            padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc',
            fontSize: 13, width: 220,
          }}
        />
        <button
          onClick={handleGenerate}
          disabled={disabled || !genPrompt.trim()}
          style={btn('#7c3aed')}
        >
          生成圖片
        </button>
      </div>
    </div>
  );
}
