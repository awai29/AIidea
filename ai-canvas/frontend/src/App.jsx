import Canvas from './Canvas';
import Toolbar from './Toolbar';
import ResultPanel from './ResultPanel';
import { useAppState } from './hooks/useAppState';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 1280, fontFamily: 'system-ui, sans-serif' }}>
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

      {/* 錯誤訊息橫幅 */}
      {appState === 'error' && (
        <div style={{
          background: '#fee2e2', color: '#dc2626',
          padding: '8px 16px', fontSize: 13, borderBottom: '1px solid #fca5a5',
        }}>
          {errorMessage}
        </div>
      )}

      {/* 主要雙面板區 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左側：畫布 */}
        <div style={{ flex: 1, position: 'relative', background: '#d1d5db', overflow: 'hidden' }}>
          {!hasImage ? (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 8,
            }}>
              {appState === 'uploading' && <span style={{ fontSize: 14 }}>圖片處理中…</span>}
              {appState === 'generating' && <span style={{ fontSize: 14 }}>AI 生圖中…</span>}
              {(appState === 'idle' || appState === 'error') && (
                <>
                  <span style={{ fontSize: 32 }}>🖼</span>
                  <span style={{ fontSize: 14 }}>上傳圖片或使用文字生圖</span>
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

        {/* 右側：結果 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb' }}>
          <ResultPanel
            resultBlob={resultImageBlob}
            onAdopt={adoptResult}
            onRegenerate={regenerate}
            isEditing={appState === 'editing'}
          />
        </div>
      </div>

      {/* 底部 prompt 輸入列（有圖片才顯示） */}
      {hasImage && (
        <div style={{
          padding: '10px 16px', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: 8, background: '#fff',
        }}>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) editImage(); }}
            placeholder="描述要修改的內容，例如「把這裡換成一隻貓」"
            disabled={isLoading}
            style={{
              flex: 1, padding: '8px 12px', border: '1px solid #d1d5db',
              borderRadius: 6, fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={editImage}
            disabled={isLoading || !prompt.trim()}
            style={{
              padding: '8px 24px', background: isLoading ? '#93c5fd' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: 14,
            }}
          >
            {appState === 'editing' ? '處理中…' : '生成修改'}
          </button>
        </div>
      )}
    </div>
  );
}
