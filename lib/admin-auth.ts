const ADMIN_COOKIE_NAME = "tq_admin_session";

function getEnvValue(key: string): string {
  const value = process.env[key];

  if (!value || !value.trim()) {
    throw new Error(`${key} is not configured in environment variables.`);
  }

  return value.trim();
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

export function getAdminUsername(): string {
  return getEnvValue("ADMIN_USERNAME");
}

export function getAdminPassword(): string {
  return getEnvValue("ADMIN_PASSWORD");
}

export function getAdminSessionSecret(): string {
  return getEnvValue("ADMIN_SESSION_SECRET");
}
