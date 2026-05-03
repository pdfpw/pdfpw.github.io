import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export interface RecentPdfFile {
	kind?: "pdf";
	id: string;
	name: string;
	handle?: FileSystemFileHandle;
	configHandle?: FileSystemFileHandle;
	configName?: string;
	file?: File;
	configFile?: File;
	lastOpened: number;
	thumbnail?: string;
}

export interface RecentTypstFile {
	kind: "typst";
	id: string;
	name: string;
	mainPath: string;
	handle?: FileSystemFileHandle;
	assetHandles?: FileSystemFileHandle[];
	file?: File;
	assetFiles?: File[];
	configHandle?: FileSystemFileHandle;
	configFile?: File;
	configName?: string;
	lastOpened: number;
	thumbnail?: string;
}

export type RecentFile = RecentPdfFile | RecentTypstFile;

export type Settings = {
	saveHistory: boolean;
};

const DB_NAME = "pdfpw";
const DB_STORE = "recentFiles";
const DB_SETTINGS_STORE = "settings";
const DB_VERSION = 2;

interface RecentSchema extends DBSchema {
	recentFiles: {
		key: string;
		value: RecentFile;
	};
	settings: {
		key: string;
		value: boolean;
	};
}

export type RecentDb = IDBPDatabase<RecentSchema>;
let cachedDbPromise: Promise<RecentDb> | null = null;
export function openDb(): Promise<RecentDb> {
	if (cachedDbPromise) return cachedDbPromise;
	const currentDbPromise = (cachedDbPromise = openDB<RecentSchema>(
		DB_NAME,
		DB_VERSION,
		{
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					db.createObjectStore(DB_STORE, { keyPath: "id" });
				}
				if (oldVersion < 2) {
					if (!db.objectStoreNames.contains(DB_SETTINGS_STORE)) {
						db.createObjectStore(DB_SETTINGS_STORE);
					}
				}
			},
		},
	).then((db) => {
		db.addEventListener(
			"close",
			() => {
				if (cachedDbPromise === currentDbPromise) cachedDbPromise = null;
			},
			{ once: true },
		);
		setTimeout(() => {
			if (cachedDbPromise === currentDbPromise) cachedDbPromise = null;
		}, 10000);
		return db;
	}));
	return cachedDbPromise;
}

export async function getRecentFiles(
	db: IDBPDatabase<RecentSchema>,
): Promise<RecentFile[]> {
	const all = await db.getAll(DB_STORE);
	// Migration: entries stored before the discriminated union had no `kind`.
	// Treat missing `kind` as "pdf".
	return all.map((item) =>
		item.kind === undefined ? { ...item, kind: "pdf" as const } : item,
	);
}

export async function getRecentFileById(
	db: IDBPDatabase<RecentSchema>,
	id: string,
): Promise<RecentFile | undefined> {
	const item = await db.get(DB_STORE, id);
	if (!item) return undefined;
	// Migration: entries stored before the discriminated union had no `kind`.
	return item.kind === undefined ? { ...item, kind: "pdf" as const } : item;
}

export async function upsertRecent(
	db: IDBPDatabase<RecentSchema>,
	entry: RecentFile,
) {
	// Duplication check: if there's an existing file with the same name, remove it first.
	// This ensures that we don't have multiple entries for "example.pdf" (one snapshot, one handle, etc.)
	// and enables "overwrite" behavior where the latest open wins.
	const tx = db.transaction(DB_STORE, "readwrite");
	const store = tx.objectStore(DB_STORE);
	const all = await store.getAll();
	const duplicates = all.filter(
		(item) => item.name === entry.name && item.id !== entry.id,
	);

	await Promise.all(duplicates.map((item) => store.delete(item.id)));
	await store.put(entry);
	await tx.done;
}

export async function removeRecent(db: IDBPDatabase<RecentSchema>, id: string) {
	await db.delete(DB_STORE, id);
}

export async function clearRecentStore(db: IDBPDatabase<RecentSchema>) {
	await db.clear(DB_STORE);
}

export async function getSettings(
	db: IDBPDatabase<RecentSchema>,
): Promise<Settings> {
	const saveHistory = await db.get(DB_SETTINGS_STORE, "saveHistory");
	return {
		saveHistory: saveHistory ?? true,
	};
}

export async function updateSettings(
	db: IDBPDatabase<RecentSchema>,
	settings: Partial<Settings>,
) {
	if (settings.saveHistory !== undefined) {
		await db.put(DB_SETTINGS_STORE, settings.saveHistory, "saveHistory");
	}
}
