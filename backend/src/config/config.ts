import { prisma } from './database.js';

const DEFAULT_CONFIG: Record<string, number | string | boolean> = {
  MAX_ACTIVE_LOANS: 5,
  DEFAULT_LOAN_DAYS: 14,
  DEFAULT_MAX_RENEWALS: 2,
  DEFAULT_RENEWAL_DAYS: 7,
  READY_RESERVATION_DAYS: 2,
  WAITING_RESERVATION_DAYS: 30,
  MAX_RESERVATIONS_PER_COPY: 50,
  OVERDUE_GRACE_DAYS: 1,
  FINE_CAP: 100,
};

export async function getConfig<T extends number | string | boolean>(
  key: string,
  defaultValue?: T
): Promise<T> {
  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });

  if (!config) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    if (defaultValue === undefined && key in DEFAULT_CONFIG) {
      return DEFAULT_CONFIG[key] as T;
    }
    throw new Error(`Configuration key "${key}" not found and no default provided`);
  }

  const value = config.value;

  if (typeof defaultValue === 'number') {
    return Number(value) as T;
  }
  if (typeof defaultValue === 'boolean') {
    return (value === 'true') as T;
  }
  return value as T;
}

export async function setConfig(key: string, value: string | number | boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export async function initializeDefaultConfig(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await setConfig(key, value);
  }
}