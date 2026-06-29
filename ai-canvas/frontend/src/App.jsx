import { ImageIcon } from 'lucide-react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import ResultPanel from './ResultPanel';
import { useAppState } from './hooks/useAppState';
import './index.css';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 1280, background: '#0a0a0a' }}>

      {/* 頂部工具列 */}
      <Toolbar
        brushRadius={brushRadius}
        onBrushChange={setBrushRadius}
        onClearMask={clearMaskAction}
        onToggleMask={() => setShowMask((v) => !v)}
        showMask={showMask}
        onUpload={uploadImage}
        disabled={isLoading}
      />

      {/* 錯誤訊息 */}
      {appState === 'error' && (
        <div style={{
          padding: '7px 16px', fontSize: 12, flexShrink: 0,
          background: 'rgba(239,68,68,0.08)', color: '#f87171',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          {errorMessage}
        </div>
      )}

      {/* 主要區塊 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 中央畫布 */}
        <div className="canvas-bg" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* 無圖片狀態 */}
          {!hasImage && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12,
            }}>
              {appState === 'uploading' && (
                <>
                  <div style={{ width: 28, height: 28, border: '2px solid #2a2a2a', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#52525b' }}>圖片處理中…</span>
                </>
              )}
              {appState === 'generating' && (
                <>
                  <div style={{ width: 28, height: 28, border: '2px solid #2a2a2a', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }} />
                  <span style={{ fontSize: 13, color: '#52525b' }}>AI 生圖中…</span>
                </>
              )}
              {(appState === 'idle' || appState === 'error') && (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: '#141414', border: '1px solid #2a2a2a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ImageIcon size={28} color="#3f3f46" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#52525b', marginBottom: 4 }}>尚無圖片</div>
                    <div style={{ fontSize: 12, color: '#3f3f46' }}>使用右側「文字生圖」，或點上方「上傳圖片」</div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 畫布 */}
          {hasImage && (
            <Canvas
              imageBlob={baseImageBlob}
              maskCanvasRef={maskCanvasRef}
              brushRadius={brushRadius}
              showMask={showMask}
              clearCounter={clearCounter}
            />
          )}
        </div>

        {/* 右側面板（整合 prompt + 結果） */}
        <ResultPanel
          resultBlob={resultImageBlob}
          onAdopt={adoptResult}
          onRegenerate={regenerate}
          isEditing={appState === 'editing'}
          prompt={prompt}
          onPromptChange={setPrompt}
          onEdit={editImage}
          onGenerate={generateImage}
          appState={appState}
          hasImage={hasImage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
