export function generateCuid(): string {
  return 'c' + Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const maskedUser = user.substring(0, 2) + '***';
  return `${maskedUser}@${domain}`;
}
