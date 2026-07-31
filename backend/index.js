const express = require('express');
const crypto = require('crypto');
const storage=localStorage();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

const urls = new Map();

function generateCode() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

app.post('/api/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  let code = generateCode();
  while (urls.has(code)) code = generateCode();

  urls.set(code, { url, createdAt: new Date().toISOString() });

  res.json({ shortUrl: `http://localhost:${PORT}/${code}`, code });
});

app.get('/:code', (req, res) => {
  //storage.setItem()
  const entry = urls.get(req.params.code);
  
  if (!entry) return res.status(404).json({ error: 'URL not found' });
  res.redirect(entry.url);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
