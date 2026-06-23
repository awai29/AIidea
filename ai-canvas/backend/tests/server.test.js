const request = require('supertest');
const { createApp } = require('../server');

describe('GET /health', () => {
  it('returns 200 with ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('daily limit middleware', () => {
  it('calls next when under limit', () => {
    const { checkDailyLimit, resetDailyCount } = require('../server');
    resetDailyCount();
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    checkDailyLimit(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 429 when daily limit is exceeded', () => {
    const { checkDailyLimit, resetDailyCount } = require('../server');
    resetDailyCount();
    const next = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      checkDailyLimit({}, { status: jest.fn().mockReturnThis(), json: jest.fn() }, jest.fn());
    }
    // 101st request should be blocked
    checkDailyLimit({}, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DAILY_LIMIT_EXCEEDED' }) })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate', () => {
  beforeEach(() => { require('../server').resetDailyCount(); });

  it('returns 400 when prompt is missing', async () => {
    const app = createApp();
    const res = await request(app).post('/api/generate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROMPT');
  });

  it('returns 400 when prompt is empty string', async () => {
    const app = createApp();
    const res = await request(app).post('/api/generate').send({ prompt: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROMPT');
  });
});

describe('POST /api/edit', () => {
  beforeEach(() => { require('../server').resetDailyCount(); });

  it('returns 400 when prompt is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/edit')
      .field('prompt', '')
      .attach('image', Buffer.from('fake'), { filename: 'image.png', contentType: 'image/png' })
      .attach('mask', Buffer.from('fake'), { filename: 'mask.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROMPT');
  });

  it('returns 400 when image is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/edit')
      .field('prompt', 'test prompt');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });
});
