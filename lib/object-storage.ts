import { env } from "cloudflare:workers";

type StorageEnv = { STORAGE: R2Bucket };

function bucket() {
  const storage = (env as unknown as StorageEnv).STORAGE;
  if (!storage) throw new Error("Object storage is unavailable.");
  return storage;
}

export function putObject(key: string, value: ReadableStream, options?: R2PutOptions) {
  return bucket().put(key, value, options);
}

export function getObject(key: string) {
  return bucket().get(key);
}

export function deleteObject(key: string) {
  return bucket().delete(key);
}
