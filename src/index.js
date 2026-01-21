import { createApp } from './app.js';
const app = createApp();
// if is running in vercer ignore listen
if (!process.env.VERCEL) {
  app.listen(port, () => {
  console.log(`VICIphone Node server listening on port ${port}`);
});
  
}


export default app;