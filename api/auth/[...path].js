/*
  Auth proxy
  ----------
  Safari (and iOS browsers generally) refuse to send cookies on cross-site
  requests. Neon's auth service lives on a different domain, so a session
  created there is invisible to fetch() calls from our site — you sign in
  successfully and the app still thinks you're a stranger.

  This function forwards /api/auth/* to the Neon auth service from the
  server side and rewrites the Set-Cookie headers so the session cookie
  belongs to OUR domain. Same origin, so the browser keeps it and sends it
  back every time.

  Note: the base URL below is a public client endpoint, not a secret.
*/

const UPSTREAM =
  process.env.NEON_AUTH_BASE_URL ||
  'https://ep-bitter-fog-ae1yr8y3.neonauth.c-2.us-east-2.aws.neon.tech/neondb/auth';

// Headers we should not blindly copy in either direction.
const SKIP_REQUEST = ['host', 'connection', 'content-length', 'accept-encoding'];
const SKIP_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];

function siteOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

// Strip Domain= so the cookie is scoped to this site instead of Neon's.
function rewriteCookie(cookie) {
  return cookie
    .split(';')
    .filter((part) => !/^\s*domain=/i.test(part))
    .join(';');
}

function readSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

export default async function handler(req, res) {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);

  // Preserve any query string (?provider=... etc).
  const queryIndex = req.url.indexOf('?');
  const search = queryIndex === -1 ? '' : req.url.slice(queryIndex);

  const target = `${UPSTREAM}/${segments.join('/')}${search}`;

  // Forward request headers, but present our own site as the Origin so the
  // upstream CSRF check sees a trusted origin.
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIP_REQUEST.includes(key.toLowerCase())) continue;
    if (typeof value === 'string') headers[key] = value;
  }
  headers.origin = siteOrigin(req);
  delete headers.referer;

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body === undefined || req.body === null) body = undefined;
    else if (typeof req.body === 'string') body = req.body;
    else if (Buffer.isBuffer(req.body)) body = req.body;
    else {
      body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual'
    });

    const cookies = readSetCookies(upstream).map(rewriteCookie);
    if (cookies.length) res.setHeader('Set-Cookie', cookies);

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'set-cookie' || SKIP_RESPONSE.includes(lower)) return;
      res.setHeader(key, value);
    });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    res.status(502).json({ message: 'Could not reach the sign-in service. Try again.' });
  }
}
