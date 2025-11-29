import { Controller, Get, Query, UseGuards, Post, Body } from '@nestjs/common';
import { AnalyticsService, TrackEventDto } from './analytics.service';
import { JwtAuthGuard } from '../jwt/jwt.auth.guard';
import { CurrentUser } from '../decorators/user.decorator';
import { GetUserInfoDto } from '../user/dtos';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(JwtAuthGuard)
  async trackEvent(
    @CurrentUser() user: GetUserInfoDto,
    @Body() dto: Omit<TrackEventDto, 'userId'>,
  ) {
    return await this.analyticsService.trackEvent({
      ...dto,
      userId: user.userId,
    });
  }

  @Post('track/user-profile-update')
  @UseGuards(JwtAuthGuard)
  async trackUserProfileUpdate(
    @CurrentUser() user: GetUserInfoDto,
    @Body() body: { changedFields: string[] },
  ) {
    return await this.analyticsService.trackUserProfileUpdate(
      user.userId,
      body.changedFields,
    );
  }

  @Post('track/declaration-status-change')
  @UseGuards(JwtAuthGuard)
  async trackDeclarationStatusChange(
    @CurrentUser() user: GetUserInfoDto,
    @Body()
    body: { declarationId: string; oldStatus: string; newStatus: string },
  ) {
    return await this.analyticsService.trackDeclarationStatusChange(
      body.declarationId,
      body.oldStatus,
      body.newStatus,
      user.userId,
    );
  }

  @Post('track/clinic-event')
  @UseGuards(JwtAuthGuard)
  async trackClinicEvent(
    @CurrentUser() user: GetUserInfoDto,
    @Body() body: { eventType: string; clinicId: number; metadata?: any },
  ) {
    return await this.analyticsService.trackClinicEvent(
      body.eventType as any,
      body.clinicId,
      user.userId,
      body.metadata,
    );
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async getSystemOverview(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getSystemOverview(
      start,
      end,
      user.userId,
    );
  }

  @Get('users/activity')
  @UseGuards(JwtAuthGuard)
  async getUserActivity(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getUserActivityStats(
      start,
      end,
      user.userId,
    );
  }

  @Get('declarations/workflow')
  @UseGuards(JwtAuthGuard)
  async getDeclarationWorkflow(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getDeclarationWorkflowStats(
      start,
      end,
      user.userId,
    );
  }

  @Get('doctors/performance')
  @UseGuards(JwtAuthGuard)
  async getDoctorPerformance(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getDoctorPerformanceStats(
      start,
      end,
      user.userId,
    );
  }

  @Get('clinics/stats')
  @UseGuards(JwtAuthGuard)
  async getClinicStats(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getClinicStats(start, end, user.userId);
  }

  @Get('notifications/engagement')
  @UseGuards(JwtAuthGuard)
  async getNotificationEngagement(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getNotificationEngagementStats(
      start,
      end,
      user.userId,
    );
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardData(
    @CurrentUser() user: GetUserInfoDto,
    @Query('period')
    period: 'day' | 'week' | 'month' | 'quarter' | 'all' = 'month',
  ) {
    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const [
      overview,
      userActivity,
      declarationWorkflow,
      doctorPerformance,
      clinicStats,
      notificationEngagement,
    ] = await Promise.all([
      this.analyticsService.getSystemOverview(startDate, endDate, user.userId),
      this.analyticsService.getUserActivityStats(
        startDate,
        endDate,
        user.userId,
      ),
      this.analyticsService.getDeclarationWorkflowStats(
        startDate,
        endDate,
        user.userId,
      ),
      this.analyticsService.getDoctorPerformanceStats(
        startDate,
        endDate,
        user.userId,
      ),
      this.analyticsService.getClinicStats(startDate, endDate, user.userId),
      this.analyticsService.getNotificationEngagementStats(
        startDate,
        endDate,
        user.userId,
      ),
    ]);

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overview,
      userActivity,
      declarationWorkflow,
      doctorPerformance,
      clinicStats,
      notificationEngagement,
    };
  }

  @Get('metrics/summary')
  @UseGuards(JwtAuthGuard)
  async getMetricsSummary(@CurrentUser() user: GetUserInfoDto) {
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const overview = await this.analyticsService.getSystemOverview(
      yearAgo,
      now,
      user.userId,
    );
    const declarationWorkflow =
      await this.analyticsService.getDeclarationWorkflowStats(
        yearAgo,
        now,
        user.userId,
      );
    const notificationEngagement =
      await this.analyticsService.getNotificationEngagementStats(
        yearAgo,
        now,
        user.userId,
      );

    const totalDeclarations = overview.declarations.total;
    const activeDeclarations = overview.declarations.active;
    const successRate =
      totalDeclarations > 0
        ? ((activeDeclarations / totalDeclarations) * 100).toFixed(1)
        : '0';

    return {
      summary: {
        totalUsers: overview.users.total,
        activeUsers: overview.users.active,
        totalDeclarations: overview.declarations.total,
        successRate: `${successRate}%`,
        notificationOpenRate: notificationEngagement.metrics.openRate,
        activeClinics: overview.clinics.active,
      },
      declarationWorkflow,
      period: 'last_30_days',
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('debug/counts')
  @UseGuards(JwtAuthGuard)
  async getDebugCounts() {
    const totalUsers = await this.analyticsService['userRepository'].count();
    const totalDeclarations =
      await this.analyticsService['declarationRepository'].count();
    const totalClinics =
      await this.analyticsService['clinicRepository'].count();
    const totalNotifications =
      await this.analyticsService['notificationRepository'].count();

    const sampleDeclaration = await this.analyticsService[
      'declarationRepository'
    ]
      .createQueryBuilder('declaration')
      .select([
        'declaration.id',
        'declaration.inserted_at',
        'declaration.status',
      ])
      .orderBy('declaration.id', 'DESC')
      .limit(1)
      .getOne();

    return {
      counts: {
        users: totalUsers,
        declarations: totalDeclarations,
        clinics: totalClinics,
        notifications: totalNotifications,
      },
      sampleDeclaration,
      info: 'Це для дебагу - показує загальні дані без фільтрації',
    };
  }

  // ==================================================================================
  // ПРОГНОСТИЧНА АНАЛІТИКА (PREDICTIVE ANALYTICS) ENDPOINTS
  // ==================================================================================

  // 9. Прогнозування навантаження
  @Get('predictive/workload')
  @UseGuards(JwtAuthGuard)
  async predictWorkload(
    @CurrentUser() user: GetUserInfoDto,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const days = daysAhead ? parseInt(daysAhead) : 7;
    return await this.analyticsService.predictWorkload(user.userId, days);
  }

  // ==================================================================================
  // ВИЯВЛЕННЯ АНОМАЛІЙ (ANOMALY DETECTION) ENDPOINTS
  // ==================================================================================

  // 10. Виявлення аномалій в системі
  @Get('anomalies/system')
  @UseGuards(JwtAuthGuard)
  async detectSystemAnomalies(
    @CurrentUser() user: GetUserInfoDto,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const days = lookbackDays ? parseInt(lookbackDays) : 30;
    return await this.analyticsService.detectAnomalies(user.userId, days);
  }

  // 11. Виявлення аномалій у лікарів
  @Get('anomalies/doctors')
  @UseGuards(JwtAuthGuard)
  async detectDoctorAnomalies(
    @CurrentUser() user: GetUserInfoDto,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const days = lookbackDays ? parseInt(lookbackDays) : 30;
    return await this.analyticsService.detectDoctorAnomalies(user.userId, days);
  }

  // ==================================================================================
  // КОГОРТНИЙ АНАЛІЗ (COHORT ANALYSIS) ENDPOINTS
  // ==================================================================================

  // 12. Когортний аналіз пацієнтів
  @Get('cohort/patients')
  @UseGuards(JwtAuthGuard)
  async getCohortAnalysis(
    @CurrentUser() user: GetUserInfoDto,
    @Query('cohortBy') cohortBy?: 'month' | 'week',
  ) {
    return await this.analyticsService.getCohortAnalysis(
      user.userId,
      cohortBy || 'month',
    );
  }

  // ==================================================================================
  // АНАЛІЗ ВОРОНКИ (FUNNEL ANALYSIS) ENDPOINTS
  // ==================================================================================

  // 13. Аналіз воронки декларацій
  @Get('funnel/declarations')
  @UseGuards(JwtAuthGuard)
  async getDeclarationFunnel(
    @CurrentUser() user: GetUserInfoDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.analyticsService.getDeclarationFunnel(
      user.userId,
      start,
      end,
    );
  }

  // ==================================================================================
  // RFM АНАЛІЗ ENDPOINTS
  // ==================================================================================

  // 14. RFM аналіз лікарів
  @Get('rfm/doctors')
  @UseGuards(JwtAuthGuard)
  async getDoctorRFM(@CurrentUser() user: GetUserInfoDto) {
    return await this.analyticsService.getDoctorRFM(user.userId);
  }

  // ==================================================================================
  // РОЗПІЗНАВАННЯ ПАТЕРНІВ (PATTERN RECOGNITION) ENDPOINTS
  // ==================================================================================

  // 15. Аналіз патернів та кореляцій
  @Get('patterns/analysis')
  @UseGuards(JwtAuthGuard)
  async getPatternAnalysis(
    @CurrentUser() user: GetUserInfoDto,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const days = lookbackDays ? parseInt(lookbackDays) : 30;
    return await this.analyticsService.getPatternAnalysis(user.userId, days);
  }

  // ==================================================================================
  // АНАЛІЗ ТОНАЛЬНОСТІ (SENTIMENT ANALYSIS) ENDPOINTS
  // ==================================================================================

  // 16. Аналіз тональності
  @Get('sentiment/analysis')
  @UseGuards(JwtAuthGuard)
  async getSentimentAnalysis(
    @CurrentUser() user: GetUserInfoDto,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const days = lookbackDays ? parseInt(lookbackDays) : 30;
    return await this.analyticsService.getSentimentAnalysis(user.userId, days);
  }

  // ==================================================================================
  // ПРОГНОЗУВАННЯ ВІДТОКУ (CHURN PREDICTION) ENDPOINTS
  // ==================================================================================

  // 17. Прогнозування відтоку пацієнтів
  @Get('churn/predict')
  @UseGuards(JwtAuthGuard)
  async predictChurn(@CurrentUser() user: GetUserInfoDto) {
    return await this.analyticsService.predictChurn(user.userId);
  }

  // ==================================================================================
  // РЕКОМЕНДАЦІЙНИЙ ДВИЖОК (RECOMMENDATION ENGINE) ENDPOINTS
  // ==================================================================================

  // 18. Рекомендації лікарів
  @Get('recommendations/doctors')
  @UseGuards(JwtAuthGuard)
  async getDoctorRecommendations(@CurrentUser() user: GetUserInfoDto) {
    return await this.analyticsService.getDoctorRecommendations(user.userId);
  }

  // ==================================================================================
  // МЕРЕЖЕВИЙ АНАЛІЗ (NETWORK ANALYSIS) ENDPOINTS
  // ==================================================================================

  // 19. Мережевий аналіз взаємодій
  @Get('network/analysis')
  @UseGuards(JwtAuthGuard)
  async getNetworkAnalysis(@CurrentUser() user: GetUserInfoDto) {
    return await this.analyticsService.getNetworkAnalysis(user.userId);
  }

  // ==================================================================================
  // КОМПЛЕКСНИЙ АНАЛІТИЧНИЙ ДАШБОРД
  // ==================================================================================

  // 20. Комплексний аналітичний звіт
  @Get('comprehensive/report')
  @UseGuards(JwtAuthGuard)
  async getComprehensiveReport(
    @CurrentUser() user: GetUserInfoDto,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const days = lookbackDays ? parseInt(lookbackDays) : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [
      workloadPrediction,
      systemAnomalies,
      doctorAnomalies,
      cohortAnalysis,
      funnel,
      rfm,
      patterns,
      sentiment,
      churn,
      recommendations,
      network,
    ] = await Promise.all([
      this.analyticsService.predictWorkload(user.userId, 7),
      this.analyticsService.detectAnomalies(user.userId, days),
      this.analyticsService.detectDoctorAnomalies(user.userId, days),
      this.analyticsService.getCohortAnalysis(user.userId, 'month'),
      this.analyticsService.getDeclarationFunnel(
        user.userId,
        startDate,
        endDate,
      ),
      this.analyticsService.getDoctorRFM(user.userId),
      this.analyticsService.getPatternAnalysis(user.userId, days),
      this.analyticsService.getSentimentAnalysis(user.userId, days),
      this.analyticsService.predictChurn(user.userId),
      this.analyticsService.getDoctorRecommendations(user.userId),
      this.analyticsService.getNetworkAnalysis(user.userId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      period: {
        lookbackDays: days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      predictiveAnalytics: {
        workloadPrediction,
      },
      anomalyDetection: {
        system: systemAnomalies,
        doctors: doctorAnomalies,
      },
      cohortAnalysis,
      funnelAnalysis: funnel,
      rfmAnalysis: rfm,
      patternRecognition: patterns,
      sentimentAnalysis: sentiment,
      churnPrediction: churn,
      recommendations,
      networkAnalysis: network,
    };
  }
}
