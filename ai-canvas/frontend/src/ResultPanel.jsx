import { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Check, Wand2, Image } from 'lucide-react';

/* ── Button helpers ─────────────────────────────────────────────── */
const accentBtn = (disabled = false) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, width: '100%', height: 40, borderRadius: 8,
  background: disabled ? '#3b2f6b' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  border: 'none', transition: 'opacity 0.15s, transform 0.1s',
  boxShadow: disabled ? 'none' : '0 2px 12px rgba(139,92,246,0.35)',
});

const ghostBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, flex: 1, height: 36, borderRadius: 6,
  background: '#1c1c1c', color: '#a1a1aa',
  border: '1px solid #2a2a2a', fontSize: 12, fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.15s',
};

const successBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, flex: 1, height: 36, borderRadius: 6,
  background: '#14532d', color: '#4ade80',
  border: '1px solid #166534', fontSize: 12, fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.15s',
};

/**
 * 右側面板：整合文字生圖 + 局部修改 prompt + 結果顯示
 *
 * Props (原有):
 *   resultBlob   Blob  — AI 結果圖片
 *   onAdopt      fn    — 採用結果
 *   onRegenerate fn    — 重新生成
 *   isEditing    bool  — 修改中
 *
 * Props (新增):
 *   prompt       str   — 修改描述
 *   onPromptChange fn  — 更新 prompt
 *   onEdit       fn    — 呼叫 /api/edit
 *   onGenerate   fn    — 呼叫 /api/generate
 *   appState     str   — 整體狀態
 *   hasImage     bool  — 是否有基底圖片
 *   isLoading    bool  — 任何非同步操作進行中
 */
export default function ResultPanel({
  resultBlob, onAdopt, onRegenerate, isEditing,
  prompt, onPromptChange, onEdit, onGenerate, appState, hasImage, isLoading,
}) {
  const [url, setUrl] = useState(null);
  const [genPrompt, setGenPrompt] = useState('');

  useEffect(() => {
    if (!resultBlob) { setUrl(null); return; }
    const u = URL.createObjectURL(resultBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [resultBlob]);

  const handleGenerate = () => {
    if (!genPrompt.trim() || isLoading) return;
    onGenerate(genPrompt);
    setGenPrompt('');
  };

  return (
    <div style={{
      width: 360, minWidth: 360, display: 'flex', flexDirection: 'column',
      background: '#0f0f0f', borderLeft: '1px solid #1f1f1f', overflow: 'hidden',
    }}>

      {/* ── Section: 文字生圖 ──────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        }}>
          <Image size={13} color="#8b5cf6" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            文字生圖
          </span>
        </div>

        <textarea
          value={genPrompt}
          onChange={(e) => setGenPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
          placeholder="描述想生成的圖片，例如「一隻貓坐在窗台上，夕陽光線」"
          disabled={isLoading}
          rows={3}
          style={{
            width: '100%', padding: '10px 12px',
            background: '#141414', border: '1px solid #2a2a2a',
            borderRadius: 8, fontSize: 13, color: '#f5f5f5',
            lineHeight: 1.5, marginBottom: 8,
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.15)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = 'none'; }}
        />

        <button
          onClick={handleGenerate}
          disabled={isLoading || !genPrompt.trim()}
          style={accentBtn(isLoading || !genPrompt.trim())}
        >
          {appState === 'generating'
            ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> 生圖中…</>
            : <><Sparkles size={13} /> 生成圖片</>
          }
        </button>
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div style={{ margin: '16px 16px 0', borderTop: '1px solid #1f1f1f' }} />

      {/* ── Section: 局部修改（有圖才顯示）────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        }}>
          <Wand2 size={13} color="#8b5cf6" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            局部修改
          </span>
          {!hasImage && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3f3f46', fontStyle: 'italic' }}>
              請先載入圖片
            </span>
          )}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading) { e.preventDefault(); onEdit(); } }}
          placeholder={hasImage ? '塗抹要修改的區域，再描述修改內容…' : '請先上傳或生成圖片'}
          disabled={isLoading || !hasImage}
          rows={3}
          style={{
            width: '100%', padding: '10px 12px',
            background: hasImage ? '#141414' : '#0f0f0f',
            border: '1px solid #2a2a2a',
            borderRadius: 8, fontSize: 13, color: '#f5f5f5',
            lineHeight: 1.5, marginBottom: 8,
            opacity: hasImage ? 1 : 0.4,
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { if (hasImage) { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.15)'; } }}
          onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = 'none'; }}
        />

        <button
          onClick={onEdit}
          disabled={isLoading || !hasImage || !prompt.trim()}
          style={accentBtn(isLoading || !hasImage || !prompt.trim())}
        >
          {appState === 'editing'
            ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> 修改中…</>
            : <><Wand2 size={13} /> 生成修改</>
          }
        </button>
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div style={{ margin: '16px 16px 0', borderTop: '1px solid #1f1f1f' }} />

      {/* ── Section: 結果 ─────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '16px 16px 16px', overflow: 'hidden', minHeight: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
          flexShrink: 0,
        }}>
          <Sparkles size={13} color="#8b5cf6" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            結果
          </span>
        </div>

        {/* 結果圖片區 */}
        <div style={{
          flex: 1, minHeight: 0, borderRadius: 10,
          background: '#141414', border: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Loading */}
          {isEditing && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,10,10,0.85)', zIndex: 10, gap: 10,
            }}>
              <div style={{
                width: 28, height: 28,
                border: '2px solid #2a2a2a',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                boxShadow: '0 0 12px rgba(139,92,246,0.4)',
              }} />
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>AI 處理中…</span>
            </div>
          )}

          {/* 無結果 */}
          {!url && !isEditing && (
            <div style={{ textAlign: 'center', color: '#3f3f46', padding: 20 }}>
              <Sparkles size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div style={{ fontSize: 12 }}>結果將顯示於此</div>
            </div>
          )}

          {/* 結果圖 */}
          {url && (
            <img
              src={url} alt="AI result"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </div>

        {/* 操作按鈕 */}
        {url && !isEditing && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexShrink: 0 }}>
            <button
              onClick={onRegenerate}
              style={ghostBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#363636'; e.currentTarget.style.color = '#f5f5f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a1a1aa'; }}
            >
              <RotateCcw size={12} />
              重新生成
            </button>
            <button
              onClick={onAdopt}
              style={successBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#166534'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#14532d'; }}
            >
              <Check size={12} />
              採用這張
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
