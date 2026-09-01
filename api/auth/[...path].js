/*
  Auth proxy
  ----------
  iOS Safari refuses to send cookies on cross-site requests. Neon's auth
  service lives on another domain, so a session created there is invisible
  to our page: you sign in fine and the app still sees a stranger.

  This route forwards /api/auth/* to Neon from the server side and does two
  things so the session always survives:

    1. Rewrites Set-Cookie so the session cookie belongs to OUR domain
       (first-party cookies are kept by every browser).
    2. Hands the session back in an `x-mf-session` response header. The page
       stores that in localStorage and returns it on later requests via the
       `x-mf-session` request header, which this route replays upstream as a
       Cookie. Works even when cookies are blocked outright.

  The upstream base URL is a public client endpoint, not a secret.
*/

const UPSTREAM =
  process.env.NEON_AUTH_BASE_URL ||
  'https://ep-bitter-fog-ae1yr8y3.neonauth.c-2.us-east-2.aws.neon.tech/neondb/auth';

const SKIP_REQUEST = ['host', 'connection', 'content-length', 'accept-encoding', 'x-mf-session'];
const SKIP_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];

function siteOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

// Drop Domain= so the cookie is scoped to this site rather than Neon's.
function rewriteCookie(cookie) {
  return cookie
    .split(';')
    .filter((part) => !/^\s*domain=/i.test(part))
    .join(';');
}

// "name=value; Path=/; HttpOnly" -> "name=value"
function pair(cookie) {
  return cookie.split(';')[0].trim();
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

  const queryIndex = req.url.indexOf('?');
  const search = queryIndex === -1 ? '' : req.url.slice(queryIndex);
  const target = `${UPSTREAM}/${segments.join('/')}${search}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIP_REQUEST.includes(key.toLowerCase())) continue;
    if (typeof value === 'string') headers[key] = value;
  }

  // Present our own site as the Origin so the upstream CSRF check passes.
  headers.origin = siteOrigin(req);
  delete headers.referer;

  // Replay a session the page is holding for us.
  const carried = req.headers['x-mf-session'];
  if (carried) {
    headers.cookie = headers.cookie ? `${headers.cookie}; ${carried}` : carried;
  }

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

    const cookies = readSetCookies(upstream);

    if (cookies.length) {
      res.setHeader('Set-Cookie', cookies.map(rewriteCookie));

      // Give the page a copy it can hold itself.
      const session = cookies
        .map(pair)
        .filter((c) => c && !/=(deleted|;|$)/i.test(c))
        .join('; ');
      if (session) res.setHeader('x-mf-session', session);
    }

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
