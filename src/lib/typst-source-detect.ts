export interface TypstSource {
  /** Project-root-relative path with no leading slash. e.g. "main.typ", "images/logo.png" */
  path: string;
  data: Uint8Array;
}

export function containsTypst(sources: TypstSource[]): boolean {
  return sources.some((s) => /\.typ$/i.test(s.path));
}

function depth(path: string): number {
  return path.split("/").length;
}

export function pickMainTypst(sources: TypstSource[]): string | null {
  const typs = sources.filter((s) => /\.typ$/i.test(s.path));
  if (typs.length === 0) return null;
  if (typs.length === 1) return typs[0].path;
  const root = typs.find((s) => s.path.toLowerCase() === "main.typ");
  if (root) return root.path;
  const sorted = [...typs].sort((a, b) => {
    const d = depth(a.path) - depth(b.path);
    if (d !== 0) return d;
    return a.path.localeCompare(b.path);
  });
  return sorted[0].path;
}

export async function filesToTypstSources(files: File[]): Promise<TypstSource[]> {
  return Promise.all(
    files.map(async (f) => ({
      path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      data: new Uint8Array(await f.arrayBuffer()),
    })),
  );
}
