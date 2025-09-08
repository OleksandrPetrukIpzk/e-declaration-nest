import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
@Entity()
export class Clinic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ unique: true })
  clinicName: string;

  @Column()
  clinicAddress: string;

  @ManyToOne(() => User, (user) => user.id)
  createdBy?: User | null;

  @Column({ nullable: true })
  clinicBio?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  dateOfCreate: Date;

  @ManyToMany(() => User, (user) => user.clinic)
  @JoinTable({
    joinColumn: {
      name: 'clinic_name',
      referencedColumnName: 'clinicName',
    },
    inverseJoinColumn: {
      name: 'user_email',
      referencedColumnName: 'email',
    },
  })
  clinicAdmins?: User[] | null;

  @ManyToMany(() => User, (user) => user.clinicWork)
  @JoinTable({
    joinColumn: {
      name: 'clinic_name',
      referencedColumnName: 'clinicName',
    },
    inverseJoinColumn: {
      name: 'user_email',
      referencedColumnName: 'email',
    },
  })
  clinicWorkers?: User[] | null;

  @ManyToMany(() => User)
  @JoinTable({
    joinColumn: {
      name: 'clinic_name',
      referencedColumnName: 'clinicName',
    },
    inverseJoinColumn: {
      name: 'user_email',
      referencedColumnName: 'email',
    },
  })
  invites?: User[] | null;
}
