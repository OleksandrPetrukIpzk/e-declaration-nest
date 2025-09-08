import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsString, IsEmail, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PhoneType } from '../declaration/declaration.enum';

class PhoneDto {
  @IsString()
  type: PhoneType;

  @IsString()
  number: string;
}

class AddressDto {
  @IsString()
  type: string;

  @IsString()
  country: string;

  @IsString()
  area: string;

  @IsString()
  region: string;

  @IsString()
  settlement: string;

  @IsString()
  settlement_type: string;

  @IsString()
  settlement_id: string;

  @IsString()
  street_type: string;

  @IsString()
  street: string;

  @IsString()
  building: string;

  @IsString()
  apartment?: string;

  @IsString()
  zip: string;
}

@Entity('legal_entities')
export class LegalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  name: string;

  @Column()
  @IsString()
  short_name: string;

  @Column()
  @IsString()
  legal_form: string;

  @Column()
  @IsString()
  public_name: string;

  @Column({ unique: true })
  @IsString()
  edrpou: string;

  @Column()
  @IsString()
  status: string;

  @Column()
  @IsEmail()
  email: string;

  @Column('json')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones: PhoneDto[];

  @Column('json')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses: AddressDto[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}