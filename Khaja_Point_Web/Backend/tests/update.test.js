jest.mock('../src/model/userModel', () => ({
  updateUser: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn()
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
const bcrypt = require('bcryptjs');
const { updateUser } = require('../src/model/userModel');

describe('PUT /api/update/:id', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and update user successfully', async () => {
    const mockUpdatedUser = {
      id: 1,
      name: 'John Updated',
      email: 'john@example.com',
      image: null
    };
    updateUser.mockResolvedValue(mockUpdatedUser);

    const res = await request(app).put('/api/update/1').send({
      name: 'John Updated',
      email: 'john@example.com'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Updated Successfully');
    expect(res.body.user.name).toBe('John Updated');
  });

  test('should return 200 and hash password when password is provided', async () => {
    const mockUpdatedUser = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
      password: 'newHashedPassword'
    };
    bcrypt.hash.mockResolvedValue('newHashedPassword');
    updateUser.mockResolvedValue(mockUpdatedUser);

    const res = await request(app).put('/api/update/1').send({
      name: 'John',
      email: 'john@example.com',
      password: 'newpassword123'
    });

    expect(res.statusCode).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    expect(res.body.user.password).toBe('newHashedPassword');
  });

  test('should return 400 if name is missing', async () => {
    const res = await request(app).put('/api/update/1').send({ email: 'john@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('field empty');
  });

  test('should return 400 if email is missing', async () => {
    const res = await request(app).put('/api/update/1').send({ name: 'John' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('field empty');
  });

  test('should return 404 if user does not exist', async () => {
    updateUser.mockResolvedValue(null);

    const res = await request(app).put('/api/update/999').send({
      name: 'John',
      email: 'john@example.com'
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  test('should return 500 if database fails', async () => {
    updateUser.mockRejectedValue(new Error('DB error'));

    const res = await request(app).put('/api/update/1').send({
      name: 'John',
      email: 'john@example.com'
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('unsuccessful');
  });

  test('should return 500 if bcrypt fails during update', async () => {
    bcrypt.hash.mockRejectedValue(new Error('hash error'));

    const res = await request(app).put('/api/update/1').send({
      name: 'John',
      email: 'john@example.com',
      password: 'newpassword123'
    });

    expect(res.statusCode).toBe(500);
  });

  test('should call updateUser with correct id', async () => {
    updateUser.mockResolvedValue({ id: 3, name: 'Jane' });

    await request(app).put('/api/update/3').send({
      name: 'Jane',
      email: 'jane@example.com'
    });

    expect(updateUser).toHaveBeenCalledTimes(1);
  });
});
