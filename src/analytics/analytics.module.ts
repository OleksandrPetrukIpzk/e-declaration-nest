import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEvent } from './analytics-event.entity';
import { Declaration } from '../declaration/declaration.entity';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';
import { Notification } from '../notification/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEvent,
      Declaration,
      User,
      Clinic,
      Notification,
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
