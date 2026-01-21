import { createApp } from './app.js';
const app = createApp();
app.listen(port, () => {
  console.log(`VICIphone Node server listening on port ${port}`);
});

export default app;