import bcrypt from "bcryptjs";

const passwordRounds = 10;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, passwordRounds);
}

export async function verifyPassword(password: string, expectedHash: string) {
  if (!isBcryptHash(expectedHash)) return false;
  return bcrypt.compare(password, expectedHash);
}

export function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}
