const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

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

app.use('/api', require('./routes'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Khaja Point backend listening on http://localhost:${PORT}`);
});

