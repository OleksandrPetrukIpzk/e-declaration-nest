import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DivisionStatus,
  DivisionType,
  DocumentTypes,
  EmployeeStatus,
  EmployeeType,
  Gender,
  PhoneType,
  VerificationStatus,
} from './declaration.enum';

export class PhoneDto {
  @IsEnum(PhoneType)
  type: PhoneType;

  @IsString()
  @IsNotEmpty()
  number: string;
}

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  second_name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones: PhoneDto[];
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  area: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  settlement: string;

  @IsString()
  @IsNotEmpty()
  settlement_type: string;

  @IsString()
  @IsNotEmpty()
  settlement_id: string;

  @IsString()
  @IsNotEmpty()
  street_type: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  building: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsString()
  @IsNotEmpty()
  zip: string;
}

export class DocumentDto {
  @IsEnum(DocumentTypes)
  type: DocumentTypes;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsOptional()
  @IsDateString()
  expiration_date?: string;

  @IsString()
  @IsNotEmpty()
  issued_by: string;

  @IsDateString()
  issued_at: string;
}

export class PersonDataDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  second_name: string;

  @IsDateString()
  birth_date: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  tax_id: string;

  @IsString()
  @IsNotEmpty()
  birth_settlement: string;

  @IsString()
  @IsNotEmpty()
  birth_country: string;

  @IsEnum(VerificationStatus)
  verification_status: VerificationStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones: PhoneDto[];

  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergency_contact: EmergencyContactDto;

  @IsOptional()
  @IsArray()
  confidant_person?: any[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses: AddressDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];
}

export class PartyDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  second_name: string;
}

export class EmployeeDataDto {
  @IsString()
  @IsNotEmpty()
  position: string;

  @IsEnum(EmployeeType)
  employee_type: EmployeeType;

  @IsEnum(EmployeeStatus)
  status: EmployeeStatus;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @ValidateNested()
  @Type(() => PartyDto)
  party: PartyDto;
}

export class DivisionDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DivisionType)
  type: DivisionType;

  @IsEnum(DivisionStatus)
  status: DivisionStatus;

  @IsBoolean()
  mountain_group: boolean;

  @IsString()
  @IsNotEmpty()
  dls_id: string;

  @IsBoolean()
  dls_verified: boolean;
}

export class LegalEntityDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  short_name: string;

  @IsString()
  @IsNotEmpty()
  legal_form: string;

  @IsString()
  @IsNotEmpty()
  public_name: string;

  @IsString()
  @IsNotEmpty()
  edrpou: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsEmail()
  email: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones: PhoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses: AddressDto[];
}

export class EducationDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  institution_name: string;

  @IsDateString()
  issued_date: string;

  @IsString()
  @IsNotEmpty()
  diploma_number: string;

  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  speciality: string;
}

export class QualificationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  institution_name: string;

  @IsString()
  @IsNotEmpty()
  speciality: string;

  @IsDateString()
  issued_date: string;

  @IsString()
  @IsNotEmpty()
  certificate_number: string;

  @IsDateString()
  valid_to: string;

  @IsOptional()
  @IsString()
  additional_info?: string;
}

export class SpecialityDto {
  @IsString()
  @IsNotEmpty()
  speciality: string;

  @IsBoolean()
  speciality_officio: boolean;

  @IsString()
  @IsNotEmpty()
  level: string;

  @IsString()
  @IsNotEmpty()
  qualification_type: string;

  @IsString()
  @IsNotEmpty()
  attestation_name: string;

  @IsDateString()
  attestation_date: string;

  @IsDateString()
  valid_to_date: string;

  @IsString()
  @IsNotEmpty()
  certificate_number: string;
}

export class ScienceDegreeDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  institution_name: string;

  @IsString()
  @IsNotEmpty()
  diploma_number: string;

  @IsString()
  @IsNotEmpty()
  speciality: string;

  @IsDateString()
  issued_date: string;
}

export class DoctorDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  educations: EducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationDto)
  qualifications: QualificationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecialityDto)
  specialities: SpecialityDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScienceDegreeDto)
  science_degree?: ScienceDegreeDto;
}

export class AuthenticationMethodDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  number: string;
}

export class UrgentDto {
  @ValidateNested()
  @Type(() => AuthenticationMethodDto)
  authentication_method_current: AuthenticationMethodDto;
}

export class CreatePatientDeclarationDto {
  doctor_email: string;

  scope: string;

  declaration_request_id: string;

  @ValidateNested()
  @Type(() => PersonDataDto)
  person_data: PersonDataDto;
}

export class DoctorCompleteDeclarationDto {
  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  reason_description?: string;

  @ValidateNested()
  @Type(() => EmployeeDataDto)
  employee_data: EmployeeDataDto;

  @ValidateNested()
  @Type(() => DivisionDataDto)
  division_data: DivisionDataDto;

  @ValidateNested()
  @Type(() => LegalEntityDataDto)
  legal_entity_data: LegalEntityDataDto;

  @ValidateNested()
  @Type(() => DoctorDataDto)
  doctor_data: DoctorDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UrgentDto)
  urgent?: UrgentDto;
}

export class CreateDeclarationDto {
  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  doctor_email: string;

  scope: string;

  @IsUUID()
  declaration_request_id: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  reason_description?: string;

  @ValidateNested()
  @Type(() => PersonDataDto)
  person_data: PersonDataDto;

  @ValidateNested()
  @Type(() => EmployeeDataDto)
  employee_data: EmployeeDataDto;

  @ValidateNested()
  @Type(() => DivisionDataDto)
  division_data: DivisionDataDto;

  @ValidateNested()
  @Type(() => LegalEntityDataDto)
  legal_entity_data: LegalEntityDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UrgentDto)
  urgent?: UrgentDto;
}

export class DoctorReviewDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  reason_description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonDataDto)
  person_data?: PersonDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeDataDto)
  employee_data?: EmployeeDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DivisionDataDto)
  division_data?: DivisionDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LegalEntityDataDto)
  legal_entity_data?: LegalEntityDataDto;

  @ValidateNested()
  @Type(() => DoctorDataDto)
  doctor_data: DoctorDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UrgentDto)
  urgent?: UrgentDto;
}

export class DoctorSignDto {
  @IsOptional()
  @IsString()
  reason_description?: string;
}

export class UpdateDeclarationDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  doctor_email?: string;

  @IsOptional()
  scope?: string;

  @IsOptional()
  @IsUUID()
  declaration_request_id?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reason_description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonDataDto)
  person_data?: PersonDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeDataDto)
  employee_data?: EmployeeDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DivisionDataDto)
  division_data?: DivisionDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LegalEntityDataDto)
  legal_entity_data?: LegalEntityDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UrgentDto)
  urgent?: UrgentDto;
}

export class UpdatePatientDeclarationDto {
  @IsOptional()
  doctor_email?: string;

  @IsOptional()
  scope?: string;

  @IsOptional()
  @IsUUID()
  declaration_request_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonDataDto)
  person_data?: PersonDataDto;
}

export class DoctorListDto {
  email: string;
  name: string;
  specialty?: string;
  division?: string;
  available_slots: number;
}
