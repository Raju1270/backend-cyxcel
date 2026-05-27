import Joi from 'joi';

export const validationSchema = Joi.object({
  // Vercel runtime flags (used for fail-fast DB validation)
  VERCEL: Joi.boolean()
    .truthy('true', '1', 'yes', 'on')
    .falsy('false', '0', 'no', 'off')
    .optional(),
  VERCEL_ENV: Joi.string()
    .valid('production', 'preview', 'development')
    .optional(),

  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_NAME: Joi.string().default('cyxcel-api'),
  PORT: Joi.number().port().default(3000),
  APP_VERSION: Joi.string().optional(),

  /**
   * Prisma reads `DATABASE_URL` by default. We keep this optional so
   * local/dev can continue to use POSTGRES_* parts, and production DB
   * variables can be introduced later without constraining deploys today.
   */
  DATABASE_URL: Joi.string().when('VERCEL', {
    is: true,
    then: Joi.string().when('VERCEL_ENV', {
      is: 'production',
      then: Joi.string().optional(),
      otherwise: Joi.string().required(),
    }),
    otherwise: Joi.string().optional(),
  }),
  DATABASE_URL_PROD: Joi.string().when('VERCEL', {
    is: true,
    then: Joi.string().when('VERCEL_ENV', {
      is: 'production',
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
    otherwise: Joi.string().optional(),
  }),
  DATABASE_URL_DEV: Joi.string().optional(),

  POSTGRES_HOST: Joi.string().default('127.0.0.1'),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_DB: Joi.string().default('cyxcel-api'),
  POSTGRES_USER: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().allow('').default('postgres'),
  POSTGRES_SCHEMA: Joi.string().default('public'),
  POSTGRES_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  POSTGRES_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),

  SITE_URL: Joi.string()
    .uri({ allowRelative: false })
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().required(),
      otherwise: Joi.string().default('http://localhost:3010'),
    }),

  // CORS
  CORS_ORIGINS: Joi.string().optional(),

  // Clerk
  CLERK_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
});
