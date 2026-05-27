import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Express, type Request, type Response } from 'express';
import { createNestApp } from '../src/bootstrap/create-nest-app';

let cachedExpressApp: Express | null = null;
let bootstrapPromise: Promise<Express> | null = null;

async function getServer(): Promise<Express> {
  if (cachedExpressApp) return cachedExpressApp;
  if (bootstrapPromise !== null) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const expressApp = express();
    const nestApp = await createNestApp({ expressApp });

    // Ensure we return the underlying Express app (callable request handler),
    // not the Nest application wrapper.
    const instance = nestApp.getHttpAdapter().getInstance() as Express;
    cachedExpressApp = instance;
    return instance;
  })();

  return bootstrapPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await getServer();
  server(req as unknown as Request, res as unknown as Response);
}
