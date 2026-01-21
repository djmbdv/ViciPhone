import { createApp } from '../server/app.js';

// Reuse a single Express app instance across invocations
const app = createApp();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // Strip the /api prefix so the Express routes match
  if (req.url && req.url.startsWith('/api')) {
    req.url = req.url.substring(4) || '/';
  }
  return app(req, res);
}
