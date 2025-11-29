import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';
import { NotificationGateway } from './notification.gateway';
import { AnalyticsService } from '../analytics/analytics.service';
import { EventType } from '../analytics/analytics-event.entity';

export interface CreateNotificationDto {
  senderId: number;
  recipientId: number;
  title: string;
  message: string;
  type: NotificationType;
  relatedClinicId?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    private notificationGateway: NotificationGateway,
    private analyticsService: AnalyticsService,
  ) {}

  // Створити нотифікацію з WebSocket
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const sender = await this.userRepository.findOne({
      where: { id: dto.senderId },
    });
    const recipient = await this.userRepository.findOne({
      where: { id: dto.recipientId },
    });

    if (!sender || !recipient) {
      throw new Error('Sender or recipient not found');
    }

    const notification = this.notificationRepository.create({
      sender,
      recipient,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      metadata: dto.metadata,
    });

    if (dto.relatedClinicId) {
      const clinic = await this.clinicRepository.findOne({
        where: { id: dto.relatedClinicId },
      });
      notification.relatedClinic = clinic;
    }

    const savedNotification =
      await this.notificationRepository.save(notification);

    await this.analyticsService.trackNotificationEvent(
      EventType.NOTIFICATION_SENT,
      savedNotification.id,
      dto.senderId,
    );

    const sent = this.notificationGateway.sendNotificationToUser(
      dto.recipientId,
      savedNotification,
    );

    console.log(
      `Notification ${sent ? 'sent' : 'not sent'} to user ${dto.recipientId}`,
    );

    return savedNotification;
  }
  async sendMessageToConnections(
    senderId: number,
    recipientIds: number[],
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<Notification[]> {
    console.log('[sendMessageToConnections] senderId:', senderId);
    console.log('[sendMessageToConnections] recipientIds:', recipientIds);

    const sender = await this.userRepository.findOne({
      where: { id: senderId },
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    console.log('[sendMessageToConnections] sender:', sender.email);

    const validRecipients = await this.userRepository.query(
      `SELECT DISTINCT u.id
       FROM "user" u
       WHERE u.id = ANY($1::int[])
       AND (
         EXISTS (
           SELECT 1 FROM user_connections_user
           WHERE user_email = $2 AND connection_email = u.email
         )
         OR EXISTS (
           SELECT 1 FROM user_connections_user
           WHERE user_email = u.email AND connection_email = $2
         )
       )`,
      [recipientIds, sender.email],
    );

    const validRecipientIds = validRecipients.map((r) => r.id);
    console.log(
      '[sendMessageToConnections] validRecipientIds:',
      validRecipientIds,
    );

    const invalidRecipientIds = recipientIds.filter(
      (id) => !validRecipientIds.includes(id),
    );

    if (invalidRecipientIds.length > 0) {
      console.warn(
        '[sendMessageToConnections] WARNING: Some recipients are not in connections:',
        invalidRecipientIds,
      );
    }

    const notifications: Notification[] = [];

    for (const recipientId of validRecipientIds) {
      const notification = await this.createNotification({
        senderId,
        recipientId,
        title,
        message,
        type: NotificationType.GENERAL_MESSAGE,
        metadata,
      });
      notifications.push(notification);
      console.log(
        '[sendMessageToConnections] Notification created:',
        notification.id,
      );
    }

    console.log(
      '[sendMessageToConnections] Total notifications created:',
      notifications.length,
    );
    return notifications;
  }

  async sendMessageToClinicAdmins(
    senderId: number,
    clinicId: number,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<Notification[]> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['clinicAdmins'],
    });

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      relations: ['clinic', 'clinicWork'],
    });

    const hasAccess =
      sender?.clinic?.some((c) => c.id === clinicId) ||
      sender?.clinicWork?.some((c) => c.id === clinicId);

    if (!hasAccess) {
      throw new Error('Sender has no access to this clinic');
    }

    const notifications: Notification[] = [];

    for (const admin of clinic.clinicAdmins || []) {
      if (admin.id !== senderId) {
        const notification = await this.createNotification({
          senderId,
          recipientId: admin.id,
          title,
          message,
          type: NotificationType.CLINIC_UPDATE,
          relatedClinicId: clinicId,
          metadata,
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepository.update(
      {
        id: notificationId,
        recipient: { id: userId },
      },
      { isRead: true },
    );

    if (result.affected > 0) {
      await this.analyticsService.trackNotificationEvent(
        EventType.NOTIFICATION_READ,
        notificationId,
        userId,
      );
      this.notificationGateway.notifyNotificationRead(userId, notificationId);
      return true;
    }

    return false;
  }

  async markAllAsRead(userId: number): Promise<boolean> {
    const result = await this.notificationRepository.update(
      {
        recipient: { id: userId },
        isRead: false,
      },
      { isRead: true },
    );

    if (result.affected > 0) {
      // Повідомити через WebSocket
      this.notificationGateway.notifyAllNotificationsRead(userId);
      return true;
    }

    return false;
  }

  async getUserNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    console.log(userId);
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { recipient: { id: userId } },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });

    return { notifications, total };
  }

  // Отримати непрочитані нотифікації
  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: {
        recipient: { id: userId },
        isRead: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Отримати статус користувача
  async getUserOnlineStatus(userId: number): Promise<boolean> {
    return this.notificationGateway.isUserOnline(userId);
  }

  // Відправити повідомлення всім працівникам клініки
  async sendMessageToClinicWorkers(
    senderId: number,
    clinicId: number,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<Notification[]> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['clinicWorkers'],
    });

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    // Перевіряємо чи відправник має доступ до клініки
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      relations: ['clinic', 'clinicWork'],
    });

    const hasAccess =
      sender?.clinic?.some((c) => c.id === clinicId) ||
      sender?.clinicWork?.some((c) => c.id === clinicId);

    if (!hasAccess) {
      throw new Error('Sender has no access to this clinic');
    }

    const notifications: Notification[] = [];

    for (const worker of clinic.clinicWorkers || []) {
      if (worker.id !== senderId) {
        const notification = await this.createNotification({
          senderId,
          recipientId: worker.id,
          title,
          message,
          type: NotificationType.CLINIC_UPDATE,
          relatedClinicId: clinicId,
          metadata,
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Відправити повідомлення всім в клініці (адмінам + працівникам)
  async sendMessageToAllClinic(
    senderId: number,
    clinicId: number,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<Notification[]> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['clinicAdmins', 'clinicWorkers'],
    });

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    // Перевіряємо чи відправник має доступ до клініки
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      relations: ['clinic', 'clinicWork'],
    });

    const hasAccess =
      sender?.clinic?.some((c) => c.id === clinicId) ||
      sender?.clinicWork?.some((c) => c.id === clinicId);

    if (!hasAccess) {
      throw new Error('Sender has no access to this clinic');
    }

    const notifications: Notification[] = [];
    const allUsers = [
      ...(clinic.clinicAdmins || []),
      ...(clinic.clinicWorkers || []),
    ];

    // Видаляємо дублікати та відправника
    const uniqueUsers = allUsers.filter(
      (user, index, arr) =>
        user.id !== senderId &&
        arr.findIndex((u) => u.id === user.id) === index,
    );

    for (const user of uniqueUsers) {
      const notification = await this.createNotification({
        senderId,
        recipientId: user.id,
        title,
        message,
        type: NotificationType.CLINIC_UPDATE,
        relatedClinicId: clinicId,
        metadata,
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Отримати всіх онлайн користувачів
  async getOnlineUsers(): Promise<number[]> {
    return this.notificationGateway.getConnectedUsers();
  }

  // Отримати всі нотифікації користувача (отримані + відправлені)
  async getAllUserNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    received: { notifications: Notification[]; total: number };
    sent: { notifications: Notification[]; total: number };
    stats: { receivedUnread: number };
  }> {
    const [
      [receivedNotifications, receivedTotal],
      [sentNotifications, sentTotal],
      receivedUnread,
    ] = await Promise.all([
      this.notificationRepository.findAndCount({
        where: { recipient: { id: userId } },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      }),
      this.notificationRepository.findAndCount({
        where: { sender: { id: userId } },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      }),
      this.notificationRepository.count({
        where: { recipient: { id: userId }, isRead: false },
      }),
    ]);

    return {
      received: {
        notifications: receivedNotifications,
        total: receivedTotal,
      },
      sent: {
        notifications: sentNotifications,
        total: sentTotal,
      },
      stats: {
        receivedUnread,
      },
    };
  }
}
