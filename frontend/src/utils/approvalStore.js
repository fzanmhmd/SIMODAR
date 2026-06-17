export const seenApprovalsKey = "simodar_seen_approvals";

export function readSeenApprovals() {
  try {
    const value = JSON.parse(localStorage.getItem(seenApprovalsKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeSeenApprovals(codes) {
  try {
    const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
    localStorage.setItem(seenApprovalsKey, JSON.stringify(uniqueCodes));
    window.dispatchEvent(new Event("simodar:approval-seen"));
  } catch {
    /* Browser storage can be unavailable in strict privacy mode. */
  }
}

export function approvalCodes(rows = []) {
  return rows.map((row) => row.kode_pengajuan).filter(Boolean);
}

export function markApprovalsSeen(rows = []) {
  const nextCodes = approvalCodes(rows);
  if (!nextCodes.length) return;
  writeSeenApprovals([...readSeenApprovals(), ...nextCodes]);
}
