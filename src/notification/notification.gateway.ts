import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');
  private userSockets = new Map<number, string>();

  async handleConnection(client: Socket) {
    try {
      const userId = parseInt(client.handshake.query.userId as string);

      if (userId && !isNaN(userId)) {
        // Якщо користувач вже підключений, відключити старе з'єднання
        if (this.userSockets.has(userId)) {
          const oldSocketId = this.userSockets.get(userId);
          const oldSocket = this.server.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.disconnect();
          }
        }

        this.userSockets.set(userId, client.id);
        this.logger.log(`User ${userId} connected with socket ${client.id}`);

        // Підтвердження підключення
        client.emit('connected', {
          userId,
          message: 'Successfully connected to WebSocket',
          timestamp: new Date().toISOString(),
        });

        // Приєднати до персональної кімнати
        await client.join(`user_${userId}`);

        // Відправити статистику
        client.emit('connection_stats', {
          connectedUsers: this.userSockets.size,
          yourUserId: userId,
        });
      } else {
        this.logger.warn(
          `Invalid userId in connection: ${client.handshake.query.userId}`,
        );
        client.emit('connection_error', { message: 'Invalid user ID' });
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      // Знайти та видалити користувача зі списку підключених
      for (const [userId, socketId] of this.userSockets.entries()) {
        if (socketId === client.id) {
          this.userSockets.delete(userId);
          this.logger.log(`User ${userId} disconnected`);

          // Покинути персональну кімнату
          await client.leave(`user_${userId}`);
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  // Відправити нотифікацію конкретному користувачу
  sendNotificationToUser(userId: number, notification: any): boolean {
    try {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.server.to(socketId).emit('new_notification', notification);
        this.logger.log(
          `Sent notification to user ${userId}: ${notification.title}`,
        );
        return true;
      } else {
        this.logger.warn(
          `User ${userId} not connected, cannot send notification`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending notification to user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  // Повідомити про позначення як прочитане
  notifyNotificationRead(userId: number, notificationId: number): boolean {
    try {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.server.to(socketId).emit('notification_read', { notificationId });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error notifying read status: ${error.message}`);
      return false;
    }
  }

  // Повідомити про позначення всіх як прочитані
  notifyAllNotificationsRead(userId: number): boolean {
    try {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.server.to(socketId).emit('all_notifications_read', {});
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error notifying all read: ${error.message}`);
      return false;
    }
  }

  // Отримати список підключених користувачів
  getConnectedUsers(): number[] {
    return Array.from(this.userSockets.keys());
  }

  // Перевірити чи користувач онлайн
  isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  // Відправити повідомлення всім підключеним користувачам
  broadcastToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  // Відправити повідомлення користувачам клініки
  sendToClinicUsers(
    clinicId: number,
    userIds: number[],
    event: string,
    data: any,
  ): number {
    let sentCount = 0;
    for (const userId of userIds) {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.server.to(socketId).emit(event, { ...data, clinicId });
        sentCount++;
      }
    }
    return sentCount;
  }
}
