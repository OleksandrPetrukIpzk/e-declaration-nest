import { IsOptional, IsString } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  clinicName: string;

  @IsString()
  clinicAddress: string;

  @IsOptional()
  @IsString()
  clinicBio?: string;
}
