import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Express, type Request, type Response } from 'express';
import { createNestApp } from '../src/bootstrap/create-nest-app';

let cachedExpressApp: Express | null = null;
let bootstrapPromise: Promise<Express> | null = null;

async function getServer(): Promise<Express> {
  if (cachedExpressApp) return cachedExpressApp;
  if (bootstrapPromise !== null) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const expressApp = express();
      console.log('CREATE NEST APP START');
      const nestApp = await createNestApp({ expressApp });

      const instance = nestApp.getHttpAdapter().getInstance() as Express;
      cachedExpressApp = instance;
      return instance;
    } catch (error) {
      bootstrapPromise = null;
      throw error;
    }
  })();

  return bootstrapPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const server = await getServer();
    return server(req as unknown as Request, res as unknown as Response);
  } catch (error) {
    console.error('Failed to bootstrap serverless Nest app:', error);
    res.status(500).json({
      error: 'Server failed to initialize',
    });
  }
}
