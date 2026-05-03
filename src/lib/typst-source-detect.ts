export interface TypstSource {
	/** Project-root-relative path with no leading slash. e.g. "main.typ", "images/logo.png" */
	path: string;
	data: Uint8Array;
}

/**
 * Path-only view of a Typst input. `containsTypst` and `pickMainTypst` only
 * need the path; this lets callers decide whether to load the bytes (which is
 * costly for large PDF decks that pass through the same `handleFiles` entry).
 */
export interface TypstSourceMeta {
	path: string;
}

export function containsTypst(
	sources: ReadonlyArray<TypstSourceMeta>,
): boolean {
	return sources.some((s) => /\.typ$/i.test(s.path));
}

function depth(path: string): number {
	return path.split("/").length;
}

export function pickMainTypst(
	sources: ReadonlyArray<TypstSourceMeta>,
): string | null {
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

type FsEntry = {
	isFile: boolean;
	isDirectory: boolean;
	name: string;
	file?: (cb: (f: File) => void, err?: (e: unknown) => void) => void;
	createReader?: () => {
		readEntries: (
			cb: (entries: FsEntry[]) => void,
			err?: (e: unknown) => void,
		) => void;
	};
};

function readDirAll(
	reader: ReturnType<NonNullable<FsEntry["createReader"]>>,
): Promise<FsEntry[]> {
	return new Promise((resolve, reject) => {
		const all: FsEntry[] = [];
		const pump = () =>
			reader.readEntries((batch) => {
				if (batch.length === 0) return resolve(all);
				all.push(...batch);
				pump();
			}, reject);
		pump();
	});
}

async function entryToSources(
	entry: FsEntry,
	prefix: string,
): Promise<TypstSource[]> {
	const path = prefix ? `${prefix}/${entry.name}` : entry.name;
	if (entry.isFile && entry.file) {
		const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
		return [{ path, data: new Uint8Array(await file.arrayBuffer()) }];
	}
	if (entry.isDirectory && entry.createReader) {
		const reader = entry.createReader();
		const children = await readDirAll(reader);
		const nested = await Promise.all(
			children.map((c) => entryToSources(c, path)),
		);
		return nested.flat();
	}
	return [];
}

export async function entriesToTypstSources(
	entries: ReadonlyArray<FsEntry | null>,
): Promise<TypstSource[]> {
	const filtered = entries.filter((e): e is FsEntry => !!e);
	const nested = await Promise.all(filtered.map((e) => entryToSources(e, "")));
	return nested.flat();
}

/**
 * Cheap path-only view of `File[]`. Use this for `containsTypst` /
 * `pickMainTypst` checks before deciding whether to materialize the bytes
 * via `filesToTypstSources`.
 */
export function filesToTypstMeta(files: File[]): TypstSourceMeta[] {
	return files.map((f) => ({
		path:
			(f as File & { webkitRelativePath?: string }).webkitRelativePath ||
			f.name,
	}));
}

export async function filesToTypstSources(
	files: File[],
): Promise<TypstSource[]> {
	return Promise.all(
		files.map(async (f) => ({
			path:
				(f as File & { webkitRelativePath?: string }).webkitRelativePath ||
				f.name,
			data: new Uint8Array(await f.arrayBuffer()),
		})),
	);
}
