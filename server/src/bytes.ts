// Bytes travel in JSON as base64url (no padding), the same as the client.

export const base64urlPattern = '^[A-Za-z0-9_-]*$';

export function fromBase64url(text: string): Buffer {
  return Buffer.from(text, 'base64url');
}

export function toBase64url(bytes: Buffer | Uint8Array | null): string | null {
  return bytes ? Buffer.from(bytes).toString('base64url') : null;
}

export const uuidSchema = { type: 'string', format: 'uuid' } as const;
export const bytesSchema = (maxBytes: number) =>
  ({ type: 'string', pattern: base64urlPattern, maxLength: Math.ceil((maxBytes * 4) / 3) + 4 }) as const;
