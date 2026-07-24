jest.mock('../src/model/userModel', () => ({
  getAllUsers: jest.fn(),
  getUserById: jest.fn()
}));

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
  requireAdmin: (req, res, next) => next()
}));

const request = require('supertest');
const app = require('../src/server');
const { getAllUsers, getUserById } = require('../src/model/userModel');

describe('GET /api/getall', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and all users', async () => {
    const mockUsers = [
      { id: 1, name: 'John', email: 'john@example.com', image: null },
      { id: 2, name: 'Jane', email: 'jane@example.com', image: null }
    ];
    getAllUsers.mockResolvedValue(mockUsers);

    const res = await request(app).get('/api/getall');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(mockUsers);
    expect(res.body.data).toHaveLength(2);
  });

  test('should return 200 with empty array if no users exist', async () => {
    getAllUsers.mockResolvedValue([]);

    const res = await request(app).get('/api/getall');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.data).toHaveLength(0);
  });

  test('should return 500 if database fails', async () => {
    getAllUsers.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/getall');

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('unsuccessful');
  });
});

describe('GET /api/getuser/:id', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and a single user', async () => {
    const mockUser = { id: 1, name: 'John', email: 'john@example.com', image: null };
    getUserById.mockResolvedValue(mockUser);

    const res = await request(app).get('/api/getuser/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('John');
    expect(res.body.data.email).toBe('john@example.com');
  });

  test('should return 404 if user does not exist', async () => {
    getUserById.mockResolvedValue(null);

    const res = await request(app).get('/api/getuser/999');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  test('should return 500 if database fails', async () => {
    getUserById.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/getuser/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('unsuccessful');
  });
});
