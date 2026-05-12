import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class EncryptionService implements OnModuleInit {
  private key!: Buffer;

  onModuleInit() {
    const hex = process.env.MARKETPLACE_ENCRYPTION_KEY;
    if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error(
        'MARKETPLACE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // layout: iv(12) | tag(16) | ciphertext(n)
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(blob: string): string {
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const encrypted = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  }

  mask(blob: string): string {
    try {
      const plaintext = this.decrypt(blob);
      return plaintext.slice(0, 4) + '***';
    } catch {
      return '****';
    }
  }
}
