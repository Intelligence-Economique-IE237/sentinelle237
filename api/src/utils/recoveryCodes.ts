import crypto from "crypto";
import { hashToken } from "./crypto";

const RECOVERY_CODE_COUNT = 10;

// Format lisible et facile à retaper : XXXX-XXXX (8 caractères alphanumériques)
function generateOneCode(): string {
  const raw = crypto.randomBytes(6).toString("hex").toUpperCase().slice(0, 8);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function generateRecoveryCodes(): { raw: string; hash: string }[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = generateOneCode();
    return { raw, hash: hashToken(raw) };
  });
}

export function isRecoveryCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}