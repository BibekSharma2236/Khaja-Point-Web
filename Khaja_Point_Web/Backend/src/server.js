const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Khaja Point',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

// Init DB + routes
const { initDb } = require('./db/db');
app.use('/api', require('./routes'));

const PORT = process.env.PORT || 3001;

const { attachSocket } = require('./socket');
attachSocket(server);

function startServer() {
  initDb()
    .then(() => {
      server.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Khaja Point backend listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('DB init failed:', err);
      process.exit(1);
    });
}

if (require.main === module) {
  startServer();
}

module.exports = app;

