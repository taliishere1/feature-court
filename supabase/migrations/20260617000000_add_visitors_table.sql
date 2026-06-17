CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitors_insert" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "visitors_select" ON visitors FOR SELECT USING (true);

ALTER TABLE trials ADD COLUMN IF NOT EXISTS visitor_id TEXT REFERENCES visitors(id);

CREATE INDEX IF NOT EXISTS trials_visitor_id_idx ON trials(visitor_id);
