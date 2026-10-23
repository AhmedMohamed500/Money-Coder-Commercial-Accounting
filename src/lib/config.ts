export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}
