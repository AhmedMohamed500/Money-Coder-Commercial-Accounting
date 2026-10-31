/** Domain rules only. Future scan execution must enforce authorization and atomic database conditions. */
export type DocumentScanStatus = "PENDING_SCAN" | "SCANNING" | "CLEAN" | "REJECTED" | "SCAN_FAILED";

const transitions: Readonly<Record<DocumentScanStatus, readonly DocumentScanStatus[]>> = {
  PENDING_SCAN: ["SCANNING"],
  SCANNING: ["CLEAN", "REJECTED", "SCAN_FAILED"],
  CLEAN: ["PENDING_SCAN"],
  REJECTED: ["PENDING_SCAN"],
  SCAN_FAILED: ["PENDING_SCAN"],
};

export function isAllowedScanTransition(from: DocumentScanStatus | null, to: DocumentScanStatus): boolean {
  return from !== null && transitions[from]?.includes(to) === true;
}

export function isScanApproved(status: DocumentScanStatus | null): boolean {
  return status === "CLEAN";
}

export type ScanResultIdentity = {
  status: DocumentScanStatus | null;
  revision: number;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  storageKey: string;
  expectedSha256: string;
  deletedAt: Date | null;
};

/** This is a precondition, not permission to write or publish a result. */
export function matchesCurrentScanResult(
  current: ScanResultIdentity,
  result: { revision: number; leaseToken: string; storageKey: string; expectedSha256: string; resultSha256: string },
  now: Date,
): boolean {
  return current.status === "SCANNING"
    && current.deletedAt === null
    && Number.isSafeInteger(current.revision)
    && current.revision >= 0
    && current.revision === result.revision
    && current.leaseToken !== null
    && current.leaseToken.length > 0
    && current.leaseToken === result.leaseToken
    && current.leaseExpiresAt instanceof Date
    && !Number.isNaN(current.leaseExpiresAt.getTime())
    && current.leaseExpiresAt.getTime() > now.getTime()
    && current.storageKey.length > 0
    && current.storageKey === result.storageKey
    && /^[a-f0-9]{64}$/i.test(current.expectedSha256)
    && current.expectedSha256.toLowerCase() === result.expectedSha256.toLowerCase()
    && current.expectedSha256.toLowerCase() === result.resultSha256.toLowerCase();
}
