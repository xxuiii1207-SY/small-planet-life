"use client";

import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";
import {
  type AppData,
  type AppPreferences,
  type DiarySecurity,
  type ImageAsset,
  createDemoData,
  defaultPreferences,
  makeId,
} from "./model";

const DB_NAME = "small-planet-v1";
const DB_VERSION = 1;
const DATA_STORE = "appData";
const ASSET_STORE = "assets";
const PREFS_KEY = "small-planet-preferences";
const SECURITY_KEY = "small-planet-diary-security";

interface StoredData {
  key: "main";
  data: AppData;
}

interface EncryptedBackup {
  format: "small-planet-encrypted-backup";
  version: 1;
  salt: string;
  iv: string;
  cipherText: string;
}

interface BackupPayload {
  manifest: {
    backupFormatVersion: 1;
    schemaVersion: number;
    appVersion: string;
    exportedAt: string;
    timeZone: string;
    imageCount: number;
  };
  data: AppData;
  preferences: AppPreferences;
  security: DiarySecurity | null;
  assets: Array<Omit<ImageAsset, "blob"> & { data: string }>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("本地数据库操作失败"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("本地数据库事务已取消"));
    transaction.onerror = () => reject(transaction.error ?? new Error("本地数据库写入失败"));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("当前浏览器无法使用本地数据库，请退出隐私模式或更换浏览器。 ");
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DATA_STORE)) {
        database.createObjectStore(DATA_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        database.createObjectStore(ASSET_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地数据库"));
    request.onblocked = () => reject(new Error("数据库升级被其他页面阻塞，请关闭其他小小星球页面后重试。"));
  });
}

export async function loadAppData(): Promise<AppData> {
  const database = await openDatabase();
  const transaction = database.transaction(DATA_STORE, "readonly");
  const record = await requestResult(
    transaction.objectStore(DATA_STORE).get("main") as IDBRequest<StoredData | undefined>,
  );
  database.close();
  if (record?.data) return record.data;
  const initial = createDemoData();
  await saveAppData(initial);
  return initial;
}

export async function saveAppData(data: AppData): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(DATA_STORE, "readwrite");
  transaction.objectStore(DATA_STORE).put({ key: "main", data } satisfies StoredData);
  await transactionDone(transaction);
  database.close();
}

export async function replaceDatabase(
  data: AppData,
  assets: ImageAsset[],
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([DATA_STORE, ASSET_STORE], "readwrite");
  const dataStore = transaction.objectStore(DATA_STORE);
  const assetStore = transaction.objectStore(ASSET_STORE);
  dataStore.clear();
  assetStore.clear();
  dataStore.put({ key: "main", data } satisfies StoredData);
  assets.forEach((asset) => assetStore.put(asset));
  await transactionDone(transaction);
  database.close();
}

export async function saveAsset(asset: ImageAsset): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readwrite");
  transaction.objectStore(ASSET_STORE).put(asset);
  await transactionDone(transaction);
  database.close();
}

export async function saveDataAndAssets(
  data: AppData,
  assets: ImageAsset[],
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([DATA_STORE, ASSET_STORE], "readwrite");
  transaction.objectStore(DATA_STORE).put({ key: "main", data } satisfies StoredData);
  const assetStore = transaction.objectStore(ASSET_STORE);
  assets.forEach((asset) => assetStore.put(asset));
  await transactionDone(transaction);
  database.close();
}

export async function getAsset(id: string): Promise<ImageAsset | null> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readonly");
  const asset = await requestResult(
    transaction.objectStore(ASSET_STORE).get(id) as IDBRequest<ImageAsset | undefined>,
  );
  database.close();
  return asset ?? null;
}

export async function getAllAssets(): Promise<ImageAsset[]> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readonly");
  const assets = await requestResult(
    transaction.objectStore(ASSET_STORE).getAll() as IDBRequest<ImageAsset[]>,
  );
  database.close();
  return assets;
}

export async function deleteAsset(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readwrite");
  transaction.objectStore(ASSET_STORE).delete(id);
  await transactionDone(transaction);
  database.close();
}

export function loadPreferences(): AppPreferences {
  if (typeof localStorage === "undefined") return defaultPreferences;
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (!saved) return defaultPreferences;
    const parsed = JSON.parse(saved) as Partial<AppPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      homeSizes: { ...defaultPreferences.homeSizes, ...(parsed.homeSizes ?? {}) },
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: AppPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}

export function loadDiarySecurity(): DiarySecurity | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const saved = localStorage.getItem(SECURITY_KEY);
    return saved ? (JSON.parse(saved) as DiarySecurity) : null;
  } catch {
    return null;
  }
}

export function saveDiarySecurity(security: DiarySecurity | null): void {
  if (security) localStorage.setItem(SECURITY_KEY, JSON.stringify(security));
  else localStorage.removeItem(SECURITY_KEY);
}

function randomString(bytes = 16): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return toBase64(buffer);
}

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join("-");
}

async function hashSecret(secret: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64(new Uint8Array(digest));
}

export async function createDiarySecurity(
  pin: string,
  hint: string,
): Promise<{ security: DiarySecurity; recoveryCode: string }> {
  const pinSalt = randomString();
  const recoverySalt = randomString();
  const recoveryCode = generateRecoveryCode();
  return {
    recoveryCode,
    security: {
      pinSalt,
      pinVerifier: await hashSecret(pin, pinSalt),
      pinHint: hint.trim(),
      recoverySalt,
      recoveryVerifier: await hashSecret(recoveryCode, recoverySalt),
      recoveryCreatedAt: new Date().toISOString(),
    },
  };
}

export async function verifyPin(pin: string, security: DiarySecurity): Promise<boolean> {
  return (await hashSecret(pin, security.pinSalt)) === security.pinVerifier;
}

export async function verifyRecoveryCode(
  code: string,
  security: DiarySecurity,
): Promise<boolean> {
  return (
    (await hashSecret(code.trim().toUpperCase(), security.recoverySalt)) ===
    security.recoveryVerifier
  );
}

export async function compressImage(
  file: File,
  ownerType: string,
  ownerId: string | null,
  role: string,
  sortOrder: number,
): Promise<ImageAsset> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1920;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法压缩图片");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (output) => (output ? resolve(output) : reject(new Error("图片压缩失败"))),
      "image/webp",
      0.82,
    );
  });
  return {
    id: makeId("asset"),
    ownerType,
    ownerId,
    role,
    sortOrder,
    blob,
    mimeType: blob.type || "image/webp",
    width,
    height,
    byteSize: blob.size,
    createdAt: new Date().toISOString(),
  };
}

export async function assetObjectUrl(id: string): Promise<string | null> {
  const asset = await getAsset(id);
  return asset ? URL.createObjectURL(asset.blob) : null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return toBase64(new Uint8Array(await blob.arrayBuffer()));
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(payload: BackupPayload, password: string): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const clear = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, clear);
  return {
    format: "small-planet-encrypted-backup",
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    cipherText: toBase64(new Uint8Array(cipher)),
  };
}

async function decryptPayload(
  backup: EncryptedBackup,
  password: string,
): Promise<BackupPayload> {
  if (backup.format !== "small-planet-encrypted-backup" || backup.version !== 1) {
    throw new Error("这不是受支持的小小星球备份文件");
  }
  try {
    const key = await deriveKey(password, fromBase64(backup.salt));
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(backup.iv) },
      key,
      fromBase64(backup.cipherText),
    );
    return JSON.parse(new TextDecoder().decode(clear)) as BackupPayload;
  } catch {
    throw new Error("备份密码不正确，或文件已经损坏。");
  }
}

export async function exportEncryptedBackup(
  data: AppData,
  preferences: AppPreferences,
  security: DiarySecurity | null,
  password: string,
): Promise<Blob> {
  const assets = await getAllAssets();
  const payload: BackupPayload = {
    manifest: {
      backupFormatVersion: 1,
      schemaVersion: data.schemaVersion,
      appVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      imageCount: assets.length,
    },
    data,
    preferences,
    security,
    assets: await Promise.all(
      assets.map(async ({ blob, ...asset }) => ({ ...asset, data: await blobToBase64(blob) })),
    ),
  };
  const encrypted = await encryptPayload(payload, password);
  const writer = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(writer);
  await zipWriter.add(
    "small-planet-backup.enc",
    new TextReader(JSON.stringify(encrypted)),
  );
  return zipWriter.close();
}

export async function readEncryptedBackup(
  file: File,
  password: string,
): Promise<{ data: AppData; preferences: AppPreferences; security: DiarySecurity | null; assets: ImageAsset[] }> {
  const reader = new ZipReader(new BlobReader(file));
  const entries = await reader.getEntries();
  const entry = entries.find(
    (candidate) => !candidate.directory && candidate.filename === "small-planet-backup.enc",
  );
  if (!entry || entry.directory) {
    await reader.close();
    throw new Error("备份文件结构不完整");
  }
  const text = await entry.getData(new TextWriter());
  await reader.close();
  const payload = await decryptPayload(JSON.parse(text) as EncryptedBackup, password);
  const assets: ImageAsset[] = payload.assets.map(({ data, ...asset }) => ({
    ...asset,
    blob: new Blob([fromBase64(data)], { type: asset.mimeType }),
  }));
  return {
    data: payload.data,
    preferences: { ...defaultPreferences, ...payload.preferences },
    security: payload.security,
    assets,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
