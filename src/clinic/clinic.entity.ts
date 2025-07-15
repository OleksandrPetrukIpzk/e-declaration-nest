import {
  Column, Entity, ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
@Entity()
export class Clinic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  isActive: boolean;

  @Column()
  clinicName: string;

  @ManyToOne(() => User, (user) => user.id)
  createdBy?: User | null;

  @Column({ nullable: true })
  clinicBio?: string | null;

  @Column()
  dateOfCreate: string;

  @OneToMany(() => User, (user) => user.clinic)
  clinicAdmins?: User[] | null;

  @OneToMany(() => User, (user) => user.clinic)
  clinicWorkers?: User[] | null;
}
