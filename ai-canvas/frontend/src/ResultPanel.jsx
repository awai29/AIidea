import { useState, useEffect } from 'react';

const btn = (bg) => ({
  padding: '8px 20px', background: bg, color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
});

/**
 * 右側結果面板
 *
 * Props:
 *   resultBlob   Blob  — AI 生成的結果圖片
 *   onAdopt      fn    — 使用者點「採用這張」
 *   onRegenerate fn    — 使用者點「重新生成」
 *   isEditing    bool  — 是否正在呼叫 AI（顯示 loading）
 */
export default function ResultPanel({ resultBlob, onAdopt, onRegenerate, isEditing }) {
  const [url, setUrl] = useState(null);

  // resultBlob 更換時，建立 object URL（並在清除時釋放記憶體）
  useEffect(() => {
    if (!resultBlob) { setUrl(null); return; }
    const u = URL.createObjectURL(resultBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [resultBlob]);

  return (
    <div style={{
      position: 'relative', flex: 1, background: '#efefef',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Loading 覆蓋層 */}
      {isEditing && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(255,255,255,0.85)', zIndex: 10,
          fontSize: 15, color: '#555', flexDirection: 'column', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #ccc',
            borderTopColor: '#2563eb', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          AI 處理中…
        </div>
      )}

      {/* 尚無結果的提示 */}
      {!url && !isEditing && (
        <div style={{ color: '#bbb', fontSize: 14, textAlign: 'center' }}>
          修改結果會顯示在這裡
        </div>
      )}

      {/* 結果圖片 */}
      {url && (
        <img
          src={url} alt="AI result"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
        />
      )}

      {/* 操作按鈕 */}
      {url && !isEditing && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 10,
        }}>
          <button onClick={onAdopt} style={btn('#16a34a')}>採用這張</button>
          <button onClick={onRegenerate} style={btn('#6b7280')}>重新生成</button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
