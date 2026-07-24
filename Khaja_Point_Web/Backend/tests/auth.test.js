jest.mock('../src/db/db', () => ({
  openDb: jest.fn(),
  run: jest.fn(),
  get: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

const request = require('supertest');
const app = require('../src/server');
const bcrypt = require('bcryptjs');
const db = require('../src/db/db');

describe('API health and auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health returns backend info', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('backend');
  });

  test('POST /api/auth/login returns 401 for unknown user', async () => {
    db.get.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('POST /api/auth/register creates a user', async () => {
    db.get.mockResolvedValueOnce(null);
    db.run.mockResolvedValueOnce({ lastID: 42 });
    bcrypt.hash.mockResolvedValueOnce('hashed-password');

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.name).toBe('Alice');
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.token).toBeDefined();
  });

  test('GET /api/auth/me rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Missing Authorization Bearer token');
  });
});
