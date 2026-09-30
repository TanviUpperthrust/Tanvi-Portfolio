// Fixed-window, in-memory rate limiter. Fine for a single-process portfolio site;
// swap for a shared store if this ever runs on more than one instance.
export function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs);
  sweep.unref();

  return function limiter(req, res, next) {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
