export interface UserActivityStatsResponse {
  dailyActiveUsers: Array<{
    date: string;
    activeUsers: number;
  }>;
  loginStats: {
    totalLogins: number;
    uniqueUsers: number;
    totalUsers: number;
  };
}

export interface DeclarationWorkflowStatsResponse {
  statusStats: Array<{
    status: string;
    count: number;
  }>;
  processingTimes: Array<{
    status: string;
    avgProcessingHours: string;
    count: number;
  }>;
  workflowSummary: {
    totalDeclarations: string;
    completed: string;
    rejected: string;
    pending: string;
  };
}

export interface DoctorPerformanceStatsResponse {
  doctorStats: Array<{
    doctorId: number;
    doctorName: string;
    totalDeclarations: number;
    activeDeclarations: number;
    rejectedDeclarations: number;
    avgProcessingHours: string;
  }>;
}

export interface ClinicStatsResponse {
  clinicStats: {
    totalClinics: string;
    activeClinics: string;
  };
  clinicGrowth: Array<{
    date: string;
    newClinics: number;
    totalClinics: number;
  }>;
}

export interface NotificationEngagementStatsResponse {
  dailyNotifications: Array<{
    date: string;
    sent: number;
    read: number;
  }>;
  metrics: {
    openRate: string;
    totalSent: number;
    totalRead: number;
  };
}

export interface SystemOverviewResponse {
  users: {
    total: number;
    active: number;
  };
  declarations: {
    total: number;
    active: number;
    pending: number;
    allTime: {
      total: number;
      active: number;
      pending: number;
    };
  };
  clinics: {
    total: number;
    active: number;
  };
}

type WorkloadPredictionResponseConfidence = 'low' | 'medium' | 'high';

type WorkloadPredictionResponseTrend = 'stable' | 'growing' | 'declining';

export interface WorkloadPredictionResponse {
  predictions: Array<{
    date: string;
    predicted: number;
    confidence: WorkloadPredictionResponseConfidence;
  }>;
  peakDays: Array<{
    day: string;
    count: number;
  }>;
  averageLoad: number;
  trend: WorkloadPredictionResponseTrend;
  historicalAverage: number;
  slope: string;
}

type AnomalyDetectionResponseType = 'spike' | 'drop' | 'high_rejection_rate';

type AnomalyDetectionResponseSeverity = 'warning' | 'critical';

export interface AnomalyDetectionResponse {
  anomalies: Array<{
    date: string;
    type: AnomalyDetectionResponseType;
    severity: AnomalyDetectionResponseSeverity;
    metric: string;
    value: number | string;
    expected: number | string;
    deviation: string;
    zScore: string;
    description: string;
  }>;
  summary: {
    total: number;
    critical: number;
    warning: number;
  };
  stats?: {
    mean: number;
    stdDev: number;
    avgRejectionRate: string;
  };
}

type DoctorAnomaliesResponseType =
  | 'high_rejection_rate'
  | 'slow_processing'
  | 'low_activity';

type DoctorAnomaliesResponseSeverity = 'warning' | 'critical';

export interface DoctorAnomaliesResponse {
  anomalies: Array<{
    doctorId: number;
    doctorName: string;
    type: DoctorAnomaliesResponseType;
    severity: DoctorAnomaliesResponseSeverity;
    value: string;
    expected: string;
    description: string;
  }>;
  stats: {
    avgRejectionRate: string;
    avgProcessingTime: string;
    totalDoctors: number;
  };
}

export interface CohortAnalysisResponse {
  cohorts: Array<{
    cohort: string;
    patientCount: number;
    declarationCount: number;
    activeCount: number;
    retentionRate: string;
  }>;
  summary: {
    totalCohorts: number;
    avgRetentionRate: string;
  };
}

export interface FunnelAnalysisResponse {
  stages: Array<{
    stage: string;
    count: number;
    conversion: string;
    dropOff: string;
  }>;
  overallConversion: string;
  totalDeclarations: number;
  bottleneck: string;
}

export type RFMSegment =
  | 'Champions'
  | 'Loyal'
  | 'Potential Loyalists'
  | 'At Risk'
  | "Can't Lose Them"
  | 'Hibernating'
  | 'Need Attention';

export interface RFMAnalysisResponse {
  doctors: Array<{
    doctorId: number;
    doctorName: string;
    recency: string;
    frequency: number;
    monetary: number;
    R: number;
    F: number;
    M: number;
    rfmScore: number;
    segment: RFMSegment;
  }>;
  segments: Record<string, number>;
}

type PatternAnalysisResponseInterpretation =
  | 'Сильна кореляція'
  | 'Помірна кореляція'
  | 'Слабка кореляція';

export interface PatternAnalysisResponse {
  patterns: Array<{
    pattern: string;
    data: Array<{
      day?: string;
      hour?: string;
      count: number;
      rejectionRate?: string;
    }>;
  }>;
  correlations: Array<{
    metric1: string;
    metric2: string;
    correlation: string;
    interpretation: PatternAnalysisResponseInterpretation;
  }>;
}

type SentimentAnalysisResponseSentiment = 'positive' | 'neutral' | 'negative';

export interface SentimentAnalysisResponse {
  sentiment: SentimentAnalysisResponseSentiment;
  score: string;
  distribution: Record<string, number>;
  summary: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

type TChurnPredictionResponse = 'low' | 'medium' | 'high';

export interface ChurnPredictionResponse {
  atRisk: Array<{
    patientEmail: string;
    lastActivity: string;
    daysSinceActivity: number;
    declarationCount: number;
    rejectionRate: string;
    churnRisk: string;
    riskLevel: TChurnPredictionResponse;
  }>;
  summary: {
    totalPatients: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export interface DoctorRecommendationsResponse {
  recommendations: Array<{
    doctorId: number;
    doctorName: string;
    successRate: string;
    avgProcessingHours: string;
    totalDeclarations: number;
    recommendationScore: string;
    reason: string;
  }>;
}

type NetworkAnalysisResponseInfluence =
  | 'Високий вплив'
  | 'Середній вплив'
  | 'Низький вплив';

export interface NetworkAnalysisResponse {
  centrality: Array<{
    doctorId: number;
    doctorName: string;
    connections: number;
    centrality: string;
    influence: NetworkAnalysisResponseInfluence;
  }>;
  summary: {
    totalDoctors: number;
    avgConnections: string;
  };
}
