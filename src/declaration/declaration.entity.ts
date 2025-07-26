import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Declaration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  createdAt: Date;

  @Column()
  endedAt: Date;

  @Column()
  isActive: boolean;

  @Column()
  status: string;

  @Column()
  src: string;

  @Column({ nullable: true })
  photoByPatient: string;

  @Column({ nullable: true })
  photoByDoctor: string;

  @ManyToOne(() => User, (user) => user.id)
  createdBy?: User | null;

  @ManyToOne(() => User, (user) => user.id)
  createdWith?: User | null;
}
