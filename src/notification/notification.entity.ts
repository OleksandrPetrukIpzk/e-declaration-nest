import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';

export enum NotificationType {
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  CLINIC_INVITE = 'clinic_invite',
  CLINIC_UPDATE = 'clinic_update',
  GENERAL_MESSAGE = 'general_message',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  sender: User;

  @ManyToOne(() => User, { eager: true })
  recipient: User;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @ManyToOne(() => Clinic, { nullable: true, eager: true })
  relatedClinic?: Clinic;

  @Column({ default: false })
  isRead: boolean;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
