export type EvidenceMediaType = "vehicle_photo" | "document" | "diagnostic" | "maintenance_evidence";

const PHOTO_EVIDENCE_TYPES = new Set(["photo", "image", "vehicle_photo"]);
const DOCUMENT_MEDIA_TYPES = new Set<EvidenceMediaType>(["document", "diagnostic", "maintenance_evidence"]);
const DOSSIER_DOCUMENT_MEDIA_TYPES = new Set<EvidenceMediaType>(["document", "maintenance_evidence"]);

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
  media_type?: string | null;
};

export const EVIDENCE_MEDIA_TYPE = {
  vehiclePhoto: "vehicle_photo",
  document: "document",
  diagnostic: "diagnostic",
  maintenanceEvidence: "maintenance_evidence",
} as const satisfies Record<string, EvidenceMediaType>;

export type EvidenceUploadContext = "testimony" | "document" | "alert" | "maintenance" | "owner_response";

function normalizedMediaType(ev: EvidenceLike): EvidenceMediaType | null {
  const mediaType = (ev.media_type ?? "").trim().toLowerCase();
  if (["vehicle_photo", "document", "diagnostic", "maintenance_evidence"].includes(mediaType)) {
    return mediaType as EvidenceMediaType;
  }
  return null;
}

function normalizedEvidenceType(ev: EvidenceLike) {
  return (ev.evidence_type ?? "").trim().toLowerCase();
}

function normalizedFileType(ev: EvidenceLike) {
  return (ev.file_type ?? "").trim().toLowerCase();
}

export function isVehiclePhotoEvidence(ev: EvidenceLike) {
  const mediaType = normalizedMediaType(ev);
  if (mediaType) return mediaType === "vehicle_photo";

  const evidenceType = normalizedEvidenceType(ev);
  const fileType = normalizedFileType(ev);

  return PHOTO_EVIDENCE_TYPES.has(evidenceType) || (!evidenceType && fileType.startsWith("image/"));
}

export function isDocumentEvidence(ev: EvidenceLike) {
  const mediaType = normalizedMediaType(ev);
  if (mediaType) return DOCUMENT_MEDIA_TYPES.has(mediaType);

  const evidenceType = normalizedEvidenceType(ev);
  const fileType = normalizedFileType(ev);

  return DOCUMENT_EVIDENCE_TYPES.has(evidenceType) || (!evidenceType && !fileType.startsWith("image/")) || fileType === "application/pdf";
}

export function isDossierDocumentEvidence(ev: EvidenceLike) {
  const mediaType = normalizedMediaType(ev);
  if (mediaType) return DOSSIER_DOCUMENT_MEDIA_TYPES.has(mediaType);

  return isDocumentEvidence(ev);
}

export function classifyUploadMediaType(
  context: EvidenceUploadContext,
  evidenceType: string | null | undefined,
  fileType: string | null | undefined
): EvidenceMediaType {
  if (context === "document") return EVIDENCE_MEDIA_TYPE.document;
  if (context === "alert") return EVIDENCE_MEDIA_TYPE.diagnostic;
  if (context === "maintenance") return EVIDENCE_MEDIA_TYPE.maintenanceEvidence;

  const type = (evidenceType ?? "").trim().toLowerCase();
  const mime = (fileType ?? "").trim().toLowerCase();
  const isVehiclePhoto = PHOTO_EVIDENCE_TYPES.has(type) && mime.startsWith("image/");

  return isVehiclePhoto ? EVIDENCE_MEDIA_TYPE.vehiclePhoto : EVIDENCE_MEDIA_TYPE.document;
}