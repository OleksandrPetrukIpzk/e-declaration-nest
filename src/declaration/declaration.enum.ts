export enum DeclarationStatus {
  PENDING_DOCTOR_REVIEW = 'pending_doctor_review',
  PENDING_DOCTOR_SIGN = 'pending_doctor_sign',
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  REJECTED = 'rejected',
}

export enum DivisionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum DivisionType {
  CLINIC = 'clinic',
  HOSPITAL = 'hospital',
  AMBULATORY = 'ambulatory',
  PHARMACY = 'pharmacy',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum EmployeeType {
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PHARMACIST = 'pharmacist',
  ADMIN = 'admin',
  'Hospital' = 1,
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum PhoneType {
  MOBILE = 'mobile',
  LANDLINE = 'landline',
  WORK = 'work',
}

export enum VerificationStatus {
  VERIFIED = 'verified',
  NOT_VERIFIED = 'not_verified',
  PENDING = 'pending',
}

export enum DocumentTypes {
  PASSPORT = 'PASSPORT',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  NATIONAL_ID = 'NATIONAL_ID',
}
