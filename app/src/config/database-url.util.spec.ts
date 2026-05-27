import { resolveDatabaseUrl } from './database-url.util';

describe('resolveDatabaseUrl', () => {
  it('uses DATABASE_URL on Vercel preview/development', () => {
    const result = resolveDatabaseUrl({
      VERCEL: '1',
      VERCEL_ENV: 'preview',
      DATABASE_URL: 'postgresql://nonprod.example/db',
    });
    expect(result).toEqual({
      url: 'postgresql://nonprod.example/db',
      source: 'DATABASE_URL',
    });
  });

  it('uses DATABASE_URL_PROD on Vercel production', () => {
    const result = resolveDatabaseUrl({
      VERCEL: '1',
      VERCEL_ENV: 'production',
      DATABASE_URL: 'postgresql://nonprod.example/db',
      DATABASE_URL_PROD: 'postgresql://prod.example/db',
    });
    expect(result).toEqual({
      url: 'postgresql://prod.example/db',
      source: 'DATABASE_URL_PROD',
    });
  });

  it('falls back to DATABASE_URL_DEV when not on Vercel and not production', () => {
    const result = resolveDatabaseUrl({
      NODE_ENV: 'development',
      DATABASE_URL_DEV: 'postgresql://local.example/db',
    });
    expect(result).toEqual({
      url: 'postgresql://local.example/db',
      source: 'DATABASE_URL_DEV',
    });
  });

  it('builds a URL from POSTGRES_* parts as final fallback', () => {
    const result = resolveDatabaseUrl({
      NODE_ENV: 'development',
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'mydb',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_SCHEMA: 'public',
      POSTGRES_SSL: 'false',
    });
    expect(result.source).toBe('POSTGRES_*');
    expect(result.url).toContain('postgresql://');
    expect(result.url).toContain('/mydb');
    expect(result.url).toContain('schema=public');
  });
});
