-- 文字色は色コードではなく番号で持ち、番号から色を引く表はコードの側に置く。色を差し替えても書き込みを直さずに済む。
-- 切り替えた時点では書き込みがないので、色コードは移さずに捨てる。
ALTER TABLE bbs_posts DROP COLUMN color;
ALTER TABLE bbs_posts ADD COLUMN color_id INTEGER NOT NULL DEFAULT 1;
