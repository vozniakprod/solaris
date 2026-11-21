import { createApiApp } from './createApiApp.js';

// Source entry point bundled into api/index.mjs by esbuild during `npm run build`
const app = createApiApp();

export default app;
