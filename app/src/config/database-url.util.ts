function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function encodeURIComponentSafe(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function buildPostgresUrlFromParts(env: NodeJS.ProcessEnv): string {
  const host = env.POSTGRES_HOST ?? '127.0.0.1';
  const port = env.POSTGRES_PORT ?? '5432';
  const db = env.POSTGRES_DB ?? 'cyxcel-api';
  const user = env.POSTGRES_USER ?? 'postgres';
  const password = env.POSTGRES_PASSWORD ?? 'postgres';
  const schema = env.POSTGRES_SCHEMA ?? 'public';
  const ssl = isTruthy(env.POSTGRES_SSL);

  const auth =
    user || password
      ? `${encodeURIComponentSafe(user)}:${encodeURIComponentSafe(password)}@`
      : '';

  const url = new URL(`postgresql://${auth}${host}:${port}/${db}`);
  url.searchParams.set('schema', schema);
  if (ssl) url.searchParams.set('sslmode', 'require');
  return url.toString();
}

export type DatabaseUrlResolution = {
  url: string;
  /**
   * Human-readable source used for debugging/logging only.
   * Keep this free of secrets.
   */
  source:
    | 'DATABASE_URL'
    | 'DATABASE_URL_PROD'
    | 'DATABASE_URL_DEV'
    | 'POSTGRES_*';
};

/**
 * Resolve the runtime Prisma `DATABASE_URL` with explicit separation:
 * - Local dev: `DATABASE_URL_DEV` (or POSTGRES_* fallback)
 * - Vercel (preview/development): `DATABASE_URL`
 * - Production (future Aurora): `DATABASE_URL_PROD`
 *
 * Notes:
 * - On Vercel, prefer `VERCEL_ENV` (production/preview/development).
 * - In production-like environments, prefer `DATABASE_URL_PROD` to avoid
 *   accidentally pointing production at a non-production database.
 */
export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv,
): DatabaseUrlResolution {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isNodeProduction = nodeEnv === 'production';
  const isVercelRuntime = isTruthy(env.VERCEL);
  const vercelEnv = env.VERCEL_ENV;
  const isVercelProduction = vercelEnv === 'production';

  if (
    (isVercelProduction || (!isVercelRuntime && isNodeProduction)) &&
    env.DATABASE_URL_PROD
  ) {
    return { url: env.DATABASE_URL_PROD, source: 'DATABASE_URL_PROD' };
  }

  if (env.DATABASE_URL) {
    return { url: env.DATABASE_URL, source: 'DATABASE_URL' };
  }

  if (!isNodeProduction && env.DATABASE_URL_DEV) {
    return { url: env.DATABASE_URL_DEV, source: 'DATABASE_URL_DEV' };
  }

  return { url: buildPostgresUrlFromParts(env), source: 'POSTGRES_*' };
}
