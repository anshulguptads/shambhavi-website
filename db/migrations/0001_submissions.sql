-- Form submissions log (demo/pilot requests + contact messages).
-- Apply locally:  npx wrangler d1 execute shambhavi-forms --local --file db/migrations/0001_submissions.sql
-- Apply to prod:  npx wrangler d1 execute shambhavi-forms --remote --file db/migrations/0001_submissions.sql
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('demo-request', 'contact')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organisation TEXT,
  role TEXT,
  platforms TEXT,          -- comma-separated product slugs (demo requests)
  org_type TEXT,
  country TEXT,
  phone TEXT,
  topic TEXT,              -- contact form topic
  message TEXT,
  email_sent INTEGER NOT NULL DEFAULT 0,
  cf_country TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_kind ON submissions (kind);
