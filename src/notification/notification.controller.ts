import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { JwtAuthGuard } from '../jwt/jwt.auth.guard';
import { CurrentUser } from '../decorators/user.decorator';
import { GetUserInfoDto } from '../user/dtos';

export interface SendMessageDto {
  recipientIds: number[];
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SendClinicMessageDto {
  clinicId: number;
  title: string;
  message: string;
  target: 'admins' | 'workers' | 'all';
  metadata?: Record<string, any>;
}

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // Тестові WebSocket endpoints
  @Get('websocket/status')
  async getWebSocketStatus() {
    const connectedUsers = this.notificationGateway.getConnectedUsers();
    return {
      websocketRunning: true,
      connectedUsers,
      totalConnections: connectedUsers.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('websocket/user-status/:userId')
  async getUserWebSocketStatus(@Param('userId') userId: number) {
    const isOnline = this.notificationGateway.isUserOnline(userId);
    return {
      userId,
      isOnline,
      message: isOnline ? 'User is connected via WebSocket' : 'User is offline',
    };
  }

  @Post('websocket/test-send/:userId')
  async testWebSocketSend(@Param('userId') userId: number) {
    const testNotification = {
      id: Date.now(),
      sender: {
        firstName: 'Test',
        lastName: 'WebSocket',
        email: 'test@websocket.com',
      },
      title: 'WebSocket Test',
      message: 'This is a test notification sent via WebSocket',
      type: 'general_message',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const sent = this.notificationGateway.sendNotificationToUser(
      userId,
      testNotification,
    );

    return {
      success: sent,
      message: sent
        ? 'Test notification sent via WebSocket'
        : 'User not connected to WebSocket',
      userId,
      notification: testNotification,
    };
  }

  @Post('websocket/broadcast')
  async testBroadcast(@Body() data: { message: string }) {
    this.notificationGateway.broadcastToAll('broadcast_message', {
      message: data.message,
      timestamp: new Date().toISOString(),
      type: 'broadcast',
    });

    return {
      success: true,
      message: 'Broadcast sent to all connected users',
      connectedUsers: this.notificationGateway.getConnectedUsers().length,
    };
  }

  // Основні endpoints
  @Post('send-to-connections')
  @UseGuards(JwtAuthGuard)
  async sendToConnections(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Body() dto: any,
  ) {
    return await this.notificationService.sendMessageToConnections(
      getUserInfoDto.userId,
      dto.recipientIds,
      dto.title,
      dto.message,
      dto.metadata,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyNotifications(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.notificationService.getUserNotifications(
      getUserInfoDto.userId,
      limit,
      offset,
    );
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllMyNotifications(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.notificationService.getAllUserNotifications(
      getUserInfoDto.userId,
      limit,
      offset,
    );
  }

  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async getUnreadNotifications(@CurrentUser() getUserInfoDto: GetUserInfoDto) {
    return await this.notificationService.getUnreadNotifications(
      getUserInfoDto.userId,
    );
  }

  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: number,
  ) {
    return await this.notificationService.markAsRead(id, getUserInfoDto.userId);
  }

  @Put('mark-all-read')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@CurrentUser() getUserInfoDto: GetUserInfoDto) {
    return await this.notificationService.markAllAsRead(getUserInfoDto.userId);
  }

  @Post('send-to-clinic')
  @UseGuards(JwtAuthGuard)
  async sendToClinic(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Body() dto: SendClinicMessageDto,
  ) {
    switch (dto.target) {
      case 'admins':
        return await this.notificationService.sendMessageToClinicAdmins(
          getUserInfoDto.userId,
          dto.clinicId,
          dto.title,
          dto.message,
          dto.metadata,
        );
      case 'workers':
        return await this.notificationService.sendMessageToClinicWorkers(
          getUserInfoDto.userId,
          dto.clinicId,
          dto.title,
          dto.message,
          dto.metadata,
        );
      case 'all':
        return await this.notificationService.sendMessageToAllClinic(
          getUserInfoDto.userId,
          dto.clinicId,
          dto.title,
          dto.message,
          dto.metadata,
        );
      default:
        throw new Error(`Target "${dto.target}" not supported`);
    }
  }
}
