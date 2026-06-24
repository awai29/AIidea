import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  height: 36, padding: '0 16px', borderRadius: 6,
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
  transition: 'background 0.15s',
};

export default function ResultPanel({ resultBlob, onAdopt, onRegenerate, isEditing }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!resultBlob) { setUrl(null); return; }
    const u = URL.createObjectURL(resultBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [resultBlob]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#fafafa', overflow: 'hidden', position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        height: 44, padding: '0 16px',
        borderBottom: '1px solid #e4e4e7',
        display: 'flex', alignItems: 'center',
        background: '#fff', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          修改結果
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

        {/* Loading overlay */}
        {isEditing && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(250,250,250,0.9)', zIndex: 10, gap: 12,
          }}>
            <div style={{
              width: 28, height: 28,
              border: '2.5px solid #e4e4e7',
              borderTopColor: '#18181b',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#71717a', fontWeight: 500 }}>AI 處理中…</span>
          </div>
        )}

        {/* Placeholder */}
        {!url && !isEditing && (
          <div style={{ textAlign: 'center', color: '#a1a1aa' }}>
            <Sparkles size={28} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>修改結果會顯示在這裡</div>
          </div>
        )}

        {/* Result image */}
        {url && (
          <img
            src={url} alt="AI result"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
      </div>

      {/* Action bar */}
      {url && !isEditing && (
        <div style={{
          height: 56, padding: '0 16px',
          borderTop: '1px solid #e4e4e7',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          background: '#fff', flexShrink: 0,
        }}>
          <button
            onClick={onRegenerate}
            style={{ ...btnBase, background: '#f4f4f5', color: '#18181b' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e4e4e7'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f4f4f5'}
          >
            重新生成
          </button>
          <button
            onClick={onAdopt}
            style={{ ...btnBase, background: '#18181b', color: '#fafafa' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#27272a'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#18181b'}
          >
            採用這張
          </button>
        </div>
      )}
    </div>
  );
}
