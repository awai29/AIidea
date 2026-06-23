require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const OpenAI = require('openai');
const { toFile } = require('openai');

// ── Daily request counter (resets at midnight) ──────────────────────────────
let dailyCount = 0;
let dailyResetDate = new Date().toDateString();

function resetDailyCount() {
  dailyCount = 0;
  dailyResetDate = new Date().toDateString();
}

function checkDailyLimit(req, res, next) {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    dailyCount = 0;
    dailyResetDate = today;
  }
  if (dailyCount >= 100) {
    return res.status(429).json({
      error: { code: 'DAILY_LIMIT_EXCEEDED', message: '今日額度已用完，請明天再試' },
    });
  }
  dailyCount++;
  next();
}

// ── Per-IP rate limiter: 5 req/min ───────────────────────────────────────────
const perMinuteLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: '請求過於頻繁，請稍後再試' },
    });
  },
});

// ── File upload (memory storage, 20 MB limit) ────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── Parse PNG dimensions from base64 (reads IHDR chunk) ─────────────────────
function getPNGDimensions(base64) {
  const buf = Buffer.from(base64, 'base64');
  if (buf.length < 24) throw new Error('Invalid PNG response: buffer too short');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

// ── App factory ──────────────────────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Lazy OpenAI client — only instantiated when actually needed by route handlers
  function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // POST /api/generate
  app.post('/api/generate', perMinuteLimit, checkDailyLimit, async (req, res) => {
    const { prompt, size = 'auto', quality = 'medium' } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: { code: 'INVALID_PROMPT', message: '請輸入修改描述' } });
    }
    try {
      const openai = getOpenAI();
      const result = await openai.images.generate({
        model: 'gpt-image-2',
        prompt: prompt.trim(),
        size,
        quality,
        output_format: 'png',
        response_format: 'b64_json',
      });
      const imageBase64 = result.data[0].b64_json;
      const { width, height } = getPNGDimensions(imageBase64);
      console.log(JSON.stringify({ event: 'generate', width, height, ts: Date.now() }));
      res.json({ imageBase64, mimeType: 'image/png', width, height });
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).json({ error: { code: 'MODERATION_BLOCKED', message: '此內容不符合使用規範，請調整描述' } });
      }
      console.error('generate error:', err.message);
      res.status(500).json({ error: { code: 'UPSTREAM_ERROR', message: 'AI 服務暫時無法使用，請稍後再試' } });
    }
  });

  // POST /api/edit
  app.post(
    '/api/edit',
    perMinuteLimit,
    checkDailyLimit,
    upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mask', maxCount: 1 }]),
    async (req, res) => {
      const { prompt, size = 'auto', quality = 'medium' } = req.body;
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: { code: 'INVALID_PROMPT', message: '請輸入修改描述' } });
      }
      if (!req.files?.image?.[0]) {
        return res.status(400).json({ error: { code: 'INVALID_IMAGE', message: '缺少原圖' } });
      }
      if (!req.files?.mask?.[0]) {
        return res.status(400).json({ error: { code: 'INVALID_MASK', message: '缺少遮罩' } });
      }
      try {
        const openai = getOpenAI();
        const imageFile = await toFile(req.files.image[0].buffer, 'image.png', { type: 'image/png' });
        const maskFile = await toFile(req.files.mask[0].buffer, 'mask.png', { type: 'image/png' });
        const result = await openai.images.edit({
          model: 'gpt-image-2',
          image: imageFile,
          mask: maskFile,
          prompt: prompt.trim(),
          size,
          quality,
          output_format: 'png',
          response_format: 'b64_json',
        });
        const imageBase64 = result.data[0].b64_json;
        const { width, height } = getPNGDimensions(imageBase64);
        console.log(JSON.stringify({ event: 'edit', width, height, ts: Date.now() }));
        res.json({ imageBase64, mimeType: 'image/png', width, height });
      } catch (err) {
        if (err.status === 400) {
          return res.status(400).json({ error: { code: 'MODERATION_BLOCKED', message: '此內容不符合使用規範，請調整描述' } });
        }
        console.error('edit error:', err.message);
        res.status(500).json({ error: { code: 'UPSTREAM_ERROR', message: 'AI 服務暫時無法使用，請稍後再試' } });
      }
    }
  );

  return app;
}

module.exports = { createApp, checkDailyLimit, resetDailyCount };

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}
