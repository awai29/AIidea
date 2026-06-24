import { useRef, useEffect, useCallback } from 'react';
import { getCanvasLayout, displayToOriginal, getBrushRadiusInOriginal } from './utils/coordinateMapping';
import { paintMaskArea } from './utils/maskExporter';

/**
 * 左側畫布元件
 *
 * Props:
 *   imageBlob      Blob   — 目前的基底圖片（PNG）
 *   maskCanvasRef  ref    — 指向離螢幕遮罩 canvas（來自 useAppState）
 *   brushRadius    number — 筆刷半徑（CSS 像素）
 *   showMask       bool   — 是否顯示紅色遮罩覆蓋層
 *   clearCounter   number — 數值增加時清除筆刷紀錄並重繪
 */
export default function Canvas({ imageBlob, maskCanvasRef, brushRadius, showMask, clearCounter }) {
  const displayCanvasRef = useRef(null);
  const layoutRef = useRef(null);
  const isDrawingRef = useRef(false);
  const imageRef = useRef(null);
  // 筆刷軌跡存在原圖座標，這樣縮放不會讓覆蓋層錯位
  const strokesRef = useRef([]); // [{ origX, origY, origRadius }]

  // ── 重繪顯示 canvas ────────────────────────────────────────────────────────
  const redrawDisplay = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !imageRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    if (cw === 0 || ch === 0) return;

    // Retina 螢幕：用 devicePixelRatio 提高解析度
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const img = imageRef.current;
    const layout = getCanvasLayout(cw, ch, img.naturalWidth, img.naturalHeight);
    layoutRef.current = layout;
    const { offsetX, offsetY, renderedWidth, renderedHeight } = layout;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, renderedWidth, renderedHeight);

    // 紅色遮罩覆蓋層（塗抹區域）
    if (showMask && strokesRef.current.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgb(255, 60, 60)';
      for (const { origX, origY, origRadius } of strokesRef.current) {
        // 把原圖座標換算回 CSS 顯示座標
        const cssX = offsetX + origX * (renderedWidth / img.naturalWidth);
        const cssY = offsetY + origY * (renderedHeight / img.naturalHeight);
        const cssR = origRadius * (renderedWidth / img.naturalWidth);
        ctx.beginPath();
        ctx.arc(cssX, cssY, cssR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }, [showMask]);

  // ── 圖片更換時重新載入 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageBlob) return;
    strokesRef.current = []; // 新圖片，清除舊筆刷
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    img.onload = () => {
      imageRef.current = img;
      URL.revokeObjectURL(url);
      redrawDisplay();
    };
    img.src = url;
  }, [imageBlob, redrawDisplay]);

  // ── showMask 切換時重繪 ───────────────────────────────────────────────────
  useEffect(() => {
    redrawDisplay();
  }, [showMask, redrawDisplay]);

  // ── clearCounter 增加時清除筆刷紀錄 ─────────────────────────────────────
  useEffect(() => {
    strokesRef.current = [];
    redrawDisplay();
  }, [clearCounter, redrawDisplay]);

  // ── 容器尺寸改變時重繪（ResizeObserver）─────────────────────────────────
  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => redrawDisplay());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redrawDisplay]);

  // ── 筆刷塗抹 ─────────────────────────────────────────────────────────────
  const paintAt = useCallback((e) => {
    if (!layoutRef.current || !imageRef.current || !maskCanvasRef.current) return;
    const canvas = displayCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const img = imageRef.current;
    const origCoords = displayToOriginal(mouseX, mouseY, layoutRef.current, img.naturalWidth, img.naturalHeight);
    if (!origCoords) return; // 點擊在圖片範圍外

    const origRadius = getBrushRadiusInOriginal(brushRadius, layoutRef.current, img.naturalWidth);
    paintMaskArea(maskCanvasRef.current, origCoords.x, origCoords.y, origRadius);
    strokesRef.current.push({ origX: origCoords.x, origY: origCoords.y, origRadius });
    redrawDisplay();
  }, [brushRadius, maskCanvasRef, redrawDisplay]);

  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    paintAt(e);
  }, [paintAt]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    paintAt(e);
  }, [paintAt]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  return (
    <canvas
      ref={displayCanvasRef}
      style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
