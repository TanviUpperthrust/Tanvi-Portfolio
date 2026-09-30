import crypto from 'node:crypto';

const COOKIE = 'admin_session';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  // Hash first so lengths always match and timingSafeEqual never throws.
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function createAuth(config) {
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.trustProxy, // behind HTTPS-terminating proxies in production
    path: '/',
  };

  function checkPassword(password) {
    return Boolean(config.adminPassword) && safeEqual(password ?? '', config.adminPassword);
  }

  function issue(res) {
    const expires = String(Date.now() + TTL_MS);
    res.cookie(COOKIE, `${expires}.${sign(expires, config.sessionSecret)}`, { ...cookieOpts, maxAge: TTL_MS });
  }

  function clear(res) {
    res.clearCookie(COOKIE, cookieOpts);
  }

  function isAuthed(req) {
    const token = readCookie(req, COOKIE);
    if (!token) return false;
    const [expires, sig] = token.split('.');
    if (!expires || !sig || !safeEqual(sig, sign(expires, config.sessionSecret))) return false;
    return Number(expires) > Date.now();
  }

  function requireAdmin(req, res, next) {
    if (!config.adminPassword) return res.status(503).json({ error: 'Admin is disabled. Set ADMIN_PASSWORD.' });
    if (!isAuthed(req)) return res.status(401).json({ error: 'Not signed in.' });
    next();
  }

  return { checkPassword, issue, clear, isAuthed, requireAdmin };
}
