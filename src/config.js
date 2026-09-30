import crypto from 'node:crypto';

const env = process.env;

export function loadConfig(overrides = {}) {
  const config = {
    port: Number(env.PORT) || 3000,
    databasePath: env.DATABASE_PATH || './data/portfolio.db',
    adminPassword: env.ADMIN_PASSWORD || '',
    sessionSecret: env.SESSION_SECRET || '',
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT) || 587,
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      from: env.MAIL_FROM || 'Portfolio <no-reply@tanvi.design>',
      to: env.MAIL_TO || 'hello@tanvi.design',
    },
    ...overrides,
  };

  if (!config.sessionSecret) {
    // Without a fixed secret, admin sessions just won't survive a restart.
    config.sessionSecret = crypto.randomBytes(32).toString('hex');
    if (config.adminPassword) {
      console.warn('[config] SESSION_SECRET not set; admin logins will reset on every restart.');
    }
  }
  if (!config.adminPassword) {
    console.warn('[config] ADMIN_PASSWORD not set; the admin panel is disabled.');
  }
  return config;
}
