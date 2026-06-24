import { useState, useRef, useCallback } from 'react';
import { createMaskCanvas, clearMask, isMaskEmpty, exportMask } from '../utils/maskExporter';
import { normalizeImage } from '../utils/imageNormalizer';

// 七個狀態：idle | uploading | ready | generating | editing | success | error

export function useAppState() {
  const [appState, setAppState] = useState('idle');
  const [baseImageBlob, setBaseImageBlob] = useState(null);
  const [resultImageBlob, setResultImageBlob] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [brushRadius, setBrushRadius] = useState(20);
  const [showMask, setShowMask] = useState(true);
  const [clearCounter, setClearCounter] = useState(0);
  const maskCanvasRef = useRef(null);

  // 正在非同步處理中的狀態
  const isLoading = ['uploading', 'generating', 'editing'].includes(appState);

  const setError = useCallback((msg) => {
    setErrorMessage(msg);
    setAppState('error');
  }, []);

  // ── 載入新的基底圖 ─────────────────────────────────────────────────────────
  const loadAsBase = useCallback((blob, width, height) => {
    // 建立與原圖等尺寸的遮罩 canvas
    maskCanvasRef.current = createMaskCanvas(width, height);
    setBaseImageBlob(blob);
    setResultImageBlob(null);
    setPrompt('');
    // 增加 clearCounter 讓 Canvas 元件知道要清除舊筆刷
    setClearCounter((c) => c + 1);
    setAppState('ready');
  }, []);

  // ── 上傳圖片 ──────────────────────────────────────────────────────────────
  const uploadImage = useCallback(async (file) => {
    setAppState('uploading');
    setErrorMessage('');
    try {
      const blob = await normalizeImage(file);
      // 讀取正規化後的尺寸
      const img = new Image();
      const url = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);
      loadAsBase(blob, img.naturalWidth, img.naturalHeight);
    } catch (err) {
      setError(err.message || '上傳失敗');
    }
  }, [loadAsBase, setError]);

  // ── 文字生圖 ──────────────────────────────────────────────────────────────
  const generateImage = useCallback(async (genPrompt) => {
    if (!genPrompt.trim()) { setError('請輸入修改描述'); return; }
    setAppState('generating');
    setErrorMessage('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: genPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'AI 服務暫時無法使用，請稍後再試');
      // base64 解碼為 Blob
      const byteCharacters = atob(data.imageBase64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'image/png' });
      loadAsBase(blob, data.width, data.height);
    } catch (err) {
      setError(err.message);
    }
  }, [loadAsBase, setError]);

  // ── 局部修改（inpainting）────────────────────────────────────────────────
  const editImage = useCallback(async () => {
    if (!prompt.trim()) { setError('請輸入修改描述'); return; }
    if (!maskCanvasRef.current || isMaskEmpty(maskCanvasRef.current)) {
      setError('請先用筆刷塗抹想修改的區域'); return;
    }
    setAppState('editing');
    setErrorMessage('');
    try {
      const maskBlob = await exportMask(maskCanvasRef.current);
      const formData = new FormData();
      formData.append('image', baseImageBlob, 'image.png');
      formData.append('mask', maskBlob, 'mask.png');
      formData.append('prompt', prompt.trim());
      const res = await fetch('/api/edit', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'AI 服務暫時無法使用，請稍後再試');
      const byteCharacters = atob(data.imageBase64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'image/png' });
      setResultImageBlob(blob);
      setAppState('success');
    } catch (err) {
      setError(err.message);
    }
  }, [baseImageBlob, prompt, setError]);

  // ── 採用結果為新的基底圖 ─────────────────────────────────────────────────
  const adoptResult = useCallback(() => {
    if (!resultImageBlob) return;
    const img = new Image();
    const url = URL.createObjectURL(resultImageBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      loadAsBase(resultImageBlob, img.naturalWidth, img.naturalHeight);
    };
    img.src = url;
  }, [resultImageBlob, loadAsBase]);

  // ── 重新生成（使用相同基底圖 + 遮罩 + prompt）───────────────────────────
  const regenerate = useCallback(() => {
    editImage();
  }, [editImage]);

  // ── 清除遮罩（保留基底圖）───────────────────────────────────────────────
  const clearMaskAction = useCallback(() => {
    if (maskCanvasRef.current) clearMask(maskCanvasRef.current);
    setClearCounter((c) => c + 1);
  }, []);

  return {
    appState, baseImageBlob, resultImageBlob, errorMessage,
    prompt, setPrompt,
    brushRadius, setBrushRadius,
    showMask, setShowMask,
    clearCounter,
    maskCanvasRef,
    isLoading,
    uploadImage, generateImage, editImage, adoptResult, regenerate, clearMaskAction,
  };
}
