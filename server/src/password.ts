import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt is built into Node and memory-hard, so GPU brute force is expensive. Stored as "salt:hash" (hex).
const scryptAsync = promisify(scrypt) as (
  pw: string,
  salt: Buffer,
  len: number,
) => Promise<Buffer>;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false; // e.g. seed rows with a placeholder hash
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  );
  // Constant-time compare, so response time doesn't leak how many bytes matched.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
