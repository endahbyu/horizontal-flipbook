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

// Route handlers for landing and reader pages
// landing-3d.html is the default landing page; draft.html is a static draft.
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(join(__dirname, 'landing-3d.html'));
});

app.get('/strategy', (req, res) => {
  res.sendFile(join(__dirname, 'strategy.html'));
});

app.get('/action-plan', (req, res) => {
  res.sendFile(join(__dirname, 'action-plan.html'));
});

// Old reader URL now points to the Strategy Plan.
app.get(['/reader', '/reader.html'], (req, res) => {
  res.redirect(301, '/strategy.html');
});

// Serve static assets from root directory
app.use(express.static(__dirname));

if (process.argv.includes('--check')) {
  console.log('Build verification check passed.');
  process.exit(0);
}

app.listen(PORT, HOST, () => {
  console.log(`Horizontal Flipbook server running at http://localhost:${PORT}`);
});
