import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DivisionStatus, DivisionType } from '../declaration/declaration.enum';

export class CreateDivisionDto {
  @ApiProperty({ description: 'Division name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DivisionType, description: 'Division type' })
  @IsEnum(DivisionType)
  type: DivisionType;

  @ApiProperty({ enum: DivisionStatus, description: 'Division status' })
  @IsEnum(DivisionStatus)
  status: DivisionStatus;

  @ApiPropertyOptional({ description: 'Is mountain group', default: false })
  @IsOptional()
  @IsBoolean()
  mountain_group?: boolean;

  @ApiProperty({ description: 'DLS ID' })
  @IsString()
  dls_id: string;

  @ApiPropertyOptional({ description: 'DLS verified', default: false })
  @IsOptional()
  @IsBoolean()
  dls_verified?: boolean;
}

export class UpdateDivisionDto extends PartialType(CreateDivisionDto) {}

export class DivisionSearchDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DivisionType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(DivisionType)
  type?: DivisionType;

  @ApiPropertyOptional({ enum: DivisionStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DivisionStatus)
  status?: DivisionStatus;

  @ApiPropertyOptional({ description: 'Filter by mountain group' })
  @IsOptional()
  @IsBoolean()
  mountain_group?: boolean;

  @ApiPropertyOptional({ description: 'Filter by DLS verified' })
  @IsOptional()
  @IsBoolean()
  dls_verified?: boolean;
}