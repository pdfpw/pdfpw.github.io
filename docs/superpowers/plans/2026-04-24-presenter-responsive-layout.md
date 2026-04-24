# プレゼンター画面レスポンシブ対応 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プレゼンター画面が小さい/4:3 アスペクト比のディスプレイで横スクロールしてしまう問題を、現在のレイアウト構造を維持したまま解決する。

**Architecture:**
- グリッドの主従を逆転 (案 D + 案 G)
  - `grid-cols-[auto_1fr]` (SlideStage 主) → `grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)]` (Sidebar が viewport 連動 clamp、SlideStage が残り全部)
- 各セル内の要素は `aspect-video` を維持しつつ、`max-h-full max-w-full` でセルからはみ出さないように
- PdfPage 内部の ResizeObserver は既にコンテナサイズに追従して描画するため、スライド本体の見た目は変わらない

**Tech Stack:** React 19, TanStack Router, Tailwind CSS 4, PDF.js (canvas), Vite (dev サーバー)

**検証方針:** 純粋な CSS 変更のため、ユニットテストではなく chrome-devtools-mcp でビューポート別の実機検証を行う。各タスクの最終ステップで以下のサイズで横スクロールが出ないことを確認する:
- 1920×1080 (16:9)
- 1280×720 (16:9 small)
- 1024×768 (4:3)
- 1400×1050 (4:3)
- 800×600 (極小)

---

## 影響を受けるファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/routes/(main)/presenter.tsx` | グリッドの列定義変更、SlideStage と sidebar の className 調整、LoadingSkeleton の対応 |
| `src/routes/(main)/-presenter/SlideStage.tsx` | 内部の className が `aspect-video max-h-full max-w-full` で動作するよう確認 (基本的に変更不要) |
| `src/routes/(main)/-presenter/NextPrevFooter.tsx` | 前/次サムネが横方向に縮められるようグリッドを調整 |
| `src/routes/(main)/-presenter/NextSlide.tsx` | sidebar 幅が小さくなったときに納まるよう調整 (基本 `w-full aspect-video` で動くはず) |
| `src/routes/(main)/-presenter/ModeForm.tsx` | sidebar 280px でボタン3つが収まるかを確認、必要ならアイコンのみに切替 |

---

## Task 1: 事前検証セットアップ

**目的:** 現状の問題を再現できる環境を準備し、変更前後の比較ができるようにする。

**Files:**
- 参照のみ: `public/demo.pdf`, `demo/pdfpw-demo.pdf`

- [ ] **Step 1: dev サーバーを起動**

```bash
pnpm dev
```

別の bash セッションでバックグラウンド起動。`http://localhost:6123/` で待機していることを確認する。

- [ ] **Step 2: デモ PDF を public に複製 (chrome-devtools-mcp 検証用)**

```bash
cp demo/pdfpw-demo.pdf public/demo.pdf
```

`public/demo.pdf` は最終コミットに含めない (Task 9 でクリーンアップ)。

- [ ] **Step 3: chrome-devtools-mcp でホーム画面を開く**

`mcp__chrome-devtools__new_page` で `http://localhost:6123/` を開き、`mcp__chrome-devtools__resize_page` で `1280×720` にする。

- [ ] **Step 4: デモ PDF を読み込ませてプレゼンター画面に遷移**

`mcp__chrome-devtools__evaluate_script` で以下を実行:

```javascript
async () => {
  const res = await fetch('/demo.pdf');
  const blob = await res.blob();
  const file = new File([blob], 'demo.pdf', { type: 'application/pdf' });
  const input = document.querySelector('input[type="file"]');
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true };
}
```

- [ ] **Step 5: 自動で開く presentation ウィンドウを閉じる**

`mcp__chrome-devtools__list_pages` で確認し、`/presentation?file=demo.pdf` のページを `mcp__chrome-devtools__close_page` で閉じる。

- [ ] **Step 6: 現状の問題を記録 (変更前 baseline)**

`mcp__chrome-devtools__evaluate_script`:

```javascript
() => {
  const docEl = document.documentElement;
  return { vp: { w: innerWidth, h: innerHeight }, sw: docEl.scrollWidth, sh: docEl.scrollHeight, overflowX: docEl.scrollWidth > innerWidth };
}
```

期待値: `vp={w:1280,h:720}`, `sw=1314`, `overflowX=true` (=現状の不具合)。

---

## Task 2: ルートグリッドの列定義を変更 (presenter.tsx)

**目的:** `grid-cols-[auto_1fr]` (SlideStage が auto で膨張) を `grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)]` (sidebar が viewport 連動、SlideStage が残り) に変更する。

**Files:**
- Modify: `src/routes/(main)/presenter.tsx:278` (グリッドの className)
- Modify: `src/routes/(main)/presenter.tsx:70` (LoadingSkeleton 内の同じグリッド)

- [ ] **Step 1: 現状の className を確認**

`presenter.tsx:278` 付近:

```tsx
<div className="grid h-full max-h-full grid-cols-[auto_1fr] grid-rows-[3fr_1fr] p-4 gap-4">
```

- [ ] **Step 2: グリッドの列定義を変更**

`grid-cols-[auto_1fr]` を `grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)]` に変更:

```tsx
<div className="grid h-full max-h-full grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)] grid-rows-[3fr_1fr] p-4 gap-4">
```

意味:
- 1列目 `minmax(0,1fr)` — 残った領域を全部、最小 0 (=自動シュリンク可)
- 2列目 `clamp(280px,28vw,420px)` — viewport 幅の 28% を基本に、280px〜420px でクランプ

- [ ] **Step 3: LoadingSkeleton も同じ列定義に変更**

`presenter.tsx:70` 付近の LoadingSkeleton 関数内の grid div を同様に変更:

```tsx
<div className="grid h-full max-h-full grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)] grid-rows-[3fr_1fr] p-4 gap-4">
```

- [ ] **Step 4: TypeScript 型チェック**

```bash
pnpm tsc -b
```

期待値: エラーなし。

- [ ] **Step 5: コミット**

```bash
git add src/routes/(main)/presenter.tsx
git commit -m "プレゼンター画面: グリッド列定義を viewport 連動に変更

- grid-cols-[auto_1fr] → grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)]
- sidebar が viewport 28vw を 280-420px でクランプ
- SlideStage 列は残り全部 (minmax で最小 0 まで縮められる)"
```

---

## Task 3: SlideStage を新しいセル形状に追従させる

**目的:** SlideStage の `aspect-video h-full` (高さから幅を導出) を、セルの最大寸法に収まる 16:9 (`aspect-video max-h-full max-w-full`) に変更し、セル幅が狭くなれば自動で縮むようにする。

**Files:**
- Modify: `src/routes/(main)/presenter.tsx:282` (SlideStage の className)
- Modify: `src/routes/(main)/presenter.tsx:71` (LoadingSkeleton の対応 Skeleton)
- Verify: `src/routes/(main)/-presenter/SlideStage.tsx` (中身は変更不要)

- [ ] **Step 1: SlideStage コンポーネント呼び出しの className を変更**

`presenter.tsx:282`:

```tsx
<SlideStage
  pdfProxy={pdfProxy}
  pageNumber={pageNumber}
  className="aspect-video h-full"
  ref={slideStageRef}
/>
```

を以下に変更:

```tsx
<SlideStage
  pdfProxy={pdfProxy}
  pageNumber={pageNumber}
  className="aspect-video max-h-full max-w-full self-center justify-self-center"
  ref={slideStageRef}
/>
```

意味:
- `aspect-video` で 16:9 を維持
- `max-h-full max-w-full` でセルからはみ出さない
- `self-center justify-self-center` でセル内中央寄せ (余ったスペースの扱い)

- [ ] **Step 2: LoadingSkeleton の対応スケルトンを同じ形状に変更**

`presenter.tsx:71` 付近:

```tsx
<Skeleton className="aspect-video min-h-[calc((100vh-60px)/4*3)]"></Skeleton>
```

を以下に変更:

```tsx
<Skeleton className="aspect-video max-h-full max-w-full self-center justify-self-center"></Skeleton>
```

理由: 元の `min-h-[calc(...)]` は viewport 高さに連動して固定高さを与えていたが、新レイアウトでは行高がセルから決まるため不要。

- [ ] **Step 3: SlideStage コンポーネント本体を確認**

`src/routes/(main)/-presenter/SlideStage.tsx` の中身は次の通り (変更不要):

```tsx
<section className={cn("relative", className)} ref={ref}>
  <PdfPage pdfProxy={pdfProxy} pageNumber={pageNumber} className="absolute inset-0" />
</section>
```

`className` を呼び出し側から受け取ってそのまま `<section>` に当てているため、Step 1 の変更がそのまま反映される。

- [ ] **Step 4: TypeScript 型チェック**

```bash
pnpm tsc -b
```

期待値: エラーなし。

- [ ] **Step 5: 視覚検証 — chrome-devtools-mcp で 1280×720 確認**

dev サーバーが立ち上がっていることを確認後、`mcp__chrome-devtools__navigate_page` で `reload` するか、Task 1 の Step 4 を再実行してプレゼンター画面に遷移し、`mcp__chrome-devtools__resize_page` で 1280×720 にしてから:

```javascript
() => {
  const docEl = document.documentElement;
  return { sw: docEl.scrollWidth, sh: docEl.scrollHeight, overflowX: docEl.scrollWidth > innerWidth };
}
```

期待値: `overflowX=false`。SlideStage / sidebar / footer すべて表示される。

- [ ] **Step 6: スクリーンショットで視覚確認**

`mcp__chrome-devtools__take_screenshot` で `/tmp/after-task3-1280x720.png` に保存し、視覚的に SlideStage が左上、sidebar が右、footer が下に表示されていることを確認。

- [ ] **Step 7: コミット**

```bash
git add src/routes/(main)/presenter.tsx
git commit -m "プレゼンター画面: SlideStage をセルに追従するように変更

aspect-video h-full (高さから幅を導出して膨張) から
aspect-video max-h-full max-w-full (セル内に収まる最大 16:9) に変更。
PdfPage 内部の ResizeObserver は既にコンテナ追従なので
スライド本体の描画品質は維持される。"
```

---

## Task 4: NextPrevFooter の前/次サムネイルが縮められるようにする

**目的:** Footer 内の prev/next サムネイル (`h-full aspect-video`) も SlideStage と同じ理由で行高から幅が決まり横方向に膨張する。`grid-cols-[auto_1fr_auto]` を `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` に変更し、サムネイル側を `aspect-video max-h-full max-w-full` 系に変える。

**Files:**
- Modify: `src/routes/(main)/-presenter/NextPrevFooter.tsx:69` (グリッドの列定義)
- Modify: `src/routes/(main)/-presenter/NextPrevFooter.tsx:71-77` (prev サムネ)
- Modify: `src/routes/(main)/-presenter/NextPrevFooter.tsx:111-118` (next サムネ)

- [ ] **Step 1: 現状の className を確認**

`NextPrevFooter.tsx:69-119`:

```tsx
<div className="grid grid-cols-[auto_1fr_auto]" ref={ref}>
  {prev === null ? (
    <div className="h-full aspect-video"></div>
  ) : (
    <PdfPage pdfProxy={pdfProxy} pageNumber={prev} className="h-full w-auto aspect-video" />
  )}
  <div className="flex flex-col items-center justify-center gap-2">
    {/* controls + Timer */}
  </div>
  {next === null ? (
    <div className="h-full aspect-video"></div>
  ) : (
    <PdfPage pdfProxy={pdfProxy} pageNumber={next} className="h-full w-auto aspect-video" />
  )}
</div>
```

- [ ] **Step 2: グリッドの列定義を変更 (左右をシュリンク可能に)**

```tsx
<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2" ref={ref}>
```

意味:
- 左/右列 `minmax(0,1fr)` — 中央 controls の左右に等しいスペースを与え、最小 0 まで縮む
- 中央列 `auto` — controls の content-fit
- `gap-2` でサムネと controls の間隔を確保

- [ ] **Step 3: prev サムネの className を変更**

```tsx
{prev === null ? (
  <div className="aspect-video max-h-full max-w-full justify-self-end"></div>
) : (
  <PdfPage
    pdfProxy={pdfProxy}
    pageNumber={prev}
    className="aspect-video max-h-full max-w-full justify-self-end"
  />
)}
```

意味:
- `aspect-video` で 16:9
- `max-h-full max-w-full` でセル内に収まる
- `justify-self-end` で controls 側 (右端) に寄せる

- [ ] **Step 4: next サムネの className を変更**

```tsx
{next === null ? (
  <div className="aspect-video max-h-full max-w-full justify-self-start"></div>
) : (
  <PdfPage
    pdfProxy={pdfProxy}
    pageNumber={next}
    className="aspect-video max-h-full max-w-full justify-self-start"
  />
)}
```

`justify-self-start` で controls 側 (左端) に寄せる。

- [ ] **Step 5: TypeScript 型チェック**

```bash
pnpm tsc -b
```

期待値: エラーなし。

- [ ] **Step 6: 視覚検証 — 1280×720 で footer 確認**

ブラウザをリロード後 (`mcp__chrome-devtools__navigate_page` type=reload)、いったん次スライドへ進める (page=2 にする) ためページ内で右矢印キーを押す:

```javascript
() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
}
```

その後 `take_screenshot` で footer に prev/next サムネが両方表示されていることを確認。横スクロールが出ていないことを `evaluate_script` で確認:

```javascript
() => ({ overflowX: document.documentElement.scrollWidth > innerWidth })
```

期待値: `overflowX=false`、prev/next サムネが控えめなサイズで両側に表示される。

- [ ] **Step 7: コミット**

```bash
git add src/routes/(main)/-presenter/NextPrevFooter.tsx
git commit -m "プレゼンター画面: 前後サムネイルがセル内で縮められるように変更

- グリッドを grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] に変更
- prev/next サムネを aspect-video max-h-full max-w-full + justify-self に変更
- 行高から幅が決まる構造を解消し、セル幅に応じて縮む"
```

---

## Task 5: ModeForm が狭い sidebar (280px) で破綻しないか確認

**目的:** sidebar が `clamp(280px,28vw,420px)` で最小 280px まで縮むと、ModeForm の3つのボタン (`投影固定` / `投影停止` / `一覧表示`) が横並びで収まらない可能性がある。実機検証して必要なら対処する。

**Files:**
- Modify (条件付き): `src/routes/(main)/-presenter/ModeForm.tsx`

- [ ] **Step 1: viewport 800×600 で sidebar 280px 状態を再現**

`mcp__chrome-devtools__resize_page` で 800×600 にする。viewport 800px の 28% = 224px → clamp 下限の 280px が適用される。

- [ ] **Step 2: ModeForm のボタン状態を確認**

`take_screenshot` で sidebar のボタン3つが横並びで収まっているかを目視確認。
評価 script:

```javascript
() => {
  const buttons = document.querySelectorAll('main button');
  const modeButtons = Array.from(buttons).filter(b => b.textContent.includes('投影') || b.textContent.includes('一覧'));
  return modeButtons.map(b => {
    const r = b.getBoundingClientRect();
    return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), wrapped: b.scrollWidth > b.clientWidth };
  });
}
```

期待値: 3つのボタンが横並びで、テキストが折り返しせず収まる。

- [ ] **Step 3 (条件付き): 収まらない場合のみ実施 — 狭いとき icon-only に**

ボタンが収まらない場合、ModeForm のボタン text を `<span className="hidden @md:inline">投影固定</span>` のようにして狭いときアイコンのみにする方針が考えられるが、CSS Container Query が必要。**Tailwind 4 はネイティブで `@container` をサポートしている**ので、親 div に `@container` を付け、`@md:` で出し分け可能。

実施が必要な場合の `ModeForm.tsx` 変更例:

```tsx
<Card className={cn("shadow-2xs py-3 @container", className)}>
  <CardContent className="px-3">
    <div className="flex gap-2">
      <Button type="button" variant={isFrozen ? "default" : "outline"} className="flex-1 gap-2 h-9" size="default" onClick={() => onFrozenChange(!isFrozen)}>
        <Snowflake className="size-4" />
        <span className="hidden @[20rem]:inline">投影固定</span>
      </Button>
      <Button type="button" variant={isBlackout ? "default" : "outline"} className="flex-1 gap-2 h-9" size="default" onClick={() => onBlackoutChange(!isBlackout)}>
        <MonitorOff className="size-4" />
        <span className="hidden @[20rem]:inline">投影停止</span>
      </Button>
      <Button type="button" variant="outline" className="flex-1 gap-2 h-9" size="default" onClick={onOverviewModeOpen}>
        <Grid className="size-4" />
        <span className="hidden @[20rem]:inline">一覧表示</span>
      </Button>
    </div>
  </CardContent>
</Card>
```

`@container` を Card に付け、`@[20rem]:inline` (= 320px 以上のコンテナで text を表示) で対応。

- [ ] **Step 4: 必要なら TypeScript 型チェック**

```bash
pnpm tsc -b
```

- [ ] **Step 5: 800×600 で再度スクリーンショット**

`take_screenshot` で 3つのボタンが (text もしくは icon-only で) 横並びで収まることを確認。

- [ ] **Step 6: コミット (Step 3 を実施した場合のみ)**

```bash
git add src/routes/(main)/-presenter/ModeForm.tsx
git commit -m "ModeForm: 狭い sidebar でアイコンのみ表示に切り替え

@container と @[20rem]:inline で 320px 未満の sidebar 幅では
ボタンラベルを隠してアイコンのみ表示する。"
```

Step 3 を実施しなかった場合は本タスクのコミットは不要。

---

## Task 6: NextSlide が sidebar 幅に追従するか確認

**目的:** NextSlide は既に `w-full max-h-80 aspect-video` で sidebar 幅に追従するはずだが、念のため検証する。

**Files:**
- Verify only: `src/routes/(main)/-presenter/NextSlide.tsx`

- [ ] **Step 1: 現状の className を確認**

`NextSlide.tsx:49,57`:

```tsx
<div className="h-auto aspect-video max-h-80 w-full min-h-0" ref={ref}></div>
// or
<PdfPage pdfProxy={pdfProxy} pageNumber={nextPageNumber} className="h-auto aspect-video max-h-80" ref={ref} />
```

→ `w-full` が付いていれば sidebar 幅追従、`max-h-80` (320px) で高すぎないようキャップ。問題なし。

- [ ] **Step 2: chrome-devtools-mcp で sidebar の NextSlide 寸法を確認**

```javascript
() => {
  // NextSlide は presenter sidebar の最初の PdfPage コンテナ
  const sidebar = document.querySelector('main .row-span-2');
  if (!sidebar) return null;
  const firstPdf = sidebar.querySelector('[data-slot="pdf-page-container"]');
  if (!firstPdf) return null;
  const r = firstPdf.getBoundingClientRect();
  const sr = sidebar.getBoundingClientRect();
  return { sidebarW: Math.round(sr.width), nextSlideW: Math.round(r.width), nextSlideH: Math.round(r.height) };
}
```

期待値: `nextSlideW <= sidebarW` (sidebar からはみ出さない)、`nextSlideH ≈ nextSlideW * 9/16` 。

- [ ] **Step 3: 問題なければそのまま、変更不要**

- [ ] **Step 4: 万が一 NextSlide の `aspect-video max-h-80` で計算されるサイズ (例: 280px 幅 → 158px 高) が `max-h-80` (320px) より小さくならず横にはみ出す場合のみ調整**

その場合、`NextSlide.tsx` の className に `w-full` を明示する:

```tsx
<PdfPage
  pdfProxy={pdfProxy}
  pageNumber={nextPageNumber}
  className="aspect-video max-h-80 w-full"
  ref={ref}
/>
```

(空の div 側にも同様。既に w-full が付いている。)

- [ ] **Step 5: 必要があればコミット**

実施した場合のみ:

```bash
git add src/routes/(main)/-presenter/NextSlide.tsx
git commit -m "NextSlide: sidebar 幅に追従するよう w-full を明示"
```

---

## Task 7: 全ビューポートサイズで横スクロールがないことを確認

**目的:** 想定される全てのビューポートサイズで横スクロールが発生しないことを最終確認する。

**Files:** なし (検証のみ)

- [ ] **Step 1: chrome-devtools-mcp で各サイズを順に確認**

以下の順で `mcp__chrome-devtools__resize_page` → `mcp__chrome-devtools__evaluate_script` を実行:

```javascript
() => ({ vp: { w: innerWidth, h: innerHeight }, sw: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > innerWidth })
```

| サイズ | アスペクト | 期待結果 |
|---|---|---|
| 1920×1080 | 16:9 | `overflowX: false` |
| 1366×768  | 16:9 | `overflowX: false` |
| 1280×720  | 16:9 | `overflowX: false` |
| 1024×768  | 4:3  | `overflowX: false` |
| 1400×1050 | 4:3  | `overflowX: false` |
| 1600×1200 | 4:3  | `overflowX: false` |
| 800×600   | 4:3  | `overflowX: false` |

全て `overflowX: false` であること。

- [ ] **Step 2: 各サイズでスクリーンショット撮影 (記録目的)**

各サイズで `mcp__chrome-devtools__take_screenshot` を `/tmp/after-final-{w}x{h}.png` に保存し、視覚的に SlideStage / sidebar / footer がすべて表示されていることを確認。

- [ ] **Step 3: 1920×1080 で大画面時の見た目が変更前と遜色ないことを確認**

スクリーンショット `/tmp/after-final-1920x1080.png` を確認:
- SlideStage が左の大部分を占める
- sidebar (NextSlide / ModeForm / Note) が右側
- NextPrevFooter が下部にあり、prev/next サムネが両側に
- 投影固定/停止/一覧表示の3ボタンに text が出ている

---

## Task 8: PWA キャッシュとプロダクションビルドの動作確認

**目的:** プロダクションビルドが通り、PWA の precache に変更後の CSS が含まれることを確認する。

**Files:** なし (ビルド検証のみ)

- [ ] **Step 1: プロダクションビルド**

```bash
pnpm build
```

期待値: エラーなしで完了。`dist/` にアセットが出力される。

- [ ] **Step 2: lint チェック**

```bash
pnpm check
```

期待値: Biome のエラーなし (Tailwind の class ソート warn が出る場合はそれに従って `pnpm format` で修正)。

- [ ] **Step 3: 修正があった場合**

```bash
pnpm format
git add -u
git commit -m "Biome format 適用"
```

---

## Task 9: 検証用ファイルのクリーンアップ

**目的:** Task 1 で `public/demo.pdf` に複製した検証用 PDF を削除する。

**Files:**
- Delete: `public/demo.pdf`

- [ ] **Step 1: dev サーバーを停止**

(Task 1 で起動した bash バックグラウンドジョブを停止)

- [ ] **Step 2: 検証用 PDF を削除**

```bash
rm public/demo.pdf
```

- [ ] **Step 3: git status を確認**

```bash
git status
```

`public/demo.pdf` が untracked か確認。tracked であれば次の手順で `git rm` する:

```bash
git rm public/demo.pdf
```

- [ ] **Step 4: 不要なら削除をコミット (もし tracked になっていた場合)**

```bash
git commit -m "検証用 demo.pdf を削除"
```

---

## ロールバック計画

万が一、視覚的に大きく劣化したり PdfPage の ResizeObserver が新しいセル形状で正しく動かなかった場合:

1. `git log --oneline -10` で関連コミットを特定
2. 最終マージ前であれば `git revert <commit>` で1タスクずつ取り消し可能 (各タスクが小さなコミットになっているため)
3. 特に Task 3 (SlideStage) と Task 4 (NextPrevFooter) は独立しているので片方だけ revert することも可能

## Out of Scope

以下は本計画の対象外 (別タスクで検討):

- presentation 画面側のレイアウト調整 (こちらはフルスクリーン1要素のため問題なし想定)
- OverviewDialog のレスポンシブ対応 (別途必要なら別計画)
- モバイル (480px 未満) 対応 (本計画は PC + タブレット向けの修正)
