import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sha256 } from "@/lib/security";

const MIME_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  "application/pdf": (b) => b.subarray(0, 5).toString() === "%PDF-",
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b) => b[0] === 0x50 && b[1] === 0x4b,
};

export async function validateUpload(file: File) {
  const max = Number(process.env.MAX_UPLOAD_BYTES ?? 5_242_880);
  if (!MIME_SIGNATURES[file.type]) throw new Error("نوع الملف غير مسموح. استخدم PDF أو PNG أو JPG أو XLSX.");
  if (file.size <= 0 || file.size > max) throw new Error("حجم الملف غير مسموح.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!MIME_SIGNATURES[file.type](buffer)) throw new Error("محتوى الملف لا يطابق نوعه المعلن.");
  return buffer;
}

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), "storage");

function storageRoot() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("التخزين الخاص غير مهيأ للإنتاج.");
  }
  return LOCAL_STORAGE_ROOT;
}

function safeStoragePath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(storageKey)) throw new Error("مفتاح التخزين غير صالح.");
  const target = path.join(storageRoot(), storageKey);
  if (!target.startsWith(`${storageRoot()}${path.sep}`)) throw new Error("مسار التخزين غير صالح.");
  return target;
}

export async function savePrivateFile(organizationId: string, file: File, bytes: Buffer) {
  const root = storageRoot();
  const folder = path.join(root, organizationId);
  await mkdir(folder, { recursive: true });
  const key = `${organizationId}/${randomUUID()}`;
  await writeFile(path.join(root, key), bytes, { flag: "wx" });
  return { storageKey: key.replaceAll("\\", "/"), sha256: sha256(bytes), provider: "local-dev" };
}

export async function readPrivateFile(storageKey: string) {
  return readFile(safeStoragePath(storageKey));
}

export async function deletePrivateFile(storageKey: string) {
  await unlink(safeStoragePath(storageKey)).catch(() => undefined);
}
