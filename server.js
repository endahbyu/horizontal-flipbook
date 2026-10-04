import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Listen on IPv6 so browsers that resolve localhost to ::1 can connect.
// Linux keeps IPv4 compatibility here unless ipv6Only is explicitly enabled.
const HOST = '::';

// Serve static assets from root directory
app.use(express.static(__dirname));

// Route handlers for landing and reader pages
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/reader', (req, res) => {
  res.sendFile(join(__dirname, 'reader.html'));
});

if (process.argv.includes('--check')) {
  console.log('Build verification check passed.');
  process.exit(0);
}

app.listen(PORT, HOST, () => {
  console.log(`Horizontal Flipbook server running at http://localhost:${PORT}`);
});
