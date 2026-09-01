// MindForge health check
//
// Visit /api/health on the deployed site to see, in one glance, whether
// the database is reachable and how much content is in it.
//
// Deliberately returns no secrets — just counts and a status flag.

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      ok: false,
      database: 'not configured',
      hint: 'Add DATABASE_URL in Vercel > Settings > Environment Variables, then redeploy.'
    });
  }

  const started = Date.now();

  try {
    const sql = neon(process.env.DATABASE_URL);

    const [counts] = await sql`
      SELECT
        (SELECT count(*) FROM quotes)                          AS quotes,
        (SELECT count(*) FROM essays)                          AS essays,
        (SELECT count(*) FROM power_laws)                      AS power_laws,
        (SELECT count(*) FROM quotes WHERE 'movies' = ANY(themes)) AS movie_quotes
    `;

    // Is Managed Better Auth set up on this branch?
    const [auth] = await sql`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'neon_auth' AND table_name = 'user'
        ) AS enabled
    `;

    let signedUpUsers = null;
    if (auth.enabled) {
      const [u] = await sql`SELECT count(*) AS n FROM neon_auth."user"`;
      signedUpUsers = Number(u.n);
    }

    res.status(200).json({
      ok: true,
      database: 'connected',
      responded_in_ms: Date.now() - started,
      content: {
        quotes: Number(counts.quotes),
        essays: Number(counts.essays),
        power_laws: Number(counts.power_laws),
        movie_quotes: Number(counts.movie_quotes)
      },
      auth: {
        enabled: auth.enabled,
        signed_up_users: signedUpUsers
      }
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      database: 'error',
      responded_in_ms: Date.now() - started,
      message: err.message
    });
  }
}
