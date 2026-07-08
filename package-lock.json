// Simple single-password gate.
// Set APP_PASSWORD in Vercel env vars. The client posts it once to
// /api/login; on success we set a signed cookie that the API checks.
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE = 'note_auth';

// Secret for signing the cookie. Falls back to the password itself so it
// still works if you only set APP_PASSWORD, but setting AUTH_SECRET too is
// slightly better.
function secret() {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || 'change-me';
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

// The token we store: a fixed marker plus its signature.
export function makeToken() {
  const marker = 'ok';
  return `${marker}.${sign(marker)}`;
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function tokenValid(token) {
  if (!token || !token.includes('.')) return false;
  const [marker, sig] = token.split('.');
  return marker === 'ok' && safeEqual(sig, sign('ok'));
}

export function readCookie(req) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  return found ? decodeURIComponent(found.split('=').slice(1).join('=')) : '';
}

export function setAuthCookie(res) {
  const token = makeToken();
  // 180 days, HttpOnly, Secure, SameSite=Lax
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 180}; HttpOnly; Secure; SameSite=Lax`);
}

export function passwordMatches(input) {
  const expected = process.env.APP_PASSWORD || '';
  if (!expected) return false;               // no password set = locked out on purpose
  if (typeof input !== 'string') return false;
  return safeEqual(input, expected);
}

// Guard for protected endpoints. Returns true if the request is authorized.
// If not, it writes a 401 and returns false.
export function requireAuth(req, res) {
  // If no password is configured at all, treat the app as open (single-user
  // local/dev convenience). Set APP_PASSWORD in Vercel to lock it down.
  if (!process.env.APP_PASSWORD) return true;
  if (tokenValid(readCookie(req))) return true;
  res.status(401).json({ error: 'Not authorized' });
  return false;
}
