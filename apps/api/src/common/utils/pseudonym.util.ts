// src/common/utils/pseudonym.util.ts
import * as crypto from 'crypto';

export function pseudonymizeUsername(username: string): string {
  if (!username) return '';
  const secret = process.env.PSEUDONYM_SECRET_KEY || 'fallback_secret_key';
  return crypto
    .createHmac('sha256', secret)
    .update(username.trim().toLowerCase())
    .digest('hex');
}