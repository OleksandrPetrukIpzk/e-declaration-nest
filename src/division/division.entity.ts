import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { DivisionType, DivisionStatus } from '../declaration/declaration.enum';

@Entity('divisions')
export class Division {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  name: string;

  @Column({ type: 'enum', enum: DivisionType })
  @IsEnum(DivisionType)
  type: DivisionType;

  @Column({ type: 'enum', enum: DivisionStatus })
  @IsEnum(DivisionStatus)
  status: DivisionStatus;

  @Column({ default: false })
  @IsBoolean()
  mountain_group: boolean;

  @Column()
  @IsString()
  dls_id: string;

  @Column({ default: false })
  @IsBoolean()
  dls_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
