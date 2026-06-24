import { ImageIcon } from 'lucide-react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import ResultPanel from './ResultPanel';
import { useAppState } from './hooks/useAppState';
import './index.css';

/* ── Left panel header ─────────────────────────────────────────────────── */
function PanelHeader({ label }) {
  return (
    <div style={{
      height: 44, padding: '0 16px',
      borderBottom: '1px solid #e4e4e7',
      display: 'flex', alignItems: 'center',
      background: '#fff', flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}

export default function App() {
  const {
    appState, baseImageBlob, resultImageBlob, errorMessage,
    prompt, setPrompt,
    brushRadius, setBrushRadius,
    showMask, setShowMask,
    clearCounter,
    maskCanvasRef,
    isLoading,
    uploadImage, generateImage, editImage, adoptResult, regenerate, clearMaskAction,
  } = useAppState();

  const hasImage = !!baseImageBlob;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 1280, background: '#fff' }}>

      {/* 頂部工具列 */}
      <Toolbar
        brushRadius={brushRadius}
        onBrushChange={setBrushRadius}
        onClearMask={clearMaskAction}
        onToggleMask={() => setShowMask((v) => !v)}
        showMask={showMask}
        onUpload={uploadImage}
        onGenerate={generateImage}
        disabled={isLoading}
      />

      {/* 錯誤訊息 */}
      {appState === 'error' && (
        <div style={{
          padding: '8px 16px', fontSize: 13, flexShrink: 0,
          background: '#fef2f2', color: '#dc2626',
          borderBottom: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          {errorMessage}
        </div>
      )}

      {/* 主要區塊 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 左側：畫布 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e4e4e7', overflow: 'hidden' }}>
          <PanelHeader label="原始圖片" />
          <div style={{ flex: 1, position: 'relative', background: '#f4f4f5', overflow: 'hidden' }}>
            {!hasImage ? (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 10, color: '#a1a1aa',
              }}>
                {appState === 'uploading' && (
                  <>
                    <div style={{ width: 24, height: 24, border: '2px solid #e4e4e7', borderTopColor: '#18181b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>圖片處理中…</span>
                  </>
                )}
                {appState === 'generating' && (
                  <>
                    <div style={{ width: 24, height: 24, border: '2px solid #e4e4e7', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>AI 生圖中…</span>
                  </>
                )}
                {(appState === 'idle' || appState === 'error') && (
                  <>
                    <div style={{
                      width: 56, height: 56, borderRadius: 12,
                      background: '#fff', border: '1px solid #e4e4e7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                      <ImageIcon size={24} color="#a1a1aa" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#52525b', marginBottom: 4 }}>尚無圖片</div>
                      <div style={{ fontSize: 12, color: '#a1a1aa' }}>上傳圖片或在上方輸入描述生圖</div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Canvas
                imageBlob={baseImageBlob}
                maskCanvasRef={maskCanvasRef}
                brushRadius={brushRadius}
                showMask={showMask}
                clearCounter={clearCounter}
              />
            )}
          </div>

          {/* 底部 prompt 輸入列 */}
          {hasImage && (
            <div style={{
              padding: '10px 12px',
              borderTop: '1px solid #e4e4e7',
              display: 'flex', gap: 8, background: '#fff', flexShrink: 0,
            }}>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) editImage(); }}
                placeholder="描述要修改的內容，例如「把這裡換成一隻貓」"
                disabled={isLoading}
                style={{
                  flex: 1, height: 36, padding: '0 12px',
                  border: '1px solid #e4e4e7', borderRadius: 6,
                  fontSize: 13, color: '#09090b', background: '#fff',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#18181b'; e.target.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.08)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e4e4e7'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                onClick={editImage}
                disabled={isLoading || !prompt.trim()}
                style={{
                  height: 36, padding: '0 20px',
                  background: isLoading ? '#3f3f46' : '#18181b',
                  color: '#fafafa', borderRadius: 6,
                  fontSize: 13, fontWeight: 500,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#27272a'; }}
                onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#18181b'; }}
              >
                {appState === 'editing' ? '處理中…' : '生成修改'}
              </button>
            </div>
          )}
        </div>

        {/* 右側：結果面板 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ResultPanel
            resultBlob={resultImageBlob}
            onAdopt={adoptResult}
            onRegenerate={regenerate}
            isEditing={appState === 'editing'}
          />
        </div>
      </div>
    </div>
  );
}
