const fs = require('fs');

let content = fs.readFileSync('database_schema.sql', 'utf8');

const tableSql = `
-- Table: stripe_events
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
`;

if (!content.includes('stripe_events')) {
  content += tableSql;
  fs.writeFileSync('database_schema.sql', content);
}
