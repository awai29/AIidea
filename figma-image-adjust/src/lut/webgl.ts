// WebGL 2 渲染引擎
// 負責：初始化、載入圖片 Texture、上傳 3D LUT、渲染、readPixels

const LUT_SIZE = 17;

const VERTEX_SHADER_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  // 將 [-1,1] 的頂點座標轉為 [0,1] 的 UV 座標
  v_texCoord = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler3D;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler3D u_lut;
// 分割預覽：< 0 = 無分割；0-1 = 分割線的水平位置（左側顯示原圖）
uniform float u_splitX;

void main() {
  vec4 color = texture(u_image, v_texCoord);

  // 將 [0,1] 的 RGB 對應到 LUT 的格點座標
  // 偏移 0.5 texel 以對齊格點中心
  float scale = (${LUT_SIZE}.0 - 1.0) / ${LUT_SIZE}.0;
  float offset = 0.5 / ${LUT_SIZE}.0;
  vec3 lutCoord = color.rgb * scale + offset;
  vec3 adjusted = texture(u_lut, lutCoord).rgb;

  // 分割線左側顯示原圖，右側顯示調整後
  if (u_splitX >= 0.0 && v_texCoord.x < u_splitX) {
    fragColor = color;
  } else {
    fragColor = vec4(adjusted, color.a);
  }
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
  }
  // 連結完成後刪除 shader 物件，釋放 GPU 記憶體
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private imageTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private imageWidth = 0;
  private imageHeight = 0;
  private splitXLoc: WebGLUniformLocation | null = null;
  private splitX = -1;  // < 0 表示無分割

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL 2 不支援，請使用現代瀏覽器');
    this.gl = gl;
    this.program = createProgram(gl);

    // 建立全螢幕四邊形（兩個三角形覆蓋整個畫布）
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.splitXLoc = gl.getUniformLocation(this.program, 'u_splitX');
  }

  /**
   * 將圖片（PNG/JPEG bytes）載入為 WebGL Texture
   * 回傳 Promise，圖片解碼完成後 resolve
   */
  loadImage(bytes: Uint8Array, width: number, height: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([bytes as unknown as BlobPart]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const { gl } = this;
        this.imageWidth = width;
        this.imageHeight = height;

        if (this.imageTexture) gl.deleteTexture(this.imageTexture);
        this.imageTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        // 產生 mipmap，使預覽縮小時做三線性過濾，避免鋸齒
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片載入失敗')); };
      img.src = url;
    });
  }

  /**
   * 上傳新的 33³ LUT 為 WebGL 3D Texture 並觸發重新渲染
   */
  updateLut(lutData: Uint8Array): void {
    const { gl } = this;

    if (this.lutTexture) gl.deleteTexture(this.lutTexture);
    this.lutTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.texImage3D(
      gl.TEXTURE_3D, 0, gl.RGBA8,
      LUT_SIZE, LUT_SIZE, LUT_SIZE, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, lutData
    );
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    this.render();
  }

  /** 渲染一幀 */
  private render(width = this.gl.canvas.width, height = this.gl.canvas.height): void {
    if (!this.imageTexture || !this.lutTexture) return;
    const { gl } = this;

    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_image'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_lut'), 1);

    gl.uniform1f(this.splitXLoc, this.splitX);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  /** 清理所有 GPU 資源，在元件卸載時呼叫 */
  destroy(): void {
    const { gl } = this;
    if (this.imageTexture) {
      gl.deleteTexture(this.imageTexture);
      this.imageTexture = null;
    }
    if (this.lutTexture) {
      gl.deleteTexture(this.lutTexture);
      this.lutTexture = null;
    }
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
    // 釋放 WebGL context
    const ext = gl.getExtension('WEBGL_lose_context');
    ext?.loseContext();
  }

  /**
   * 設定分割線位置（0-1），< 0 表示關閉分割
   */
  setSplit(x: number): void {
    this.splitX = x;
    this.render();
  }

  /** 回傳目前 canvas 的繪圖緩衝區尺寸 */
  getDisplaySize(): { width: number; height: number } {
    return { width: this.gl.drawingBufferWidth, height: this.gl.drawingBufferHeight }
  }

  /**
   * 讀取目前 canvas viewport 的像素（預覽解析度，速度快）
   * 供即時直方圖更新使用，不需 Y-flip（只計算顏色分布）
   */
  readViewportPixels(): Uint8Array {
    const { gl } = this;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }

  /**
   * 讀取目前渲染結果的像素（RGBA Uint8Array）
   * 在 Apply 時呼叫，回傳圖片 bytes 傳給 plugin code
   */
  readPixels(): { pixels: Uint8Array; width: number; height: number } {
    const { gl } = this;
    const w = this.imageWidth;
    const h = this.imageHeight;

    // 防呆：尚未載入圖片時直接拋錯
    if (w === 0 || h === 0) throw new Error('尚未載入圖片，無法讀取像素');

    // 建立離屏 Framebuffer 以原圖解析度讀取
    const fb = gl.createFramebuffer()!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
      this.render();  // 恢復 canvas 顯示
      throw new Error('離屏 Framebuffer 建立失敗');
    }

    // 以原圖尺寸重新渲染一次
    this.render(w, h);

    const raw = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);

    // 清理
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    this.render();

    // WebGL readPixels 的 Y 軸與 Canvas 2D 相反（WebGL Y=0 在底部）
    // 需要反轉行順序，否則 putImageData 後圖片會上下翻轉
    const rowBytes = w * 4;
    const pixels = new Uint8Array(raw.length);
    for (let row = 0; row < h; row++) {
      pixels.set(raw.subarray((h - 1 - row) * rowBytes, (h - row) * rowBytes), row * rowBytes);
    }

    return { pixels, width: w, height: h };
  }
}
