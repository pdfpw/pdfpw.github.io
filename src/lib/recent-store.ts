import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export type RecentFile = {
	id: string;
	name: string;
	lastOpened: number;
	handle?: FileSystemFileHandle;
	configHandle?: FileSystemFileHandle;
	configName?: string;
};

const DB_NAME = "pdfpw";
const DB_STORE = "recentFiles";
const DB_VERSION = 1;

interface RecentSchema extends DBSchema {
	recentFiles: {
		key: string;
		value: RecentFile;
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
			upgrade(db) {
				if (!db.objectStoreNames.contains(DB_STORE)) {
					db.createObjectStore(DB_STORE, { keyPath: "id" });
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
	return db.getAll(DB_STORE);
}

export async function getRecentFileById(
	db: IDBPDatabase<RecentSchema>,
	id: string,
): Promise<RecentFile | undefined> {
	return db.get(DB_STORE, id);
}

export async function upsertRecent(
	db: IDBPDatabase<RecentSchema>,
	entry: RecentFile,
) {
	await db.put(DB_STORE, entry);
}

export async function removeRecent(db: IDBPDatabase<RecentSchema>, id: string) {
	await db.delete(DB_STORE, id);
}

export async function clearRecentStore(db: IDBPDatabase<RecentSchema>) {
	await db.clear(DB_STORE);
}
