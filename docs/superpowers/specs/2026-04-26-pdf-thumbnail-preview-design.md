# PDF Thumbnail Preview in Library Section

## Overview

LibrarySection のファイルカードに、各PDFの1ページ目のサムネイル画像を表示する。現在はジェネリックアイコン（FileSymlink / FileClock）のみ表示されているが、ユーザーがファイルを開いた際に生成したサムネイルを保存・表示することで、ファイル選択をより直感的にする。

## Data Model

`src/lib/recent-store.ts` の `RecentFile` 型に `thumbnail?: string` フィールドを追加する。

```typescript
export interface RecentFile {
  // 既存フィールド...
  thumbnail?: string; // JPEG data URL (幅400px相当)
}
```

- 既存エントリはフィールドなしのまま残る（後方互換性あり）
- 新しく開いたファイルから順次サムネイル付きになる
- `upsertRecent` の実装変更は不要（型追加のみ）

## Thumbnail Generation

新しいユーティリティ `src/lib/thumbnail.ts` を作成する。

**インターフェース：**
```typescript
export async function generateThumbnail(pdf: File): Promise<string | null>
```

**処理フロー：**
1. PDF.js の `getDocument` でPDFを読み込む
2. ページ1を取得し、幅400px相当のviewportでcanvasにレンダリング
3. `canvas.toDataURL("image/jpeg", 0.7)` でJPEG data URLを生成して返す
4. 失敗した場合は `null` を返す（サムネイルなしのフォールバックに）

**PDF.js worker：**
`index.tsx` でモジュールレベルに `GlobalWorkerOptions.workerSrc = pdfWorkerUrl` を設定する（`presenter.tsx` と同様）。

**呼び出しタイミング：**
`index.tsx` の `handleFiles` 内、`saveRecent` 呼び出し前にサムネイルを生成し、`RecentFile` エントリの `thumbnail` フィールドに含める。生成に失敗しても（null の場合）、処理は続行してサムネイルなしで保存する。

## Display

`LibrarySection.tsx` のカードサムネイル部分を変更する。

**変更前：** FileSymlink / FileClock アイコンのみ

**変更後：**
- `item.thumbnail` がある場合：`<img>` を `object-contain` で表示
- ない場合：既存のアイコンにフォールバック

FSAインジケーターの緑ドット（`.bg-accent`）はサムネイル有無に関わらず右下に維持する。

```tsx
<div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-md bg-gradient-to-br from-surface to-bg">
  {item.thumbnail ? (
    <img
      src={item.thumbnail}
      alt=""
      className="absolute inset-0 h-full w-full object-contain"
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center text-subtle">
      {item.handle ? <FileSymlink className="size-6" /> : <FileClock className="size-6" />}
    </div>
  )}
  {item.handle && (
    <span
      role="img"
      aria-label={m.library_fsa_indicator_aria()}
      className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-accent"
    />
  )}
</div>
```

## Error Handling

- サムネイル生成失敗（PDF破損、メモリ不足など）：`null` を返してアイコン表示にフォールバック。ファイルを開く処理自体は中断しない。
- 既存エントリ（`thumbnail` なし）：アイコン表示のまま。ファイルを再度開いた際に更新される。

## Testing

- `generateThumbnail` ユニットテスト：正常系（data URL返却）、失敗系（null返却）
- LibrarySection の表示：thumbnail あり/なし両パターン
