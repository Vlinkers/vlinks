
-- Enum: type d'evenement dans la vie du vehicule
CREATE TYPE public.event_type AS ENUM (
  'purchase',
  'sale',
  'accident',
  'repair',
  'maintenance',
  'inspection',
  'modification',
  'recall',
  'insurance_claim',
  'listing',
  'import_export',
  'registration',
  'mileage_record',
  'other'
);

-- Enum: role du contributeur au moment du depot
CREATE TYPE public.contributor_role AS ENUM (
  'owner_verified',
  'owner_unverified',
  'former_owner',
  'buyer',
  'mechanic',
  'inspector',
  'dealer',
  'witness',
  'anonymous'
);

-- Enum: niveau de preuve d'un fait
CREATE TYPE public.proof_tier AS ENUM (
  'declaration',
  'documented',
  'verified'
);

-- Enum: statut de moderation
CREATE TYPE public.moderation_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'flagged'
);

-- Enum: face de la contribution
CREATE TYPE public.contribution_face AS ENUM (
  'face_a',
  'face_b'
);

-- Enum: type de verification proprietaire
CREATE TYPE public.owner_verification_tier AS ENUM (
  'certificate_only',
  'certificate_plus_vin',
  'chain_of_trust'
);

-- Enum: type de signal d'alerte
CREATE TYPE public.red_flag_type AS ENUM (
  'odometer_rollback',
  'title_wash',
  'flood_damage',
  'frame_damage',
  'stolen',
  'lemon',
  'salvage_rebuilt',
  'inconsistent_history',
  'suspicious_listing',
  'other'
);
