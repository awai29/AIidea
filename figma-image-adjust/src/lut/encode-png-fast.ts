/**
 * 無壓縮 PNG 快速編碼器
 *
 * 原理：PNG 規格允許 IDAT 資料使用 zlib "stored blocks"（deflate level 0）
 * 完全跳過 DEFLATE 壓縮演算法，只做簡單的資料包裝與 checksum 計算。
 *
 * 速度比 canvas.toBlob('image/png') 快 5~10 倍，且仍是合法的 PNG 格式。
 * 代價：檔案比壓縮 PNG 大，但用於即時預覽可以接受。
 */

// ── CRC32 ────────────────────────────────────────────────────────────────────
// PNG 每個 chunk 結尾都需要 CRC32 驗證
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xFF]! ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ── Adler32 ──────────────────────────────────────────────────────────────────
// zlib 尾端需要 Adler32 checksum
function adler32(data: Uint8Array): number {
  let s1 = 1, s2 = 0
  for (let i = 0; i < data.length; i++) {
    s1 = (s1 + data[i]!) % 65521
    s2 = (s2 + s1) % 65521
  }
  return ((s2 << 16) | s1) >>> 0
}

// ── 工具函式 ─────────────────────────────────────────────────────────────────
function u32BE(n: number, buf: Uint8Array, offset: number) {
  buf[offset]     = (n >>> 24) & 0xFF
  buf[offset + 1] = (n >>> 16) & 0xFF
  buf[offset + 2] = (n >>> 8)  & 0xFF
  buf[offset + 3] = n          & 0xFF
}

function writeChunk(out: Uint8Array, offset: number, type: string, data: Uint8Array): number {
  const typeBytes = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)]
  // length (4 bytes)
  u32BE(data.length, out, offset); offset += 4
  // type (4 bytes)
  out[offset]     = typeBytes[0]!
  out[offset + 1] = typeBytes[1]!
  out[offset + 2] = typeBytes[2]!
  out[offset + 3] = typeBytes[3]!
  offset += 4
  // data
  out.set(data, offset); offset += data.length
  // CRC32 over type + data
  const crcBuf = new Uint8Array(4 + data.length)
  crcBuf[0] = typeBytes[0]!; crcBuf[1] = typeBytes[1]!
  crcBuf[2] = typeBytes[2]!; crcBuf[3] = typeBytes[3]!
  crcBuf.set(data, 4)
  u32BE(crc32(crcBuf), out, offset); offset += 4
  return offset
}

// ── 主要函式 ─────────────────────────────────────────────────────────────────

/**
 * 將 RGBA Uint8Array 快速編碼為無壓縮 PNG。
 * 同步執行，無需 await，比 canvas.toBlob 快 5~10 倍。
 *
 * @param pixels  RGBA 像素陣列（寬 × 高 × 4 bytes）
 * @param width   圖片寬度（像素）
 * @param height  圖片高度（像素）
 */
export function encodePNGFast(pixels: Uint8Array, width: number, height: number): Uint8Array {
  // ── 步驟 1：加 PNG filter byte（每行開頭一個 0x00 = None filter） ───────
  const rowStride = width * 4          // 每行像素 bytes
  const rawLen = height * (rowStride + 1)  // 含 filter byte
  const raw = new Uint8Array(rawLen)
  for (let y = 0; y < height; y++) {
    const dst = y * (rowStride + 1)
    raw[dst] = 0  // filter type: None
    raw.set(pixels.subarray(y * rowStride, (y + 1) * rowStride), dst + 1)
  }

  // ── 步驟 2：zlib stored blocks 包裝（不壓縮，只切塊） ───────────────────
  // 每個 stored block 最多 65535 bytes
  const BLOCK = 65535
  const numBlocks = Math.ceil(rawLen / BLOCK) || 1
  // zlib = 2 bytes header + numBlocks * 5 bytes block header + rawLen bytes data + 4 bytes checksum
  const zlibLen = 2 + numBlocks * 5 + rawLen + 4
  const zlib = new Uint8Array(zlibLen)
  let zOff = 0

  // zlib header：CM=8, CINFO=7 → CMF=0x78；FLG=0x01 使 (0x78<<8|0x01)%31==0，且 FDICT=0, FLEVEL=0
  zlib[zOff++] = 0x78
  zlib[zOff++] = 0x01

  for (let i = 0; i < numBlocks; i++) {
    const start = i * BLOCK
    const end   = Math.min(start + BLOCK, rawLen)
    const len   = end - start
    const isLast = i === numBlocks - 1
    // DEFLATE stored block header
    zlib[zOff++] = isLast ? 0x01 : 0x00  // BFINAL | (BTYPE=00 << 1)
    zlib[zOff++] = len & 0xFF             // LEN  (little-endian)
    zlib[zOff++] = (len >> 8) & 0xFF
    zlib[zOff++] = (~len) & 0xFF          // NLEN = one's complement
    zlib[zOff++] = (~len >> 8) & 0xFF
    zlib.set(raw.subarray(start, end), zOff)
    zOff += len
  }

  // Adler32 checksum（big-endian）
  const chk = adler32(raw)
  zlib[zOff++] = (chk >> 24) & 0xFF
  zlib[zOff++] = (chk >> 16) & 0xFF
  zlib[zOff++] = (chk >> 8)  & 0xFF
  zlib[zOff++] = chk          & 0xFF

  // ── 步驟 3：組合 PNG 結構 ─────────────────────────────────────────────────
  // IHDR data: width(4) + height(4) + bitDepth(1) + colorType(1) + compress(1) + filter(1) + interlace(1) = 13 bytes
  const ihdrData = new Uint8Array(13)
  u32BE(width,  ihdrData, 0)
  u32BE(height, ihdrData, 4)
  ihdrData[8]  = 8  // bit depth = 8
  ihdrData[9]  = 6  // color type = RGBA
  ihdrData[10] = 0  // compression method = deflate
  ihdrData[11] = 0  // filter method = adaptive
  ihdrData[12] = 0  // interlace = none

  // 計算總長度：signature(8) + IHDR chunk(25) + IDAT chunk(12+zlibLen) + IEND chunk(12)
  const totalLen = 8 + (4+4+13+4) + (4+4+zlibLen+4) + (4+4+0+4)
  const out = new Uint8Array(totalLen)
  let off = 0

  // PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (const b of sig) out[off++] = b

  // IHDR chunk
  off = writeChunk(out, off, 'IHDR', ihdrData)

  // IDAT chunk
  off = writeChunk(out, off, 'IDAT', zlib)

  // IEND chunk
  off = writeChunk(out, off, 'IEND', new Uint8Array(0))

  return out
}
