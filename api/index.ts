import { createApiApp } from '../src/server/createApiApp.js';

// Vercel Serverless Function entry point for /api/* and static HTML legal routes
const app = createApiApp();

export default app;
