// MindForge content API
//
// This runs on Vercel (NOT in the browser), so it is the only place
// that ever sees the database password. The website just calls
// /api/content and gets back plain JSON.
//
// The DATABASE_URL is set in Vercel: Settings > Environment Variables.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // Allow the old GitHub Pages site to call this too while you migrate.
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Column names are aliased to match the shapes index.html already expects.
    const [quotes, essays, laws] = await Promise.all([
      sql`SELECT quote AS q, author AS a, source AS s, themes AS t
          FROM quotes ORDER BY id`,
      sql`SELECT num AS n, title AS t, subtitle AS sub, themes AS tags, body
          FROM essays ORDER BY sort_order`,
      sql`SELECT num AS n, title AS t, subtitle AS sub, description AS d,
                 when_use AS use, when_avoid AS avoid, action_step AS act
          FROM power_laws ORDER BY num`
    ]);

    // Cache at the edge for 5 min so the database can stay asleep.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ quotes, essays, laws });
  } catch (err) {
    console.error('content api failed', err);
    res.status(500).json({ error: 'Could not load content' });
  }
}
