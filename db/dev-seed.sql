-- 手元の dev でだけ入る見本のデータ。デザインに書かれていた内容をもとにしている。
-- 消して最初からやりなおすときは .cloudflare/state/ を削除する。

INSERT INTO comments (slug, title, name, body, url, created_at) VALUES
  ('ginkgo-avenue', '銀杏並木', '通りすがり', '銀杏並木の写真、すてきでした！ 今度の休みに行ってみます。', NULL, '2026-11-08T01:15:00.000Z'),
  ('morning-at-kissaten', '厚切りトースト', 'みかん', '厚切りトースト、いいなあ。どこのお店か今度こっそり教えてください！', 'https://example.com/mikan/', '2026-11-18T01:12:34.000Z'),
  ('morning-at-kissaten', 'Re: 厚切りトースト', 'しもちぃ', 'みかんさん > 駅前の角のお店です。ナポリタンもおすすめらしいです！', NULL, '2026-11-18T12:30:15.000Z'),
  ('new-template', 'なつかしい', 'ゆず', 'サイドバーのカレンダー、なつかしくていいですね。', NULL, '2026-11-15T22:45:10.000Z'),
  ('new-template', 'Re: なつかしい', 'しもちぃ', 'ありがとうございます！ あのころのブログっぽさを目指してみました。', NULL, '2026-11-16T11:11:00.000Z'),
  ('pudding-tour', '固め派です', 'くろねこ', '駅前のお店のプリン、わたしも好きです。カラメルがにがめなのがいいんですよね。', NULL, '2026-10-22T10:03:44.000Z'),
  ('unfinished', '下書きへのコメント', 'テスト', 'COMMENT-ON-DRAFT-DO-NOT-SHIP 下書きの記事に付いたコメントは、公開されるページのどこにも出てはいけません。', NULL, '2026-10-31T15:00:00.000Z'),
  ('writing-guide', '表、便利ですね', 'みかん', '喫茶店の表、そのまま行きたいお店リストにしました。古本屋の2階、気になります！', 'https://example.com/mikan/', '2026-11-10T23:31:20.000Z');

INSERT INTO bbs_posts (id, title, name, url, body, color_id, reply, created_at) VALUES
  (125, '銀杏並木', 'みかん', NULL, '銀杏並木の写真、すてきでした！ 今度の休みに行ってみます。', 5, NULL, '2026-11-08T01:15:00.000Z'),
  (126, '相互リンクのお願い', 'まったり日和', 'https://example.com/', 'いつも楽しく読ませてもらっています。うちのブログでもリンクさせていただいたので、よろしければ相互リンクをお願いできますか？', 4, 'うれしいです！ さっそくリンクに追加しました。', '2026-11-10T10:20:00.000Z'),
  (127, 'はじめまして', '通りすがり', NULL, 'テンプレート変わりましたね。サイドバーのカレンダーがなつかしくて、思わず書き込んでしまいました。', 2, '書き込みありがとうございます！ あのころのブログっぽさを目指してみました。', '2026-11-15T04:02:00.000Z'),
  (128, 'キリ番踏みました！', 'ことり', NULL, 'こんばんは！ カウンターを見たら 0012300 でした。キリ番、ということでいいですか？笑
いつもモーニングの記事を楽しみにしています。', 3, 'ことりさん、おめでとうございます＆ありがとうございます！ 次は 0012345 なので、ぜひまた狙ってください♪', '2026-11-17T12:40:00.000Z');

INSERT INTO claps (slug, count) VALUES
  ('morning-at-kissaten', 12),
  ('new-template', 5),
  ('pudding-tour', 8);

INSERT INTO counters (name, value) VALUES ('visitors', 12340);

INSERT INTO page_views (slug, day, count) SELECT 'pudding-tour', strftime('%Y/%m/%d', 'now', '+9 hours'), 42;
INSERT INTO page_views (slug, day, count) SELECT 'morning-at-kissaten', strftime('%Y/%m/%d', 'now', '+9 hours'), 30;
INSERT INTO page_views (slug, day, count) SELECT 'writing-guide', strftime('%Y/%m/%d', 'now', '+9 hours'), 21;
INSERT INTO page_views (slug, day, count) SELECT 'ginkgo-avenue', strftime('%Y/%m/%d', 'now', '+9 hours'), 13;
INSERT INTO page_views (slug, day, count) SELECT 'rainy-kissaten', strftime('%Y/%m/%d', 'now', '+9 hours'), 8;

INSERT INTO poll_votes (poll, visitor, choice, created_at) VALUES
  ('2026-winter-kissaten', 'seed-1', 0, '2026-11-18T00:00:00.000Z'),
  ('2026-winter-kissaten', 'seed-2', 0, '2026-11-18T00:00:00.000Z'),
  ('2026-winter-kissaten', 'seed-3', 2, '2026-11-18T00:00:00.000Z'),
  ('2026-winter-kissaten', 'seed-4', 1, '2026-11-18T00:00:00.000Z'),
  ('2026-winter-kissaten', 'seed-5', 3, '2026-11-18T00:00:00.000Z');

-- 見本の票と書き込みに合わせて、数えてある合計をそろえる。
INSERT INTO poll_totals (poll, choice, votes)
SELECT poll, choice, COUNT(*) FROM poll_votes GROUP BY poll, choice;

UPDATE counters SET value = (SELECT COUNT(*) FROM bbs_posts) WHERE name = 'bbs_posts';
