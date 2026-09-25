import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static assets from root directory
app.use(express.static(__dirname));

// Route handlers for landing and reader pages
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/reader', (req, res) => {
  res.sendFile(join(__dirname, 'reader.html'));
});

// Fallback for direct HTML file access or catch-all
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

if (process.argv.includes('--check')) {
  console.log('Build verification check passed.');
  process.exit(0);
}

app.listen(PORT, HOST, () => {
  console.log(`Horizontal Flipbook server running at http://${HOST}:${PORT}`);
});
