import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDatabaseUrl } from './database-url.util';

function readPackageVersion(): string {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export default () => ({
  // Resolve once so url + source are consistent
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  ...((): Record<string, unknown> => {
    const db = resolveDatabaseUrl(process.env);
    return {
      database: {
        url: db.url,
        urlSource: db.source,
        host: process.env.POSTGRES_HOST ?? '127.0.0.1',
        port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
        name: process.env.POSTGRES_DB ?? 'cyxcel-api',
        user: process.env.POSTGRES_USER ?? 'postgres',
        password: process.env.POSTGRES_PASSWORD ?? 'postgres',
        schema: process.env.POSTGRES_SCHEMA ?? 'public',
        ssl: (process.env.POSTGRES_SSL ?? 'false').toLowerCase() === 'true',
        logging:
          (process.env.POSTGRES_LOGGING ?? 'false').toLowerCase() === 'true',
      },
    };
  })(),
  app: {
    name: process.env.APP_NAME ?? 'cyxcel-api',
    env: process.env.NODE_ENV ?? 'development',
    // Bind to explicit PORT or default 3000. Do not infer from VIRTUAL_PORT.
    port: parseInt(process.env.PORT ?? '3010', 10),
    version: process.env.APP_VERSION ?? readPackageVersion(),
  },
  site: {
    url: process.env.SITE_URL ?? '',
  },
  postman: {
    apiKey: process.env.POSTMAN_API_KEY ?? '',
    enabled: process.env.NODE_ENV !== 'production',
  },
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY ?? '',
  },
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : ['http://localhost:3000', 'https://admin.cyxcel-dev.poppins.dev'],
  },
});
