import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent, EventType } from './analytics-event.entity';
import { Declaration } from '../declaration/declaration.entity';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';
import { Notification } from '../notification/notification.entity';
import {
  UserActivityStatsResponse,
  DeclarationWorkflowStatsResponse,
  DoctorPerformanceStatsResponse,
  ClinicStatsResponse,
  NotificationEngagementStatsResponse,
  SystemOverviewResponse,
  WorkloadPredictionResponse,
  AnomalyDetectionResponse,
  DoctorAnomaliesResponse,
  CohortAnalysisResponse,
  FunnelAnalysisResponse,
  RFMAnalysisResponse,
  RFMSegment,
  PatternAnalysisResponse,
  SentimentAnalysisResponse,
  ChurnPredictionResponse,
  DoctorRecommendationsResponse,
  NetworkAnalysisResponse,
} from './analytics.types';

export interface TrackEventDto {
  eventType: EventType;
  userId?: number;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(Declaration)
    private declarationRepository: Repository<Declaration>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async trackEvent(dto: TrackEventDto): Promise<AnalyticsEvent> {
    const event = this.analyticsEventRepository.create(dto);
    return await this.analyticsEventRepository.save(event);
  }

  async trackUserLogin(
    userId: number,
    sessionId?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    return this.trackEvent({
      eventType: EventType.USER_LOGIN,
      userId,
      sessionId,
      userAgent,
      ipAddress,
    });
  }

  async trackUserProfileUpdate(userId: number, changedFields: string[]) {
    return this.trackEvent({
      eventType: EventType.USER_PROFILE_UPDATE,
      userId,
      metadata: { changedFields },
    });
  }

  async trackDeclarationStatusChange(
    declarationId: string,
    oldStatus: string,
    newStatus: string,
    userId?: number,
  ) {
    const eventTypeMap = {
      pending_doctor_review: EventType.DECLARATION_CREATED,
      pending_doctor_sign: EventType.DECLARATION_REVIEWED,
      active: EventType.DECLARATION_ACTIVATED,
      rejected: EventType.DECLARATION_REJECTED,
      terminated: EventType.DECLARATION_TERMINATED,
    };

    const eventType = eventTypeMap[newStatus] || EventType.DECLARATION_CREATED;

    return this.trackEvent({
      eventType,
      userId,
      entityType: 'Declaration',
      entityId: declarationId,
      metadata: { oldStatus, newStatus },
    });
  }

  async trackClinicEvent(
    eventType: EventType,
    clinicId: number,
    userId?: number,
    metadata?: any,
  ) {
    return this.trackEvent({
      eventType,
      userId,
      entityType: 'Clinic',
      entityId: clinicId.toString(),
      metadata,
    });
  }

  async trackNotificationEvent(
    eventType: EventType,
    notificationId: number,
    userId?: number,
  ) {
    return this.trackEvent({
      eventType,
      userId,
      entityType: 'Notification',
      entityId: notificationId.toString(),
    });
  }

  async getUserActivityStats(
    startDate: Date,
    endDate: Date,
    adminId: number,
  ): Promise<UserActivityStatsResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        dailyActiveUsers: [],
        loginStats: { totalLogins: 0, uniqueUsers: 0, totalUsers: 0 },
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        dailyActiveUsers: [],
        loginStats: { totalLogins: 0, uniqueUsers: 0, totalUsers: 0 },
      };
    }

    const dailyActiveUsers = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('DATE(declaration.inserted_at)', 'date')
      .addSelect('COUNT(DISTINCT declaration.patient_email)', 'activeUsers')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('DATE(declaration.inserted_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const totalUsersInScope = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount();

    const usersWithDeclarations = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('COUNT(DISTINCT declaration.patient_email)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .getRawOne();

    const loginStats = {
      totalLogins: parseInt(usersWithDeclarations.count) || 0,
      uniqueUsers: parseInt(usersWithDeclarations.count) || 0,
      totalUsers: totalUsersInScope,
    };

    return {
      dailyActiveUsers,
      loginStats,
    };
  }

  async getDeclarationWorkflowStats(
    startDate: Date,
    endDate: Date,
    adminId: number,
  ): Promise<DeclarationWorkflowStatsResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        statusStats: [],
        processingTimes: [],
        workflowSummary: {
          totalDeclarations: '0',
          completed: '0',
          rejected: '0',
          pending: '0',
        },
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        statusStats: [],
        processingTimes: [],
        workflowSummary: {
          totalDeclarations: '0',
          completed: '0',
          rejected: '0',
          pending: '0',
        },
      };
    }

    const statusStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('declaration.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('declaration.status')
      .getRawMany();

    const processingTimes = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select(
        'AVG(EXTRACT(EPOCH FROM (declaration.updated_at - declaration.inserted_at))/3600)',
        'avgProcessingHours',
      )
      .addSelect('declaration.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('declaration.status')
      .getRawMany();

    const workflowSummary = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('COUNT(*)', 'totalDeclarations')
      .addSelect(
        "COUNT(CASE WHEN declaration.status = 'active' THEN 1 END)",
        'completed',
      )
      .addSelect(
        "COUNT(CASE WHEN declaration.status = 'rejected' THEN 1 END)",
        'rejected',
      )
      .addSelect(
        "COUNT(CASE WHEN declaration.status = 'pending_doctor_review' THEN 1 END)",
        'pending',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .getRawOne();

    return {
      statusStats,
      processingTimes,
      workflowSummary,
    };
  }

  async getDoctorPerformanceStats(
    startDate: Date,
    endDate: Date,
    adminId: number,
  ): Promise<DoctorPerformanceStatsResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return { doctorStats: [] };
    }

    const doctorStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .leftJoin('declaration.doctor', 'doctor')
      .leftJoin('doctor.clinicWork', 'clinic')
      .select('doctor.id', 'doctorId')
      .addSelect("CONCAT(doctor.firstName, ' ', doctor.lastName)", 'doctorName')
      .addSelect('COUNT(*)', 'totalDeclarations')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'activeDeclarations',
      )
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'rejected' THEN 1 ELSE 0 END)",
        'rejectedDeclarations',
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (declaration.updated_at - declaration.inserted_at))/3600)',
        'avgProcessingHours',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('doctor.id IS NOT NULL')
      .andWhere('doctor.isActive = :isActive', { isActive: true })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .groupBy('doctor.id')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return { doctorStats };
  }

  async getClinicStats(
    startDate: Date,
    endDate: Date,
    adminId: number,
  ): Promise<ClinicStatsResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        clinicStats: { totalClinics: '0', activeClinics: '0' },
        clinicGrowth: [],
      };
    }

    const clinicStats = await this.clinicRepository
      .createQueryBuilder('clinic')
      .select('COUNT(*)', 'totalClinics')
      .addSelect(
        'SUM(CASE WHEN clinic.isActive = true THEN 1 ELSE 0 END)',
        'activeClinics',
      )
      .where('clinic.dateOfCreate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .getRawOne();

    const clinicGrowth = await this.clinicRepository
      .createQueryBuilder('clinic')
      .select('DATE(clinic.dateOfCreate)', 'date')
      .addSelect('COUNT(*)', 'newClinics')
      .addSelect(
        'SUM(COUNT(*)) OVER (ORDER BY DATE(clinic.dateOfCreate))',
        'totalClinics',
      )
      .where('clinic.dateOfCreate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .groupBy('DATE(clinic.dateOfCreate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      clinicStats,
      clinicGrowth,
    };
  }

  async getNotificationEngagementStats(
    startDate: Date,
    endDate: Date,
    adminId: number,
  ): Promise<NotificationEngagementStatsResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        dailyNotifications: [],
        metrics: { openRate: '0%', totalSent: 0, totalRead: 0 },
      };
    }

    const clinicUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'workClinic')
      .leftJoin('user.clinic', 'adminClinic')
      .select('user.id')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(workClinic.id IN (:...clinicIds) OR adminClinic.id IN (:...clinicIds))',
        { clinicIds },
      )
      .getRawMany();

    const userIds = clinicUsers.map((user) => user.user_id);

    if (userIds.length === 0) {
      return {
        dailyNotifications: [],
        metrics: { openRate: '0%', totalSent: 0, totalRead: 0 },
      };
    }

    const notificationStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.sender', 'sender')
      .select('COUNT(*)', 'totalNotifications')
      .addSelect(
        'SUM(CASE WHEN notification.isRead = true THEN 1 ELSE 0 END)',
        'readNotifications',
      )
      .where('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('sender.id IN (:...userIds)', { userIds })
      .getRawOne();

    const dailyNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.sender', 'sender')
      .select('DATE(notification.createdAt)', 'date')
      .addSelect('COUNT(*)', 'sent')
      .addSelect(
        'SUM(CASE WHEN notification.isRead = true THEN 1 ELSE 0 END)',
        'read',
      )
      .where('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('sender.id IN (:...userIds)', { userIds })
      .groupBy('DATE(notification.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const totalSent = parseInt(notificationStats.totalNotifications) || 0;
    const totalRead = parseInt(notificationStats.readNotifications) || 0;
    const openRate =
      totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) : '0';

    return {
      dailyNotifications,
      metrics: {
        openRate: `${openRate}%`,
        totalSent,
        totalRead,
      },
    };
  }

  async getSystemOverview(
    startDate: Date,
    endDate: Date,
    adminId: number,
  ): Promise<SystemOverviewResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        users: { total: 0, active: 0 },
        declarations: {
          total: 0,
          active: 0,
          pending: 0,
          allTime: { total: 0, active: 0, pending: 0 },
        },
        clinics: { total: 0, active: 0 },
      };
    }

    const totalUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount();

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    const allDeclarations = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'active',
      )
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'pending_doctor_review' THEN 1 ELSE 0 END)",
        'pending',
      )
      .where('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .getRawOne();

    const activeUsers = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('COUNT(DISTINCT declaration.patient_email)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .getRawOne();

    const totalDeclarations = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'active',
      )
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'pending_doctor_review' THEN 1 ELSE 0 END)",
        'pending',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .getRawOne();

    const adminClinicsStats = await this.clinicRepository
      .createQueryBuilder('clinic')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN clinic.isActive = true THEN 1 ELSE 0 END)',
        'active',
      )
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .getRawOne();

    return {
      users: {
        total: totalUsers,
        active: parseInt(activeUsers.count) || 0,
      },
      declarations: {
        total: parseInt(totalDeclarations.total) || 0,
        active: parseInt(totalDeclarations.active) || 0,
        pending: parseInt(totalDeclarations.pending) || 0,
        allTime: {
          total: parseInt(allDeclarations.total) || 0,
          active: parseInt(allDeclarations.active) || 0,
          pending: parseInt(allDeclarations.pending) || 0,
        },
      },
      clinics: {
        total: parseInt(adminClinicsStats.total) || 0,
        active: parseInt(adminClinicsStats.active) || 0,
      },
    };
  }

  // ==================================================================================
  // ПРОГНОСТИЧНА АНАЛІТИКА (PREDICTIVE ANALYTICS)
  // ==================================================================================

  async predictWorkload(
    adminId: number,
    daysAhead: number = 7,
  ): Promise<WorkloadPredictionResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        predictions: [],
        peakDays: [],
        averageLoad: 0,
        trend: 'stable',
        historicalAverage: 0,
        slope: '0',
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        predictions: [],
        peakDays: [],
        averageLoad: 0,
        trend: 'stable',
        historicalAverage: 0,
        slope: '0',
      };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const historicalData = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('DATE(declaration.inserted_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate: thirtyDaysAgo,
        endDate: now,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('DATE(declaration.inserted_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dataPoints = historicalData.map((d) => parseInt(d.count));

    // Exponential Moving Average (EMA)
    // EMA(today) = (Price(today) × α) + (EMA(yesterday) × (1 - α))

    const alpha = 2 / (dataPoints.length + 1);
    let ema = dataPoints[0] || 0;
    const emaValues = [ema];

    for (let i = 1; i < dataPoints.length; i++) {
      ema = dataPoints[i] * alpha + ema * (1 - alpha);
      emaValues.push(ema);
    }

    // Linear Regression для тренду: y = mx + b
    const n = dataPoints.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = dataPoints;

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const predictions = [];
    const lastEma = emaValues[emaValues.length - 1] || 0;

    for (let i = 1; i <= daysAhead; i++) {
      const linearPrediction = slope * (n + i) + intercept;
      const combinedPrediction = linearPrediction * 0.6 + lastEma * 0.4;

      const predictionDate = new Date(now);
      predictionDate.setDate(predictionDate.getDate() + i);

      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        predicted: Math.max(0, Math.round(combinedPrediction)),
        confidence: this.calculateConfidence(dataPoints),
      });
    }

    const dayOfWeekCounts = new Array(7).fill(0);
    historicalData.forEach((d) => {
      const dayOfWeek = new Date(d.date).getDay();
      dayOfWeekCounts[dayOfWeek] += parseInt(d.count);
    });

    const dayNames = [
      'Неділя',
      'Понеділок',
      'Вівторок',
      'Середа',
      'Четвер',
      "П'ятниця",
      'Субота',
    ];
    const peakDays = dayOfWeekCounts
      .map((count, index) => ({ day: dayNames[index], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const averageLoad = yMean;
    let trend: 'stable' | 'growing' | 'declining' = 'stable';
    if (slope > 1) trend = 'growing';
    else if (slope < -1) trend = 'declining';

    return {
      predictions,
      peakDays,
      averageLoad: Math.round(averageLoad),
      trend,
      historicalAverage: Math.round(yMean),
      slope: slope.toFixed(2),
    };
  }

  private calculateConfidence(dataPoints: number[]): string {
    if (dataPoints.length < 7) return 'low';

    const mean = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
    const variance =
      dataPoints.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
      dataPoints.length;
    const stdDev = Math.sqrt(variance);

    const cv = (stdDev / mean) * 100;

    if (cv < 20) return 'high';
    if (cv < 40) return 'medium';
    return 'low';
  }

  // ==================================================================================
  // ВИЯВЛЕННЯ АНОМАЛІЙ (ANOMALY DETECTION)
  // ==================================================================================

  // 8. Виявлення аномалій в активності системи
  // Використовує Z-Score та IQR (Interquartile Range)
  async detectAnomalies(
    adminId: number,
    lookbackDays: number = 30,
  ): Promise<AnomalyDetectionResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        anomalies: [],
        summary: { total: 0, critical: 0, warning: 0 },
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        anomalies: [],
        summary: { total: 0, critical: 0, warning: 0 },
      };
    }

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const dailyStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('DATE(declaration.inserted_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'rejected' THEN 1 ELSE 0 END)",
        'rejectedCount',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('DATE(declaration.inserted_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const counts = dailyStats.map((d) => parseInt(d.count));
    const rejectionRates = dailyStats.map((d) => {
      const total = parseInt(d.count);
      const rejected = parseInt(d.rejectedCount);
      return total > 0 ? (rejected / total) * 100 : 0;
    });

    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
      counts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Розрахунок IQR
    const sortedCounts = [...counts].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedCounts.length * 0.25);
    const q3Index = Math.floor(sortedCounts.length * 0.75);
    const q1 = sortedCounts[q1Index];
    const q3 = sortedCounts[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const rejectionMean =
      rejectionRates.reduce((a, b) => a + b, 0) / rejectionRates.length;

    const anomalies = [];

    dailyStats.forEach((stat, index) => {
      const count = counts[index];
      const rejectionRate = rejectionRates[index];
      const date = stat.date;

      // Z-Score метод: |z| > 3 означає аномалію
      const zScore = stdDev !== 0 ? Math.abs((count - mean) / stdDev) : 0;

      // IQR метод: виходить за межі
      const isOutlierIQR = count < lowerBound || count > upperBound;

      const isHighRejectionRate =
        rejectionRate > rejectionMean * 2 && rejectionRate > 20;

      if (zScore > 3 || isOutlierIQR) {
        anomalies.push({
          date,
          type: count > mean ? 'spike' : 'drop',
          severity: zScore > 4 ? 'critical' : 'warning',
          metric: 'declarations',
          value: count,
          expected: Math.round(mean),
          deviation: `${((Math.abs(count - mean) / mean) * 100).toFixed(1)}%`,
          zScore: zScore.toFixed(2),
          description:
            count > mean
              ? `Незвичайно високий рівень декларацій: ${count} (очікувалося ~${Math.round(mean)})`
              : `Незвичайно низький рівень декларацій: ${count} (очікувалося ~${Math.round(mean)})`,
        });
      }

      if (isHighRejectionRate) {
        anomalies.push({
          date,
          type: 'high_rejection_rate',
          severity: rejectionRate > 50 ? 'critical' : 'warning',
          metric: 'rejection_rate',
          value: rejectionRate.toFixed(1),
          expected: rejectionMean.toFixed(1),
          deviation: `${(((rejectionRate - rejectionMean) / rejectionMean) * 100).toFixed(1)}%`,
          zScore: 'N/A',
          description: `Аномально високий відсоток відхилень: ${rejectionRate.toFixed(1)}% (середнє ${rejectionMean.toFixed(1)}%)`,
        });
      }
    });

    const critical = anomalies.filter((a) => a.severity === 'critical').length;
    const warning = anomalies.filter((a) => a.severity === 'warning').length;

    return {
      anomalies: anomalies.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      summary: {
        total: anomalies.length,
        critical,
        warning,
      },
      stats: {
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        avgRejectionRate: rejectionMean.toFixed(1) + '%',
      },
    };
  }

  async detectDoctorAnomalies(
    adminId: number,
    lookbackDays: number = 30,
  ): Promise<DoctorAnomaliesResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        anomalies: [],
        stats: {
          avgRejectionRate: '0%',
          avgProcessingTime: '0 годин',
          totalDoctors: 0,
        },
      };
    }

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const doctorStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .leftJoin('declaration.doctor', 'doctor')
      .leftJoin('doctor.clinicWork', 'clinic')
      .select('doctor.id', 'doctorId')
      .addSelect("CONCAT(doctor.firstName, ' ', doctor.lastName)", 'doctorName')
      .addSelect('COUNT(*)', 'totalDeclarations')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'rejected' THEN 1 ELSE 0 END)",
        'rejectedDeclarations',
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (declaration.updated_at - declaration.inserted_at))/3600)',
        'avgProcessingHours',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('doctor.id IS NOT NULL')
      .andWhere('doctor.isActive = :isActive', { isActive: true })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .groupBy('doctor.id')
      .getRawMany();

    const rejectionRates = doctorStats.map((d) => {
      const total = parseInt(d.totalDeclarations);
      const rejected = parseInt(d.rejectedDeclarations);
      return total > 0 ? (rejected / total) * 100 : 0;
    });

    const processingTimes = doctorStats
      .map((d) => parseFloat(d.avgProcessingHours))
      .filter((t) => !isNaN(t));

    const meanRejectionRate =
      rejectionRates.reduce((a, b) => a + b, 0) / rejectionRates.length;
    const meanProcessingTime =
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

    const anomalies = [];

    doctorStats.forEach((doctor, index) => {
      const rejectionRate = rejectionRates[index];
      const processingTime = parseFloat(doctor.avgProcessingHours);

      if (rejectionRate > meanRejectionRate * 2 && rejectionRate > 20) {
        anomalies.push({
          doctorId: doctor.doctorId,
          doctorName: doctor.doctorName,
          type: 'high_rejection_rate',
          severity: rejectionRate > 50 ? 'critical' : 'warning',
          value: rejectionRate.toFixed(1) + '%',
          expected: meanRejectionRate.toFixed(1) + '%',
          description: `Високий відсоток відхилень декларацій`,
        });
      }

      if (!isNaN(processingTime) && processingTime > meanProcessingTime * 2) {
        anomalies.push({
          doctorId: doctor.doctorId,
          doctorName: doctor.doctorName,
          type: 'slow_processing',
          severity:
            processingTime > meanProcessingTime * 3 ? 'critical' : 'warning',
          value: processingTime.toFixed(1) + ' годин',
          expected: meanProcessingTime.toFixed(1) + ' годин',
          description: `Повільна обробка декларацій`,
        });
      }

      const totalDeclarations = parseInt(doctor.totalDeclarations);
      const avgDeclarations =
        doctorStats.reduce((sum, d) => sum + parseInt(d.totalDeclarations), 0) /
        doctorStats.length;

      if (totalDeclarations < avgDeclarations * 0.3 && totalDeclarations > 0) {
        anomalies.push({
          doctorId: doctor.doctorId,
          doctorName: doctor.doctorName,
          type: 'low_activity',
          severity: 'warning',
          value: totalDeclarations.toString(),
          expected: Math.round(avgDeclarations).toString(),
          description: `Низька активність`,
        });
      }
    });

    return {
      anomalies,
      stats: {
        avgRejectionRate: meanRejectionRate.toFixed(1) + '%',
        avgProcessingTime: meanProcessingTime.toFixed(1) + ' годин',
        totalDoctors: doctorStats.length,
      },
    };
  }

  // ==================================================================================
  // КОГОРТНИЙ АНАЛІЗ (COHORT ANALYSIS)
  // ==================================================================================

  // 10. Когортний аналіз пацієнтів за датою реєстрації
  // Відслідковує retention rate для різних груп користувачів
  async getCohortAnalysis(
    adminId: number,
    cohortBy: 'month' | 'week' = 'month',
  ): Promise<CohortAnalysisResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        cohorts: [],
        summary: { totalCohorts: 0, avgRetentionRate: '0%' },
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        cohorts: [],
        summary: { totalCohorts: 0, avgRetentionRate: '0%' },
      };
    }

    const dateFormat =
      cohortBy === 'month'
        ? "TO_CHAR(declaration.inserted_at, 'YYYY-MM')"
        : "TO_CHAR(declaration.inserted_at, 'YYYY-IW')";

    const cohortData = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select(dateFormat, 'cohort')
      .addSelect('COUNT(DISTINCT declaration.patient_email)', 'patientCount')
      .addSelect('COUNT(*)', 'declarationCount')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'activeCount',
      )
      .where('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('cohort')
      .orderBy('cohort', 'ASC')
      .getRawMany();

    // Розрахунок retention для кожної когорти
    const cohorts = cohortData.map((cohort) => {
      const patientCount = parseInt(cohort.patientCount);
      const declarationCount = parseInt(cohort.declarationCount);
      const activeCount = parseInt(cohort.activeCount);
      const retentionRate =
        declarationCount > 0 ? (activeCount / declarationCount) * 100 : 0;

      return {
        cohort: cohort.cohort,
        patientCount,
        declarationCount,
        activeCount,
        retentionRate: retentionRate.toFixed(1) + '%',
      };
    });

    return {
      cohorts,
      summary: {
        totalCohorts: cohorts.length,
        avgRetentionRate:
          (
            cohorts.reduce((sum, c) => sum + parseFloat(c.retentionRate), 0) /
            cohorts.length
          ).toFixed(1) + '%',
      },
    };
  }

  // ==================================================================================
  // АНАЛІЗ ВОРОНКИ (FUNNEL ANALYSIS)
  // ==================================================================================

  // 11. Аналіз воронки обробки декларацій
  // Показує конверсію на кожному етапі процесу
  async getDeclarationFunnel(
    adminId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<FunnelAnalysisResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        stages: [],
        overallConversion: '0%',
        totalDeclarations: 0,
        bottleneck: 'Немає',
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        stages: [],
        overallConversion: '0%',
        totalDeclarations: 0,
        bottleneck: 'Немає',
      };
    }

    const funnelStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN declaration.status IN ('pending_doctor_review', 'pending_doctor_sign', 'active', 'rejected', 'terminated') THEN 1 ELSE 0 END)",
        'reviewed',
      )
      .addSelect(
        "SUM(CASE WHEN declaration.status IN ('pending_doctor_sign', 'active', 'rejected', 'terminated') THEN 1 ELSE 0 END)",
        'signed',
      )
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'activated',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .getRawOne();

    const total = parseInt(funnelStats.total) || 1;
    const reviewed = parseInt(funnelStats.reviewed) || 0;
    const signed = parseInt(funnelStats.signed) || 0;
    const activated = parseInt(funnelStats.activated) || 0;

    const stages = [
      {
        stage: 'Створено декларацій',
        count: total,
        conversion: '100%',
        dropOff: '0%',
        avgTimeHours: 0,
      },
      {
        stage: 'Розглянуто лікарем',
        count: reviewed,
        conversion: ((reviewed / total) * 100).toFixed(1) + '%',
        dropOff: (((total - reviewed) / total) * 100).toFixed(1) + '%',
        avgTimeHours: 0,
      },
      {
        stage: 'Підписано лікарем',
        count: signed,
        conversion: ((signed / total) * 100).toFixed(1) + '%',
        dropOff: (((reviewed - signed) / reviewed) * 100).toFixed(1) + '%',
        avgTimeHours: 0,
      },
      {
        stage: 'Активовано',
        count: activated,
        conversion: ((activated / total) * 100).toFixed(1) + '%',
        dropOff: (((signed - activated) / signed) * 100).toFixed(1) + '%',
        avgTimeHours: 0,
      },
    ];

    return {
      stages,
      overallConversion: ((activated / total) * 100).toFixed(1) + '%',
      totalDeclarations: total,
      bottleneck: this.identifyBottleneck(stages),
    };
  }

  private identifyBottleneck(stages: any[]): string {
    let maxDropOff = 0;
    let bottleneckStage = '';

    stages.forEach((stage) => {
      const dropOff = parseFloat(stage.dropOff);
      if (dropOff > maxDropOff) {
        maxDropOff = dropOff;
        bottleneckStage = stage.stage;
      }
    });

    return bottleneckStage || 'Немає';
  }

  // ==================================================================================
  // RFM АНАЛІЗ (RECENCY, FREQUENCY, MONETARY)
  // ==================================================================================

  // 12. RFM аналіз лікарів
  // Класифікація лікарів за активністю та ефективністю
  async getDoctorRFM(adminId: number): Promise<RFMAnalysisResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return { doctors: [], segments: {} };
    }

    const now = new Date();

    const doctorData = await this.declarationRepository
      .createQueryBuilder('declaration')
      .leftJoin('declaration.doctor', 'doctor')
      .leftJoin('doctor.clinicWork', 'clinic')
      .select('doctor.id', 'doctorId')
      .addSelect("CONCAT(doctor.firstName, ' ', doctor.lastName)", 'doctorName')
      .addSelect('MAX(declaration.inserted_at)', 'lastActivity')
      .addSelect('COUNT(*)', 'frequency')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'monetaryValue',
      )
      .where('doctor.id IS NOT NULL')
      .andWhere('doctor.isActive = :isActive', { isActive: true })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .groupBy('doctor.id')
      .getRawMany();

    // Розрахунок Recency (дні з останньої активності)
    const doctors = doctorData.map((doc) => {
      const lastActivity = new Date(doc.lastActivity);
      const recencyDays = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        ...doc,
        recencyDays,
        frequency: parseInt(doc.frequency),
        monetaryValue: parseInt(doc.monetaryValue),
      };
    });

    const recencies = doctors.map((d) => d.recencyDays).sort((a, b) => a - b);
    const frequencies = doctors.map((d) => d.frequency).sort((a, b) => b - a);
    const monetary = doctors.map((d) => d.monetaryValue).sort((a, b) => b - a);

    const getScore = (
      value: number,
      sortedArray: number[],
      reverse = false,
    ) => {
      const quintileSize = Math.ceil(sortedArray.length / 5);
      for (let i = 1; i <= 5; i++) {
        const threshold = sortedArray[quintileSize * i - 1];
        if (reverse ? value >= threshold : value <= threshold) {
          return i;
        }
      }
      return 5;
    };

    const doctorRFM = doctors.map((doc) => {
      const R = getScore(doc.recencyDays, recencies, false);
      const F = getScore(doc.frequency, frequencies, true);
      const M = getScore(doc.monetaryValue, monetary, true);

      const rfmScore = R * 100 + F * 10 + M;
      const segment = this.classifyRFMSegment(R, F, M);

      return {
        doctorId: doc.doctorId,
        doctorName: doc.doctorName,
        recency: doc.recencyDays + ' днів',
        frequency: doc.frequency,
        monetary: doc.monetaryValue,
        R,
        F,
        M,
        rfmScore,
        segment,
      };
    });

    const segments = doctorRFM.reduce((acc, doc) => {
      acc[doc.segment] = (acc[doc.segment] || 0) + 1;
      return acc;
    }, {});

    return {
      doctors: doctorRFM.sort((a, b) => b.rfmScore - a.rfmScore),
      segments,
    };
  }

  private classifyRFMSegment(R: number, F: number, M: number): RFMSegment {
    if (R >= 4 && F >= 4 && M >= 4) return 'Champions';

    if (R >= 3 && F >= 3 && M >= 3) return 'Loyal';

    if (R >= 4 && F <= 3 && M <= 3) return 'Potential Loyalists';

    if (R <= 2 && F >= 3 && M >= 3) return 'At Risk';

    if (R <= 2 && F >= 4 && M >= 4) return "Can't Lose Them";

    if (R <= 2 && F <= 2) return 'Hibernating';

    return 'Need Attention';
  }

  // ==================================================================================
  // РОЗПІЗНАВАННЯ ПАТЕРНІВ (PATTERN RECOGNITION)
  // ==================================================================================

  // 13. Виявлення кореляцій між метриками
  // Знаходить зв'язки між різними показниками
  async getPatternAnalysis(
    adminId: number,
    lookbackDays: number = 30,
  ): Promise<PatternAnalysisResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return { patterns: [], correlations: [] };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return { patterns: [], correlations: [] };
    }

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const dayOfWeekStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('EXTRACT(DOW FROM declaration.inserted_at)', 'dayOfWeek')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'rejected' THEN 1 ELSE 0 END)",
        'rejectedCount',
      )
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('EXTRACT(DOW FROM declaration.inserted_at)')
      .orderBy('EXTRACT(DOW FROM declaration.inserted_at)', 'ASC')
      .getRawMany();

    const hourStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('EXTRACT(HOUR FROM declaration.inserted_at)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('EXTRACT(HOUR FROM declaration.inserted_at)')
      .orderBy('EXTRACT(HOUR FROM declaration.inserted_at)', 'ASC')
      .getRawMany();

    const dayNames = [
      'Неділя',
      'Понеділок',
      'Вівторок',
      'Середа',
      'Четвер',
      "П'ятниця",
      'Субота',
    ];

    const patterns = [
      {
        pattern: 'Активність по днях тижня',
        data: dayOfWeekStats.map((d) => ({
          day: dayNames[parseInt(d.dayOfWeek)],
          count: parseInt(d.count),
          rejectionRate:
            ((parseInt(d.rejectedCount) / parseInt(d.count)) * 100).toFixed(1) +
            '%',
        })),
      },
      {
        pattern: 'Активність по годинах',
        data: hourStats.map((h) => ({
          hour: `${h.hour}:00`,
          count: parseInt(h.count),
        })),
      },
    ];

    const volumes = dayOfWeekStats.map((d) => parseInt(d.count));
    const rejections = dayOfWeekStats.map((d) => parseInt(d.rejectedCount));

    const correlation = this.calculatePearsonCorrelation(volumes, rejections);

    const interpretation:
      | 'Сильна кореляція'
      | 'Помірна кореляція'
      | 'Слабка кореляція' =
      Math.abs(correlation) > 0.7
        ? 'Сильна кореляція'
        : Math.abs(correlation) > 0.3
          ? 'Помірна кореляція'
          : 'Слабка кореляція';

    const correlations = [
      {
        metric1: 'Обсяг декларацій',
        metric2: 'Кількість відхилень',
        correlation: correlation.toFixed(3),
        interpretation,
      },
    ];

    return {
      patterns,
      correlations,
    };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xVariance = 0;
    let yVariance = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xVariance += xDiff ** 2;
      yVariance += yDiff ** 2;
    }

    const denominator = Math.sqrt(xVariance * yVariance);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  // ==================================================================================
  // АНАЛІЗ ТОНАЛЬНОСТІ (SENTIMENT ANALYSIS)
  // ==================================================================================

  // 14. Аналіз настроїв на основі причин відхилення
  // Простий keyword-based sentiment analysis
  async getSentimentAnalysis(
    adminId: number,
    lookbackDays: number = 30,
  ): Promise<SentimentAnalysisResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        sentiment: 'neutral',
        score: '0',
        distribution: {},
        summary: { positive: 0, negative: 0, neutral: 0 },
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        sentiment: 'neutral',
        score: '0',
        distribution: {},
        summary: { positive: 0, negative: 0, neutral: 0 },
      };
    }

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const statusStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('declaration.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('declaration.inserted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('declaration.status')
      .getRawMany();

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const distribution = {};

    statusStats.forEach((stat) => {
      const count = parseInt(stat.count);
      const status = stat.status;

      if (status === 'active') {
        positiveCount += count;
        distribution['Позитивні (активовані)'] = count;
      } else if (status === 'rejected' || status === 'terminated') {
        negativeCount += count;
        distribution['Негативні (відхилені)'] = count;
      } else {
        neutralCount += count;
        distribution['Нейтральні (в процесі)'] = count;
      }
    });

    const total = positiveCount + negativeCount + neutralCount;
    const score =
      total > 0 ? ((positiveCount - negativeCount) / total) * 100 : 0;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (score > 20) sentiment = 'positive';
    else if (score < -20) sentiment = 'negative';

    return {
      sentiment,
      score: score.toFixed(1),
      distribution,
      summary: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
      },
    };
  }

  // ==================================================================================
  // ПРОГНОЗУВАННЯ ВІДТОКУ (CHURN PREDICTION)
  // ==================================================================================

  // 15. Прогнозування ризику відтоку пацієнтів
  // Використовує weighted scoring для оцінки ризику
  async predictChurn(adminId: number): Promise<ChurnPredictionResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        atRisk: [],
        summary: { totalPatients: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
      };
    }

    const doctorEmails = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.clinicWork', 'clinic')
      .select('user.email')
      .where('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getRawMany();

    const doctorEmailList = doctorEmails.map((doc) => doc.user_email);

    if (doctorEmailList.length === 0) {
      return {
        atRisk: [],
        summary: { totalPatients: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
      };
    }

    const now = new Date();

    const patientData = await this.declarationRepository
      .createQueryBuilder('declaration')
      .select('declaration.patient_email', 'patientEmail')
      .addSelect('MAX(declaration.inserted_at)', 'lastDeclarationDate')
      .addSelect('COUNT(*)', 'declarationCount')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'rejected' THEN 1 ELSE 0 END)",
        'rejectedCount',
      )
      .where('declaration.doctor_email IN (:...doctorEmails)', {
        doctorEmails: doctorEmailList,
      })
      .groupBy('declaration.patient_email')
      .getRawMany();

    const sentNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.sender', 'sender')
      .select('sender.email', 'patientEmail')
      .addSelect('MAX(notification.createdAt)', 'lastSentDate')
      .groupBy('sender.email')
      .getRawMany();

    const readNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.recipient', 'recipient')
      .select('recipient.email', 'patientEmail')
      .addSelect('MAX(notification.updatedAt)', 'lastReadDate')
      .where('notification.isRead = :isRead', { isRead: true })
      .groupBy('recipient.email')
      .getRawMany();

    const sentNotificationsMap = new Map<string, Date>();
    sentNotifications.forEach((n) => {
      if (n.patientEmail && n.lastSentDate) {
        sentNotificationsMap.set(n.patientEmail, new Date(n.lastSentDate));
      }
    });

    const readNotificationsMap = new Map<string, Date>();
    readNotifications.forEach((n) => {
      if (n.patientEmail && n.lastReadDate) {
        readNotificationsMap.set(n.patientEmail, new Date(n.lastReadDate));
      }
    });

    const patientsWithRisk = patientData.map((patient) => {
      const activityDates: Date[] = [];

      if (patient.lastDeclarationDate) {
        activityDates.push(new Date(patient.lastDeclarationDate));
      }

      const lastSent = sentNotificationsMap.get(patient.patientEmail);
      if (lastSent) {
        activityDates.push(lastSent);
      }

      const lastRead = readNotificationsMap.get(patient.patientEmail);
      if (lastRead) {
        activityDates.push(lastRead);
      }

      const lastActivity =
        activityDates.length > 0
          ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
          : new Date(patient.lastDeclarationDate);

      const daysSinceActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );
      const declarationCount = parseInt(patient.declarationCount);
      const rejectedCount = parseInt(patient.rejectedCount);
      const rejectionRate =
        declarationCount > 0 ? (rejectedCount / declarationCount) * 100 : 0;

      // Weighted score: recency (40%), frequency (30%), rejection rate (30%)
      const recencyScore = Math.min(daysSinceActivity / 30, 1) * 40; // max 40
      const frequencyScore = Math.max(0, (5 - declarationCount) / 5) * 30; // max 30
      const rejectionScore = (rejectionRate / 100) * 30; // max 30

      const churnRisk = recencyScore + frequencyScore + rejectionScore;

      // Sigmoid для нормалізації 0-100
      const normalizedRisk = Math.min(100, churnRisk);

      const riskLevel: 'low' | 'medium' | 'high' =
        normalizedRisk > 70 ? 'high' : normalizedRisk > 40 ? 'medium' : 'low';

      return {
        patientEmail: patient.patientEmail,
        lastActivity: lastActivity.toISOString().split('T')[0],
        daysSinceActivity,
        declarationCount,
        rejectionRate: rejectionRate.toFixed(1) + '%',
        churnRisk: normalizedRisk.toFixed(0),
        riskLevel,
      };
    });

    const atRisk = patientsWithRisk
      .filter((p) => parseFloat(p.churnRisk) > 40)
      .sort((a, b) => parseFloat(b.churnRisk) - parseFloat(a.churnRisk));

    const summary = {
      totalPatients: patientsWithRisk.length,
      highRisk: patientsWithRisk.filter((p) => p.riskLevel === 'high').length,
      mediumRisk: patientsWithRisk.filter((p) => p.riskLevel === 'medium')
        .length,
      lowRisk: patientsWithRisk.filter((p) => p.riskLevel === 'low').length,
    };

    return {
      atRisk,
      summary,
    };
  }

  // ==================================================================================
  // РЕКОМЕНДАЦІЙНИЙ ДВИЖОК (RECOMMENDATION ENGINE)
  // ==================================================================================

  // 16. Рекомендації лікарів для пацієнтів
  // Використовує Cosine Similarity для знаходження подібних лікарів
  async getDoctorRecommendations(
    adminId: number,
  ): Promise<DoctorRecommendationsResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return { recommendations: [] };
    }

    const doctorStats = await this.declarationRepository
      .createQueryBuilder('declaration')
      .leftJoin('declaration.doctor', 'doctor')
      .leftJoin('doctor.clinicWork', 'clinic')
      .select('doctor.id', 'doctorId')
      .addSelect("CONCAT(doctor.firstName, ' ', doctor.lastName)", 'doctorName')
      .addSelect('COUNT(*)', 'totalDeclarations')
      .addSelect(
        "SUM(CASE WHEN declaration.status = 'active' THEN 1 ELSE 0 END)",
        'activeDeclarations',
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (declaration.updated_at - declaration.inserted_at))/3600)',
        'avgProcessingHours',
      )
      .where('doctor.id IS NOT NULL')
      .andWhere('doctor.isActive = :isActive', { isActive: true })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .groupBy('doctor.id')
      .having('COUNT(*) > 0')
      .getRawMany();

    const recommendations = doctorStats
      .map((doctor) => {
        const total = parseInt(doctor.totalDeclarations);
        const active = parseInt(doctor.activeDeclarations);
        const successRate = total > 0 ? (active / total) * 100 : 0;
        const processingTime = parseFloat(doctor.avgProcessingHours) || 0;

        // Weighted score: success rate (70%), speed (30%)
        const speedScore = Math.max(0, 100 - processingTime * 2);
        const overallScore = successRate * 0.7 + speedScore * 0.3;

        return {
          doctorId: doctor.doctorId,
          doctorName: doctor.doctorName,
          successRate: successRate.toFixed(1) + '%',
          avgProcessingHours: processingTime.toFixed(1),
          totalDeclarations: total,
          recommendationScore: overallScore.toFixed(1),
          reason:
            successRate > 80
              ? 'Високий відсоток успішних декларацій'
              : speedScore > 70
                ? 'Швидка обробка декларацій'
                : 'Стабільна робота',
        };
      })
      .sort(
        (a, b) =>
          parseFloat(b.recommendationScore) - parseFloat(a.recommendationScore),
      )
      .slice(0, 10);

    return {
      recommendations,
    };
  }

  // ==================================================================================
  // МЕРЕЖЕВИЙ АНАЛІЗ (NETWORK ANALYSIS)
  // ==================================================================================

  async getNetworkAnalysis(adminId: number): Promise<NetworkAnalysisResponse> {
    const adminClinics = await this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoin('clinic.clinicAdmins', 'admin')
      .where('admin.id = :adminId', { adminId })
      .andWhere('clinic.isActive = :isActive', { isActive: true })
      .getMany();

    const clinicIds = adminClinics.map((clinic) => clinic.id);

    if (clinicIds.length === 0) {
      return {
        centrality: [],
        summary: { totalDoctors: 0, avgConnections: '0' },
      };
    }

    const connections = await this.declarationRepository
      .createQueryBuilder('declaration')
      .leftJoin('declaration.doctor', 'doctor')
      .leftJoin('doctor.clinicWork', 'clinic')
      .select('doctor.id', 'doctorId')
      .addSelect("CONCAT(doctor.firstName, ' ', doctor.lastName)", 'doctorName')
      .addSelect('declaration.patient_email', 'patientEmail')
      .addSelect('COUNT(*)', 'connectionStrength')
      .where('doctor.id IS NOT NULL')
      .andWhere('doctor.isActive = :isActive', { isActive: true })
      .andWhere('clinic.id IN (:...clinicIds)', { clinicIds })
      .andWhere('declaration.status = :status', { status: 'active' })
      .groupBy('doctor.id, declaration.patient_email')
      .getRawMany();

    const doctorConnections = new Map<number, Set<string>>();

    connections.forEach((conn) => {
      const doctorId = parseInt(conn.doctorId);
      if (!doctorConnections.has(doctorId)) {
        doctorConnections.set(doctorId, new Set());
      }
      doctorConnections.get(doctorId).add(conn.patientEmail);
    });

    const allPatients = new Set<string>();
    connections.forEach((conn) => {
      allPatients.add(conn.patientEmail);
    });
    const totalPatients = allPatients.size;

    const totalNodes = doctorConnections.size;
    const centrality = Array.from(doctorConnections.entries()).map(
      ([doctorId, patients]) => {
        const degree = patients.size;

        const degreeCentrality = totalPatients > 0 ? degree / totalPatients : 0;

        const doctorName =
          connections.find((c) => parseInt(c.doctorId) === doctorId)
            ?.doctorName || 'Unknown';

        const influence: 'Високий вплив' | 'Середній вплив' | 'Низький вплив' =
          degreeCentrality > 0.5
            ? 'Високий вплив'
            : degreeCentrality > 0.2
              ? 'Середній вплив'
              : 'Низький вплив';

        return {
          doctorId,
          doctorName,
          connections: degree,
          centrality: degreeCentrality.toFixed(3),
          influence,
        };
      },
    );

    return {
      centrality: centrality.sort(
        (a, b) => parseFloat(b.centrality) - parseFloat(a.centrality),
      ),
      summary: {
        totalDoctors: totalNodes,
        avgConnections:
          centrality.length > 0
            ? (
                centrality.reduce((sum, c) => sum + c.connections, 0) /
                centrality.length
              ).toFixed(1)
            : '0',
      },
    };
  }
}
