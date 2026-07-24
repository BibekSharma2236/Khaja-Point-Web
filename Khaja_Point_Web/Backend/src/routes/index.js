const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, getAllUsers, getUserById, deleteUser, updateUser } = require('../model/userModel');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Khaja Point',
    service: 'api',
    timestamp: new Date().toISOString()
  });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'field empty' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, 'dev_secret_change_me');
    return res.status(200).json({ message: 'Login Successful', token, user });
  } catch (error) {
    return res.status(500).json({ message: 'unsuccessful' });
  }
});

router.get('/getall', async (req, res) => {
  try {
    const data = await getAllUsers();
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ message: 'unsuccessful' });
  }
});

router.get('/getuser/:id', async (req, res) => {
  try {
    const data = await getUserById(req.params.id);
    if (!data) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ message: 'unsuccessful' });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'Deleted Successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'unsuccessful' });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ message: 'field empty' });
    }

    let updatedUser = null;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updatedUser = await updateUser(req.params.id, { name, email, password: hashed });
    } else {
      updatedUser = await updateUser(req.params.id, { name, email });
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Updated Successfully', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: 'unsuccessful' });
  }
});

router.use('/auth', require('./auth'));
router.use('/menu', require('./menu'));
router.use('/orders', require('./orders'));
router.use('/admin/orders', require('./adminOrders'));
router.use('/', require('./esewa'));
router.get('/pay/esewa/callback', (req, res) => res.status(501).json({ error: 'Esewa callback not implemented in mock mode. Use /pay/esewa/mock instead.' }));

module.exports = router;




