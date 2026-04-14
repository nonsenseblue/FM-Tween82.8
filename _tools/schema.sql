-- Tween 82.8 Guestbook — D1 Schema
CREATE TABLE IF NOT EXISTS messages (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL DEFAULT '名無しリスナー',
  msg   TEXT    NOT NULL,
  ts    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Preset messages (深夜ラジオのハガキコーナー)
INSERT INTO messages (name, msg, ts) VALUES
  ('夜更かしのA',       '毎晩聴いてます。この時間だけは自分に戻れる気がします。',             '2025-12-01 02:14:00'),
  ('ミッドナイトブルー', 'Jazzチャンネル最高。コーヒー片手に深夜残業が捗ります。',           '2025-12-15 01:33:00'),
  ('名無しリスナー',     '眠れない夜にたどり着きました。なんだか安心する。',                 '2026-01-03 03:45:00'),
  ('電波少年',           'Synthwaveかけながらドライブしてる。夜の高速最高。',                 '2026-01-20 23:58:00'),
  ('まどろみの窓辺',     '夢と現実の間、82.8MHz。おやすみなさい。',                          '2026-02-14 04:02:00'),
  ('深夜のパン屋',       '仕込み中にいつも流してます。Lofiが生地にいい影響ある気がする。',     '2026-03-01 03:20:00');
