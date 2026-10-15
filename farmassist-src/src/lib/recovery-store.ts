import { parseBackup, type Backup } from "./record-backup";

export type Checkpoint = {
  id: string;
  createdAt: string;
  reason: "manual" | "before-restore" | "import";
  backup: Backup;
};
const DB = "joitafa-recovery-v1";
const TABLE = "checkpoints";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("checkpoint"));
      return;
    }
    const request = indexedDB.open(DB, 1);
    let expired = false;
    const failed = () => {
      expired = true;
      clearTimeout(timer);
      reject(new Error("checkpoint"));
    };
    const timer = setTimeout(failed, 8000);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(TABLE, { keyPath: "id" });
    request.onerror = failed;
    request.onblocked = failed;
    request.onsuccess = () => {
      clearTimeout(timer);
      if (expired) request.result.close();
      else resolve(request.result);
    };
  });
}
export async function listCheckpoints(): Promise<Checkpoint[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TABLE, "readonly");
    const request = tx.objectStore(TABLE).getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(
        (request.result as Checkpoint[]).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error("checkpoint"));
    };
  });
}
export async function saveCheckpoints(
  items: { backup: Backup; reason: Checkpoint["reason"] }[],
) {
  const rows = items.map((item) => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason: item.reason,
    backup: parseBackup(JSON.stringify(item.backup)),
  }));
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TABLE, "readwrite");
    const store = tx.objectStore(TABLE);
    for (const row of rows) store.put(row);
    // Keep all checkpoints until the user deletes one; never silently prune their recovery copy.
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("checkpoint"));
    };
  });
}
export async function deleteCheckpoint(id: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TABLE, "readwrite");
    tx.objectStore(TABLE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("checkpoint"));
    };
  });
}
