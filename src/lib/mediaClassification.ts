const PHOTO_EVIDENCE_TYPES = new Set(["photo", "image", "vehicle_photo"]);

const DOCUMENT_EVIDENCE_TYPES = new Set([
  "document",
  "invoice",
  "inspection_report",
  "insurance_doc",
  "registration",
  "listing_screenshot",
  "vehicle_history",
  "other_document",
  "other",
]);

type EvidenceLike = {
  evidence_type: string | null;
  file_type: string | null;
};

function normalizedEvidenceType(ev: EvidenceLike) {
  return (ev.evidence_type ?? "").trim().toLowerCase();
}

function normalizedFileType(ev: EvidenceLike) {
  return (ev.file_type ?? "").trim().toLowerCase();
}

export function isVehiclePhotoEvidence(ev: EvidenceLike) {
  const evidenceType = normalizedEvidenceType(ev);
  const fileType = normalizedFileType(ev);

  return PHOTO_EVIDENCE_TYPES.has(evidenceType) || (!evidenceType && fileType.startsWith("image/"));
}

export function isDocumentEvidence(ev: EvidenceLike) {
  const evidenceType = normalizedEvidenceType(ev);
  const fileType = normalizedFileType(ev);

  return DOCUMENT_EVIDENCE_TYPES.has(evidenceType) || (!evidenceType && !fileType.startsWith("image/")) || fileType === "application/pdf";
}