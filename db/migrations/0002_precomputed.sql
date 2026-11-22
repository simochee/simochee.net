-- 人気記事や閲覧者数のように数えるのに表を広く読む値を、数えた時刻とともに置いておく。
CREATE TABLE snapshots (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  computed_at INTEGER NOT NULL
);

-- アンケートの票を投票のたびに足しておき、結果を出すときに全票を数えなくて済むようにする。
CREATE TABLE poll_totals (
  poll TEXT NOT NULL,
  choice INTEGER NOT NULL,
  votes INTEGER NOT NULL,
  PRIMARY KEY (poll, choice)
);

INSERT INTO poll_totals (poll, choice, votes)
SELECT poll, choice, COUNT(*) FROM poll_votes GROUP BY poll, choice;

INSERT INTO counters (name, value)
SELECT 'bbs_posts', COUNT(*) FROM bbs_posts WHERE 1
ON CONFLICT (name) DO UPDATE SET value = excluded.value;
