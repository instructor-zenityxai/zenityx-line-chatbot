import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export function verifyLineSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) return false;
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody;
  const expected = crypto
    .createHmac('sha256', env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader),
    );
  } catch {
    return false;
  }
}
