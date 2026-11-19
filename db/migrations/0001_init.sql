CREATE TABLE claps (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  email TEXT,
  url TEXT,
  password_hash TEXT,
  private INTEGER NOT NULL DEFAULT 0,
  via TEXT,
  source TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX comments_by_post ON comments (slug, created_at);
CREATE INDEX comments_by_time ON comments (created_at);

CREATE TABLE bbs_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  url TEXT,
  body TEXT NOT NULL,
  color TEXT NOT NULL,
  key_hash TEXT,
  reply TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE poll_votes (
  poll TEXT NOT NULL,
  visitor TEXT NOT NULL,
  choice INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (poll, visitor)
);

CREATE TABLE counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE page_views (
  slug TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (slug, day)
);

CREATE TABLE presence (
  visitor TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);
CREATE INDEX presence_by_time ON presence (seen_at);

CREATE TABLE syndications (
  slug TEXT NOT NULL,
  service TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  checked_at TEXT,
  PRIMARY KEY (slug, service)
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
