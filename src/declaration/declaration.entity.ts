import { IsDateString, IsEnum } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DeclarationStatus,
  DivisionStatus,
  DivisionType, DocumentTypes,
  EmployeeStatus,
  EmployeeType,
  Gender,
  PhoneType,
  VerificationStatus,
} from './declaration.enum';
import { User } from '../user/user.entity';

@Entity('declarations')
export class Declaration {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ unique: true })
  declaration_number: string;

  // These fields are now optional at creation - filled by doctor
  @Column({ nullable: true })
  @IsDateString()
  start_date?: string;

  @Column({ nullable: true })
  @IsDateString()
  end_date?: string;

  @Column({ nullable: true })
  @IsDateString()
  signed_at?: string | null;

  // Patient information - always present
  @Column()
  patient_email: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_email', referencedColumnName: 'email' })
  patient: User;

  // Doctor information - always present
  @Column()
  doctor_email: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'doctor_email', referencedColumnName: 'email' })
  doctor: User;

  @Column({ type: 'enum', enum: DeclarationStatus })
  @IsEnum(DeclarationStatus)
  status: DeclarationStatus;

  @Column()
  scope: string;

  @Column()
  declaration_request_id: string;

  @CreateDateColumn()
  inserted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // These fields are now optional at creation - filled by doctor
  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  reason_description?: string;

  // Person data - always present (filled by patient)
  @Column('json')
  person_data: {
    first_name: string;
    last_name: string;
    second_name: string;
    birth_date: string;
    gender: Gender;
    tax_id: string;
    birth_settlement: string;
    birth_country: string;
    verification_status: VerificationStatus;
    phones: {
      type: PhoneType;
      number: string;
    }[];
    emergency_contact: {
      first_name: string;
      last_name: string;
      second_name: string;
      phones: { type: string; number: string }[];
    };
    confidant_person?: any[];
    addresses: {
      type: string;
      country: string;
      area: string;
      region: string;
      settlement: string;
      settlement_type: string;
      settlement_id: string;
      street_type: string;
      street: string;
      building: string;
      apartment?: string;
      zip: string;
    }[];
    documents: {
      type: DocumentTypes;
      number: string;
      expiration_date?: string;
      issued_by: string;
      issued_at: string;
    }[];
  };

  // Employee data - optional at creation, filled by doctor
  @Column('json', { nullable: true })
  employee_data?: {
    position: string;
    employee_type: EmployeeType;
    status: EmployeeStatus;
    start_date: string;
    end_date: string;
    party: {
      id: string;
      first_name: string;
      last_name: string;
      second_name: string;
    };
  };

  // Division data - optional at creation, filled by doctor
  @Column('json', { nullable: true })
  division_data?: {
    name: string;
    type: DivisionType;
    status: DivisionStatus;
    mountain_group: boolean;
    dls_id: string;
    dls_verified: boolean;
  };

  // Legal Entity data - optional at creation, filled by doctor
  @Column('json', { nullable: true })
  legal_entity_data?: {
    name: string;
    short_name: string;
    legal_form: string;
    public_name: string;
    edrpou: string;
    status: string;
    email: string;
    phones: {
      type: PhoneType;
      number: string;
    }[];
    addresses: {
      type: string;
      country: string;
      area: string;
      region: string;
      settlement: string;
      settlement_type: string;
      settlement_id: string;
      street_type: string;
      street: string;
      building: string;
      apartment?: string;
      zip: string;
    }[];
  };

  // Doctor data - optional at creation, filled by doctor
  @Column('json', { nullable: true })
  doctor_data?: {
    educations: {
      country: string;
      city: string;
      institution_name: string;
      issued_date: string;
      diploma_number: string;
      degree: string;
      speciality: string;
    }[];
    qualifications: {
      type: string;
      institution_name: string;
      speciality: string;
      issued_date: string;
      certificate_number: string;
      valid_to: string;
      additional_info?: string;
    }[];
    specialities: {
      speciality: string;
      speciality_officio: boolean;
      level: string;
      qualification_type: string;
      attestation_name: string;
      attestation_date: string;
      valid_to_date: string;
      certificate_number: string;
    }[];
    science_degree?: {
      country: string;
      city: string;
      degree: string;
      institution_name: string;
      diploma_number: string;
      speciality: string;
      issued_date: string;
    };
  };

  // Urgent data - optional
  @Column('json', { nullable: true })
  urgent?: {
    authentication_method_current: {
      type: string;
      number: string;
    };
  };
}