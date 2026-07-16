import { createHmac, timingSafeEqual } from "node:crypto";

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, lowercase letter, and number";

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "At least 8 characters required";
  if (!/[A-Z]/.test(password)) return "One uppercase letter required";
  if (!/[a-z]/.test(password)) return "One lowercase letter required";
  if (!/[0-9]/.test(password)) return "One number required";
  return null;
}

export function createPasswordFingerprint(
  passwordHash: string,
  jwtSecret: string,
): string {
  return createHmac("sha256", jwtSecret).update(passwordHash).digest("hex");
}

export function passwordFingerprintMatches(
  expected: string,
  passwordHash: string,
  jwtSecret: string,
): boolean {
  const actual = createPasswordFingerprint(passwordHash, jwtSecret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
