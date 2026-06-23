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
});

describe('POST /api/generate', () => {
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
