-- 閲覧の記録は Cloudflare Web Analytics から 1 時間ごとに取り込む。訪問者ごとの便りはもう受け取らない。
DROP TABLE presence;

-- 取り込んだ閲覧数は消さずに残すので、直近 30 日の集計が全期間を読まないようにする。
CREATE INDEX page_views_by_day ON page_views (day);
