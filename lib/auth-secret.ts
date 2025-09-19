const authSecret = process.env.NEXTAUTH_SECRET;

if (!authSecret) {
  throw new Error('NEXTAUTH_SECRET is not configured. Set NEXTAUTH_SECRET in your environment before starting the app.');
}

export function getAuthSecret() {
  return authSecret;
}
