import 'dotenv/config';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.JWT_SECRET || !process.env.DATABASE_URL)) {
  throw new Error('Missing required environment variables: JWT_SECRET, DATABASE_URL');
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',

  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/bibliotech',
  },

  redis: {
    url: process.env.REDIS_URL ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? (isProduction ? undefined : 'dev-secret-do-not-use-in-prod')!,
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? (isProduction ? undefined : 'dev-refresh-secret-do-not-use-in-prod')!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? 'noreply@bibliotech.com',
    pass: process.env.SMTP_PASS ?? 'smtp-password',
    from: process.env.EMAIL_FROM ?? 'Bibliotech Premium <noreply@bibliotech.com>',
  },

  fcm: {
    serverKey: process.env.FCM_SERVER_KEY ?? '',
  },

  webPush: {
    vapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? '',
    vapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? '',
  },

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  paths: {
    root: resolve(import.meta.dirname, '..'),
    src: resolve(import.meta.dirname, '..', 'src'),
  },
} as const;

export type Config = typeof config;
