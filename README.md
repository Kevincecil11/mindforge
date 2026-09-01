# MindForge

Daily quotes, essays, and power laws for mental strength.
Built by Kevin — [mtrxdigital.com](https://mtrxdigital.com)

## How it fits together

| Piece | What it does |
| --- | --- |
| `index.html` | The whole app. Also holds a fallback copy of the content so the site works even if the API is down. |
| `api/content.js` | Serverless function. Reads the `quotes`, `essays` and `power_laws` tables from Neon and returns JSON. The **only** place the database password exists. |
| `data.js` | Runs in the browser. Calls `/api/content`, swaps the fresh content in, caches a copy in `localStorage` for offline/instant loads. |
| `package.json` | Pulls in the Neon serverless driver. |

## Deploying

Hosted on Vercel. Every push to `main` deploys automatically.

One required environment variable (Vercel → Settings → Environment Variables):

```
DATABASE_URL = <your Neon POOLED connection string>
```

Use the connection string with `-pooler` in the hostname. After adding or
changing it, **redeploy** so the new value is picked up.

Never commit this value. It is not in the repo and must not be.

## Adding content

Content lives in the database now, not in the code. Add a quote from the
Neon SQL Editor:

```sql
INSERT INTO quotes (quote, author, source, themes)
VALUES ('Your quote here', 'Author Name', NULL, ARRAY['motivation']);
```

Any new theme you invent automatically gets its own filter chip in the UI.

## Checking the API

Visit `/api/content` on the deployed site. A wall of JSON means it works.
