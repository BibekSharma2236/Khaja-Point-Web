jest.mock('../src/model/userModel', () => ({
  findUserByEmail: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

const request = require('supertest');
const app = require('../src/server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail } = require('../src/model/userModel');

describe('POST /api/login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and token on successful login', async () => {
    const mockUser = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
      password: 'hashedPassword'
    };
    findUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('fakeToken123');

    const res = await request(app).post('/api/login').send({
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBe('fakeToken123');
    expect(res.body.message).toBe('Login Successful');
  });

  test('should return 400 if email is missing', async () => {
    const res = await request(app).post('/api/login').send({ password: '123456' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('field empty');
  });

  test('should return 400 if password is missing', async () => {
    const res = await request(app).post('/api/login').send({ email: 'john@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('field empty');
  });

  test('should return 401 if user not found', async () => {
    findUserByEmail.mockResolvedValue(null);

    const res = await request(app).post('/api/login').send({
      email: 'missing@example.com',
      password: '123456'
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('should return 401 if password is incorrect', async () => {
    const mockUser = { id: 1, email: 'john@example.com', password: 'hashedPassword' };
    findUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/api/login').send({
      email: 'john@example.com',
      password: 'wrongpassword'
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('should return 500 if database fails', async () => {
    findUserByEmail.mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/api/login').send({
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('unsuccessful');
  });

  test('should return 500 if bcrypt compare fails', async () => {
    const mockUser = { id: 1, email: 'john@example.com', password: 'hashedPassword' };
    findUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockRejectedValue(new Error('bcrypt error'));

    const res = await request(app).post('/api/login').send({
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.statusCode).toBe(500);
  });

  test('should return 500 if jwt sign fails', async () => {
    const mockUser = { id: 1, email: 'john@example.com', password: 'hashedPassword' };
    findUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockImplementation(() => { throw new Error('jwt error'); });

    const res = await request(app).post('/api/login').send({
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.statusCode).toBe(500);
  });
});
