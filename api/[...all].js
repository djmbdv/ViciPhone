import { createApp } from '../server/app.js';

// Single app instance reused across invocations
const app = createApp();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // Strip the /api prefix so Express routes match (/viciphone, /vp_interpreter, etc.)
  if (req.url && req.url.startsWith('/api')) {
    req.url = req.url.substring(4) || '/';
  }
  return app(req, res);
}
import serverless from 'serverless-http';
import { createApp } from '../server/app.js';

const app = createApp();
const handler = serverless(app);

export default async function(req, res) {
  return handler(req, res);
}
