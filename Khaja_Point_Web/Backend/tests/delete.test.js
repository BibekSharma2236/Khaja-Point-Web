jest.mock('../src/model/userModel', () => ({
  deleteUser: jest.fn()
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
const { deleteUser } = require('../src/model/userModel');

describe('DELETE /api/delete/:id', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and delete user successfully', async () => {
    deleteUser.mockResolvedValue({ id: 1, name: 'John' });

    const res = await request(app).delete('/api/delete/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Deleted Successfully');
  });

  test('should call deleteUser with correct id', async () => {
    deleteUser.mockResolvedValue({ id: 5, name: 'Jane' });

    await request(app).delete('/api/delete/5');

    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith('5');
  });

  test('should return 404 if user does not exist', async () => {
    deleteUser.mockResolvedValue(null);

    const res = await request(app).delete('/api/delete/999');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  test('should return 500 if database fails', async () => {
    deleteUser.mockRejectedValue(new Error('DB error'));

    const res = await request(app).delete('/api/delete/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('unsuccessful');
  });

  test('should call deleteUser only once per request', async () => {
    deleteUser.mockResolvedValue({ id: 1 });

    await request(app).delete('/api/delete/1');

    expect(deleteUser).toHaveBeenCalledTimes(1);
  });
});
