// /api/login
//   POST { password }  -> sets auth cookie on success
//   GET                -> reports whether a password is required / already in
import { passwordMatches, setAuthCookie, tokenValid, readCookie } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const required = Boolean(process.env.APP_PASSWORD);
    const authed = !required || tokenValid(readCookie(req));
    return res.status(200).json({ required, authed });
  }

  if (req.method === 'POST') {
    const { password } = req.body || {};
    if (!process.env.APP_PASSWORD) {
      // No gate configured; nothing to log into.
      return res.status(200).json({ authed: true });
    }
    if (passwordMatches(password)) {
      setAuthCookie(res);
      return res.status(200).json({ authed: true });
    }
    return res.status(401).json({ error: 'Wrong password' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
