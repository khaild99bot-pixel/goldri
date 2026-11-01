/**
 * GOLDRIX Enterprise Security & Anti-Intrusion Engine
 * - Cryptographic HMAC-SHA256 Signed Session Tokens (bound to password hash & expiry)
 * - Constant-time signature verification (crypto.timingSafeEqual)
 * - Brute-Force & Credential Stuffing Guard (IP + Identifier lockout)
 * - Sliding-Window Rate Limiter (Global, Auth, and Financial endpoints)
 * - Per-User Atomic Financial Mutex Lock (Anti-Race Condition / Anti-Double-Spend)
 * - Deep Request Sanitizer (Anti-XSS, Anti-Prototype Pollution, Anti-Injection)
 * - Enterprise HTTP Security Headers
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Persistent 256-bit cryptographic signing key derived from environment or installation salt
const RawSecret =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  'goldrix_institutional_hmac_sha256_vault_key_2026_v2_secure';

const HMAC_SECRET_KEY = crypto
  .createHash('sha256')
  .update(RawSecret)
  .digest();

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SignedTokenUserMeta {
  email?: string;
  fullName?: string;
  phone?: string;
  country?: string;
  countryCode?: string;
  dialCode?: string;
  referralCode?: string;
  referredBy?: string;
  createdAt?: string;
  kycStatus?: string;
  passwordHash?: string;
  salt?: string;
}

export interface SignedTokenPayload {
  uid: string;
  role: string;
  ph: string; // 12-char prefix of passwordHash to auto-revoke on password change
  iat: number;
  exp: number;
  meta?: SignedTokenUserMeta;
}

/**
 * Generates a cryptographically signed session token: grd.<base64urlPayload>.<base64urlSignature>
 */
export function createSignedSessionToken(
  userId: string,
  role: string,
  passwordHash: string,
  meta?: SignedTokenUserMeta
): string {
  const now = Date.now();
  const payload: SignedTokenPayload = {
    uid: userId,
    role,
    ph: (passwordHash || '').slice(0, 12),
    iat: now,
    exp: now + TOKEN_TTL_MS,
    ...(meta ? { meta } : {}),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signatureB64 = crypto
    .createHmac('sha256', HMAC_SECRET_KEY)
    .update(payloadB64)
    .digest('base64url');

  return `grd.${payloadB64}.${signatureB64}`;
}

/**
 * Verifies a signed session token using constant-time comparison
 */
export function verifySignedSessionToken(token: string): SignedTokenPayload | null {
  try {
    if (!token || !token.startsWith('grd.')) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [, payloadB64, providedSigB64] = parts;
    const expectedSigBuf = crypto
      .createHmac('sha256', HMAC_SECRET_KEY)
      .update(payloadB64)
      .digest();
    const providedSigBuf = Buffer.from(providedSigB64, 'base64url');

    if (
      expectedSigBuf.length !== providedSigBuf.length ||
      !crypto.timingSafeEqual(expectedSigBuf, providedSigBuf)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as SignedTokenPayload;

    if (!decoded || !decoded.uid || typeof decoded.exp !== 'number') {
      return null;
    }

    if (Date.now() > decoded.exp) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Constant-time password hash comparison to prevent timing attacks
 */
export function verifyPasswordTimingSafe(computedHash: string, storedHash: string): boolean {
  try {
    const a = Buffer.from(computedHash, 'utf8');
    const b = Buffer.from(storedHash, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Brute-Force Login Guard (IP + Identifier)
// ---------------------------------------------------------------------------
interface LoginAttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();
const MAX_LOGIN_ATTEMPTS = 6;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes lockout

export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function checkLoginBruteForce(
  req: Request,
  identifier: string
): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `${getClientIp(req)}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  if (now - record.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(req: Request, identifier: string): void {
  const key = `${getClientIp(req)}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (!existing || now - existing.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, {
      count: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    });
    return;
  }

  existing.count += 1;
  if (existing.count >= MAX_LOGIN_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(key, existing);
}

export function clearLoginAttempts(req: Request, identifier: string): void {
  const key = `${getClientIp(req)}:${identifier.toLowerCase().trim()}`;
  loginAttempts.delete(key);
}

// ---------------------------------------------------------------------------
// Per-User Atomic Financial Mutex Lock (Anti-Race Condition / Anti-Double-Spend)
// ---------------------------------------------------------------------------
const activeFinancialLocks = new Set<string>();

export function withFinancialLock(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const lockKey = `fin_lock_${user.id}`;
  if (activeFinancialLocks.has(lockKey)) {
    return res.status(429).json({
      error: 'توجد عملية مالية قيد التنفيذ حالياً، يرجى الانتظار لحظة',
    });
  }

  activeFinancialLocks.add(lockKey);

  const release = () => {
    activeFinancialLocks.delete(lockKey);
  };

  res.on('finish', release);
  res.on('close', release);
  next();
}

// ---------------------------------------------------------------------------
// Sliding-Window Rate Limiter Middleware
// ---------------------------------------------------------------------------
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function createRateLimiter(options: {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  errorMessageAr?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.maxRequests) {
      const retrySecs = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retrySecs));
      return res.status(429).json({
        error:
          options.errorMessageAr ||
          `تم تجاوز الحد المسموح للطلبات، يرجى المحاولة بعد ${retrySecs} ثانية`,
      });
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Deep Request Sanitizer (Anti-Prototype Pollution & Anti-XSS)
// ---------------------------------------------------------------------------
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeStringValue(val: string, keyName: string): string {
  // Fast-path legitimate data URLs for KYC & Avatar images without running full-string regexes on multi-KB/MB base64 strings
  const trimmed = val.trim();
  if (
    trimmed.startsWith('data:') &&
    (keyName.toLowerCase().includes('dataurl') ||
      keyName === 'avatarUrl' ||
      /^data:(image\/[a-z0-9.+-]+|application\/pdf);base64,/i.test(trimmed.slice(0, 64)))
  ) {
    return trimmed;
  }

  return val
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|applet|meta|link|style)[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/on(error|load|click|mouseover|focus|blur|submit)\s*=/gi, '');
}

function sanitizeObjectDeep(input: any, depth = 0): any {
  if (depth > 8 || input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeStringValue(input, '');
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObjectDeep(item, depth + 1));
  }

  if (typeof input === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (DANGEROUS_KEYS.has(key)) {
        continue; // Block Prototype Pollution
      }
      if (typeof value === 'string') {
        cleaned[key] = sanitizeStringValue(value, key);
      } else {
        cleaned[key] = sanitizeObjectDeep(value, depth + 1);
      }
    }
    return cleaned;
  }

  return input;
}

export function securitySanitizerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObjectDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (DANGEROUS_KEYS.has(key)) {
        delete (req.query as any)[key];
      } else if (typeof req.query[key] === 'string') {
        (req.query as any)[key] = sanitizeStringValue(req.query[key] as string, key);
      }
    }
  }
  next();
}

// ---------------------------------------------------------------------------
// Enterprise HTTP Security Headers Middleware
// ---------------------------------------------------------------------------
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  next();
}

/**
 * Validates that a financial amount is a clean, finite positive number within safe bounds
 */
export function isValidFinancialAmount(
  amount: any,
  min = 0.01,
  max = 10000000
): boolean {
  if (amount === null || amount === undefined || amount === '') return false;
  const str = String(amount).trim();
  if (!/^\d+(\.\d{1,8})?$/.test(str)) return false;
  const num = Number(str);
  return Number.isFinite(num) && num >= min && num <= max;
}
