const { Server } = require('socket.io');

let io = null;

function attachSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    socket.on('order:join', (payload) => {
      const orderId = payload?.orderId;
      if (!orderId) return;
      socket.join(`order:${orderId}`);
    });

    socket.on('order:leave', (payload) => {
      const orderId = payload?.orderId;
      if (!orderId) return;
      socket.leave(`order:${orderId}`);
    });
  });

  return io;
}

function emitOrderUpdate(payload) {
  if (!io || !payload?.orderId) return;
  io.to(`order:${payload.orderId}`).emit('order:updated', payload);
}

function emitCourierLocation(payload) {
  if (!io || !payload?.orderId) return;
  io.to(`order:${payload.orderId}`).emit('courier:location', payload);
}

module.exports = {
  attachSocket,
  emitOrderUpdate,
  emitCourierLocation
};

