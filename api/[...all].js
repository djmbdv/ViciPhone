import serverless from 'serverless-http';
import { createApp } from '../server/app.js';

const app = createApp();
const handler = serverless(app);

export default async function(req, res) {
  return handler(req, res);
}
