import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Clinic } from '../clinic/clinic.entity';
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  email: string;

  @Column({ nullable: true })
  firstName: string | null;

  @Column({ nullable: true })
  lastName: string | null;

  @Column({ nullable: true })
  phone?: number | null;

  @Column({ nullable: true })
  bio?: string | null;

  @Column({ nullable: true })
  address?: string | null;

  @Column({ nullable: true })
  region?: string | null;

  @ManyToOne(() => Clinic, (clinic) => clinic.clinicAdmins)
  clinic?: Clinic | null;

  @Column()
  role: number | null;

  @Column({ nullable: true })
  profession?: string | null;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  refreshToken: string;

  @ManyToMany(() => User, (user) => user.connections)
  @JoinTable()
  connections?: User[] | null;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12);
  }
}
