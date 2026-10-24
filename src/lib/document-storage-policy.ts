import { db } from "@/lib/db";

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function organizationStorageQuotaBytes() {
  return boundedInteger(process.env.ORGANIZATION_STORAGE_QUOTA_BYTES, 104_857_600, 5_242_880, 5_368_709_120);
}

export function organizationDocumentLimit() {
  return boundedInteger(process.env.ORGANIZATION_DOCUMENT_LIMIT, 100, 1, 10_000);
}

export async function organizationHasDocumentCapacity(organizationId: string, incomingBytes: number) {
  const [count, aggregate] = await Promise.all([
    db.fileAsset.count({ where: { organizationId, deletedAt: null } }),
    db.fileAsset.aggregate({ where: { organizationId, deletedAt: null }, _sum: { sizeBytes: true } }),
  ]);
  return count < organizationDocumentLimit() && (aggregate._sum.sizeBytes ?? 0) + incomingBytes <= organizationStorageQuotaBytes();
}
