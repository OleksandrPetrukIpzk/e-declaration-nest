import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum EventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATE = 'user_profile_update',
  USER_CONNECTION_CREATED = 'user_connection_created',
  DECLARATION_CREATED = 'declaration_created',
  DECLARATION_DOCTOR_ASSIGNED = 'declaration_doctor_assigned',
  DECLARATION_REVIEWED = 'declaration_reviewed',
  DECLARATION_SIGNED = 'declaration_signed',
  DECLARATION_REJECTED = 'declaration_rejected',
  DECLARATION_TERMINATED = 'declaration_terminated',
  DECLARATION_ACTIVATED = 'declaration_activated',
  CLINIC_CREATED = 'clinic_created',
  CLINIC_INVITATION_SENT = 'clinic_invitation_sent',
  CLINIC_INVITATION_ACCEPTED = 'clinic_invitation_accepted',
  CLINIC_INVITATION_REJECTED = 'clinic_invitation_rejected',
  CLINIC_MEMBER_ADDED = 'clinic_member_added',
  CLINIC_MEMBER_REMOVED = 'clinic_member_removed',
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_READ = 'notification_read',
  NOTIFICATION_CLICKED = 'notification_clicked',
  API_ENDPOINT_HIT = 'api_endpoint_hit',
  ERROR_OCCURRED = 'error_occurred',
}

@Entity()
@Index(['eventType', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  @Index()
  eventType: EventType;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true })
  entityType?: string;

  @Column({ nullable: true })
  entityId?: string;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
