# Tween 82.8 — Design Rules

## Brand Identity

**Tween** は主体。**82.8** は周波数の識別子（サブ要素）。

```
Tween  ← ブランド名。白。大きく。存在感。
82.8   ← 周波数。緑のグロー。Tweenを補足する存在。
```

---

## Typography Hierarchy

| Level | Element      | Scale  | Color           | Role              |
|-------|--------------|--------|-----------------|-------------------|
| 1     | **Tween**    | Large  | `#ffffff` White | Brand / Hero      |
| 2     | **82.8**     | Medium | `#00ff50` Green | Frequency / Glow  |
| 3     | FM · MHZ etc | Small  | `#508060` Muted | Context / Support |

ルール:
- Tween は 82.8 より **常に大きく** 表示する
- 82.8 はグローをつけて良い。Tween はグロー不要（清潔感を保つ）
- "82.8" の重複は避ける（同一画面内で最大1〜2回）

---

## Color Palette

| Name        | Hex       | RGB          | Use                        |
|-------------|-----------|--------------|----------------------------|
| Night Navy  | `#0a0e2a` | 10, 14, 42   | Background                 |
| White       | `#ffffff` | 255,255,255  | Brand text "Tween"         |
| Signal Green| `#00ff50` | 0, 255, 80   | "82.8" glow, spectrum bars |
| Win95 Silver| `#c0c0c0` | 192,192,192  | UI chrome (title/taskbar)  |
| Win95 Navy  | `#000080` | 0, 0, 128    | Title bar fill             |
| Muted Green | `#508060` | 80, 128, 96  | Supporting text            |
| Star White  | `#8899bb` | 136,153,187  | Stars / subtle accents     |

---

## Win95 UI Rules

常に存在するもの:
- **Title bar** (上部): `#c0c0c0` シルバー枠 + `#000080` ネイビー fill + 3ボタン
- **Taskbar** (下部): `#c0c0c0` シルバー + Start ボタン + 時計

Title bar に表示するテキスト:
- `Tween 82.8` のみ（ウィンドウタイトルとして自然）

---

## Spectrum / Visualizer Rules

- 色: Signal Green のみ（モノクロ）
- 背景から上に向かって: 暗いティール → 明るいグリーン
- 幅: フル幅（edge-to-edge）
- 位置: 常に最下部（タスクバーの直上）

---

## Atmosphere

- **CRT スキャンライン**: 3行おきに輝度 12% ダウン（微妙に）
- **ビネット**: 四隅をナイトネイビーで暗くする
- **星**: 白〜青白、点滅なし、静的、背景として控えめに

---

## What NOT to do

- "82.8" を Tween より大きく表示しない
- カラフルな spectrum（単色グリーンのみ）
- ネオン・グラデーション過多
- 横線・区切り線（不要な分割はしない）
- "82.8" を3回以上同一画面に表示
