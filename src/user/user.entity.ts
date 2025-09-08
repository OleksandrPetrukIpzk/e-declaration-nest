import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Clinic } from '../clinic/clinic.entity';
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  firstName: string | null;

  @Column({ nullable: true })
  lastName: string | null;

  @Column({ nullable: true })
  phone?: string | null;

  @Column({ nullable: true })
  bio?: string | null;

  @Column({ nullable: true })
  address?: string | null;

  @Column({ nullable: true })
  region?: string | null;

  @ManyToMany(() => Clinic, (clinic) => clinic.clinicAdmins)
  clinic?: Clinic[] | null;

  @ManyToMany(() => Clinic, (clinic) => clinic.clinicWorkers)
  clinicWork?: Clinic[] | null;

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
  @JoinTable({
    joinColumn: {
      name: 'user_email',
      referencedColumnName: 'email',
    },
    inverseJoinColumn: {
      name: 'connection_email',
      referencedColumnName: 'email',
    },
  })
  connections?: User[] | null;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12);
  }
}
