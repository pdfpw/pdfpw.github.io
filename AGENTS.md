UIの色指定は `text-slate-500` のような固定色を避け、`text-primary` / `text-secondary` / `text-destructive` などのセマンティックトークン（`bg-card`、`border-border`、`text-muted-foreground` 等）を使う。

useEffectは基本使わない。どうしても必要なときのみ使う。

型チェックは`pnpm tsc -b`で行い、lintは`pnpm biome check`で行う。
lintの修正には`pnpm biome check --write`を使って良い。

React Compilerがあるので基本的に`useMemo`や`useCallback`は使わない。
