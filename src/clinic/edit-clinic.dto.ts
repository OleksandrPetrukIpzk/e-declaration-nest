import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  clinicBio?: string;

  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}
