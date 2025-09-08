// src/dto/legal-entity.dto.ts
import { IsString, IsEmail, ValidateNested, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PhoneType } from '../declaration/declaration.enum';

export class PhoneDto {
  @ApiProperty({ enum: PhoneType, description: 'Phone type' })
  @IsString()
  type: PhoneType;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  number: string;
}

export class AddressDto {
  @ApiProperty({ description: 'Address type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Area' })
  @IsString()
  area: string;

  @ApiProperty({ description: 'Region' })
  @IsString()
  region: string;

  @ApiProperty({ description: 'Settlement' })
  @IsString()
  settlement: string;

  @ApiProperty({ description: 'Settlement type' })
  @IsString()
  settlement_type: string;

  @ApiProperty({ description: 'Settlement ID' })
  @IsString()
  settlement_id: string;

  @ApiProperty({ description: 'Street type' })
  @IsString()
  street_type: string;

  @ApiProperty({ description: 'Street' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'Building' })
  @IsString()
  building: string;

  @ApiPropertyOptional({ description: 'Apartment' })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({ description: 'ZIP code' })
  @IsString()
  zip: string;
}

export class CreateLegalEntityDto {
  @ApiProperty({ description: 'Legal entity name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Short name' })
  @IsString()
  short_name: string;

  @ApiProperty({ description: 'Legal form' })
  @IsString()
  legal_form: string;

  @ApiProperty({ description: 'Public name' })
  @IsString()
  public_name: string;

  @ApiProperty({ description: 'EDRPOU code' })
  @IsString()
  edrpou: string;

  @ApiProperty({ description: 'Status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;

  @ApiProperty({ type: [PhoneDto], description: 'Phones' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones: PhoneDto[];

  @ApiProperty({ type: [AddressDto], description: 'Addresses' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses: AddressDto[];
}

export class UpdateLegalEntityDto extends PartialType(CreateLegalEntityDto) {}

export class LegalEntitySearchDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Search by EDRPOU' })
  @IsOptional()
  @IsString()
  edrpou?: string;

  @ApiPropertyOptional({ description: 'Search by email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by legal form' })
  @IsOptional()
  @IsString()
  legal_form?: string;
}