import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Res,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { DeclarationService } from './declaration.service';
import {
  CreateDeclarationDto,
  UpdateDeclarationDto,
  DoctorReviewDto,
  DoctorSignDto,
  CreatePatientDeclarationDto,
  DoctorCompleteDeclarationDto,
  UpdatePatientDeclarationDto,
  DoctorListDto,
} from './declaration.dto';
import { Declaration } from './declaration.entity';
import { DeclarationStatus } from './declaration.enum';
import { Division } from '../division/division.entity';
import { LegalEntity } from '../legalEntity/lagalEntity.entity';
import { JwtAuthGuard } from '../jwt/jwt.auth.guard';
import { CurrentUser } from '../decorators/user.decorator';
import { GetUserInfoDto } from '../user/dtos';

// Assuming you have these guards, adjust imports as needed
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('declarations')
@Controller('declarations')
// @UseGuards(JwtAuthGuard) // Uncomment if you use JWT auth
@ApiBearerAuth()
export class DeclarationController {
  constructor(private readonly declarationService: DeclarationService) {}

  // PATIENT ENDPOINTS
  @Post('patient/create')
  @ApiOperation({
    summary: 'Patient creates a new declaration request with minimal data',
  })
  @ApiResponse({
    status: 201,
    description: 'Declaration request created successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
  })
  @ApiBody({ type: CreatePatientDeclarationDto })
  @UseGuards(JwtAuthGuard)
  async createByPatient(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Body(ValidationPipe)
    createPatientDeclarationDto: CreatePatientDeclarationDto,
  ): Promise<Declaration> {
    return this.declarationService.createByPatient(
      createPatientDeclarationDto,
      getUserInfoDto.userId,
    );
  }

  @Patch('patient/:id')
  @ApiOperation({
    summary: 'Patient updates their pending declaration (limited fields)',
  })
  @ApiResponse({
    status: 200,
    description: 'Declaration updated successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your declaration or wrong status',
  })
  @ApiParam({ name: 'id', description: 'Declaration ID' })
  @ApiBody({ type: UpdatePatientDeclarationDto })
  @UseGuards(JwtAuthGuard)
  async updateByPatient(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body(ValidationPipe)
    updatePatientDeclarationDto: UpdatePatientDeclarationDto,
  ): Promise<Declaration> {
    return this.declarationService.updateByPatient(
      id,
      updatePatientDeclarationDto,
      getUserInfoDto.userId,
    );
  }

  @Get('patient/my')
  @ApiOperation({ summary: 'Get current patient declarations' })
  @ApiResponse({
    status: 200,
    description: 'Patient declarations retrieved successfully',
    type: [Declaration],
  })
  @UseGuards(JwtAuthGuard)
  async findMyPatientDeclarations(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Declaration[]> {
    return this.declarationService.findByPatient(getUserInfoDto.userId);
  }

  @Get('patient/my/summary')
  @ApiOperation({ summary: 'Get current patient declarations summary' })
  @ApiResponse({
    status: 200,
    description: 'Patient summary retrieved successfully',
  })
  @UseGuards(JwtAuthGuard)
  async getMyPatientSummary(@CurrentUser() getUserInfoDto: GetUserInfoDto) {
    return this.declarationService.getPatientDeclarationsSummary(
      getUserInfoDto.userId,
    );
  }

  // DOCTOR ENDPOINTS
  @UseGuards(JwtAuthGuard)
  @Get('doctor/pending-review')
  @ApiOperation({
    summary: 'Get declarations pending doctor review/completion',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending declarations retrieved successfully',
    type: [Declaration],
  })
  @UseGuards(JwtAuthGuard)
  async findPendingReview(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Declaration[]> {
    return this.declarationService.findPendingReviewByDoctor(
      getUserInfoDto.userId,
    );
  }

  @Get('doctor/pending-sign')
  @ApiOperation({ summary: 'Get declarations pending doctor signature' })
  @ApiResponse({
    status: 200,
    description: 'Pending signatures retrieved successfully',
    type: [Declaration],
  })
  @UseGuards(JwtAuthGuard)
  async findPendingSign(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Declaration[]> {
    return this.declarationService.findPendingSignByDoctor(
      getUserInfoDto.userId,
    );
  }

  @Patch('doctor/:id/complete')
  @ApiOperation({
    summary: 'Doctor completes declaration with all professional data',
  })
  @ApiResponse({
    status: 200,
    description: 'Declaration completed successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your declaration or wrong status',
  })
  @ApiParam({ name: 'id', description: 'Declaration ID' })
  @ApiBody({ type: DoctorCompleteDeclarationDto })
  @UseGuards(JwtAuthGuard)
  async completeByDoctor(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body(ValidationPipe) doctorCompleteDto: DoctorCompleteDeclarationDto,
  ): Promise<Declaration> {
    return this.declarationService.completeByDoctor(
      id,
      doctorCompleteDto,
      getUserInfoDto.userId,
    );
  }

  @Patch('doctor/:id/review')
  @ApiOperation({
    summary: 'Doctor reviews and adds data to declaration (legacy)',
  })
  @ApiResponse({
    status: 200,
    description: 'Declaration reviewed successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your declaration or wrong status',
  })
  @ApiParam({ name: 'id', description: 'Declaration ID' })
  @ApiBody({ type: DoctorReviewDto })
  @UseGuards(JwtAuthGuard)
  async reviewByDoctor(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body(ValidationPipe) doctorReviewDto: DoctorReviewDto,
  ): Promise<Declaration> {
    return this.declarationService.reviewByDoctor(
      id,
      doctorReviewDto,
      getUserInfoDto.userId,
    );
  }

  @Patch('doctor/:id/sign')
  @ApiOperation({ summary: 'Doctor signs declaration making it active' })
  @ApiResponse({
    status: 200,
    description: 'Declaration signed successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your declaration or wrong status',
  })
  @ApiParam({ name: 'id', description: 'Declaration ID' })
  @ApiBody({ type: DoctorSignDto })
  @UseGuards(JwtAuthGuard)
  async signByDoctor(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body(ValidationPipe) doctorSignDto: DoctorSignDto,
  ): Promise<Declaration> {
    return this.declarationService.signByDoctor(
      id,
      doctorSignDto,
      getUserInfoDto.userId,
    );
  }

  @Patch('doctor/:id/reject')
  @ApiOperation({ summary: 'Doctor rejects declaration' })
  @ApiResponse({
    status: 200,
    description: 'Declaration rejected successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your declaration or wrong status',
  })
  @ApiParam({ name: 'id', description: 'Declaration ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for rejection',
          example: 'Incomplete patient information',
        },
      },
      required: ['reason'],
    },
  })
  @UseGuards(JwtAuthGuard)
  async rejectByDoctor(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Declaration> {
    return this.declarationService.rejectByDoctor(
      id,
      reason,
      getUserInfoDto.userId,
    );
  }

  @Get('doctor/my')
  @ApiOperation({ summary: 'Get current doctor declarations' })
  @ApiResponse({
    status: 200,
    description: 'Doctor declarations retrieved successfully',
    type: [Declaration],
  })
  @UseGuards(JwtAuthGuard)
  async findMyDoctorDeclarations(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Declaration[]> {
    return this.declarationService.findByDoctor(getUserInfoDto.userId);
  }

  @Get('doctor/my/summary')
  @ApiOperation({ summary: 'Get current doctor declarations summary' })
  @ApiResponse({
    status: 200,
    description: 'Doctor summary retrieved successfully',
  })
  @UseGuards(JwtAuthGuard)
  async getMyDoctorSummary(@CurrentUser() getUserInfoDto: GetUserInfoDto) {
    return this.declarationService.getDoctorDeclarationsSummary(
      getUserInfoDto.userId,
    );
  }

  // LEGACY ENDPOINTS (for backward compatibility)
  @Post('patient/create-legacy')
  @ApiOperation({
    summary: 'Patient creates declaration with full data (legacy)',
  })
  @ApiResponse({
    status: 201,
    description: 'Declaration created successfully',
    type: Declaration,
  })
  @ApiBody({ type: CreateDeclarationDto })
  @UseGuards(JwtAuthGuard)
  async createByPatientLegacy(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Body(ValidationPipe) createDeclarationDto: CreateDeclarationDto,
  ): Promise<Declaration> {
    return this.declarationService.createByPatientLegacy(
      createDeclarationDto,
      getUserInfoDto.userId,
    );
  }

  @Patch('patient/:id/legacy')
  @ApiOperation({
    summary: 'Patient updates declaration with full data (legacy)',
  })
  @ApiResponse({
    status: 200,
    description: 'Declaration updated successfully',
    type: Declaration,
  })
  @ApiBody({ type: UpdateDeclarationDto })
  @UseGuards(JwtAuthGuard)
  async updateByPatientLegacy(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body(ValidationPipe) updateDeclarationDto: UpdateDeclarationDto,
  ): Promise<Declaration> {
    return this.declarationService.updateByPatientLegacy(
      id,
      updateDeclarationDto,
      getUserInfoDto.userId,
    );
  }

  // COMMON ENDPOINTS (unchanged)
  @Get()
  @ApiOperation({
    summary: 'Get all declarations with pagination (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of declarations retrieved successfully',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeclarationStatus,
    description: 'Filter by declaration status',
  })
  // @Roles('admin') // Uncomment if you have role-based access
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: DeclarationStatus,
  ) {
    if (status) {
      const declarations = await this.declarationService.findByStatus(status);
      return {
        data: declarations,
        total: declarations.length,
        page: 1,
        limit: declarations.length,
        totalPages: 1,
      };
    }
    return this.declarationService.findAll(page, limit);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active declarations' })
  @ApiResponse({
    status: 200,
    description: 'Active declarations retrieved successfully',
    type: [Declaration],
  })
  async findActiveDeclarations(): Promise<Declaration[]> {
    return this.declarationService.findActiveDeclarations();
  }

  @Get('number/:declarationNumber')
  @ApiOperation({ summary: 'Get declaration by declaration number' })
  @ApiResponse({
    status: 200,
    description: 'Declaration found successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 404,
    description: 'Declaration not found',
  })
  @ApiParam({
    name: 'declarationNumber',
    description: 'Declaration number',
    example: 'DCL-123456-ABCD',
  })
  async findByDeclarationNumber(
    @Param('declarationNumber') declarationNumber: string,
  ): Promise<Declaration> {
    return this.declarationService.findByDeclarationNumber(declarationNumber);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get current user declarations (as patient or doctor)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user declarations retrieved successfully',
    type: [Declaration],
  })
  @UseGuards(JwtAuthGuard)
  async findMyDeclarations(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Declaration[]> {
    return this.declarationService.findByUser(getUserInfoDto.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get declaration by ID' })
  @ApiResponse({
    status: 200,
    description: 'Declaration found successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 404,
    description: 'Declaration not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Declaration ID',
    type: String,
  })
  async findOne(@Param('id') id: string): Promise<Declaration> {
    return this.declarationService.findOne(id);
  }

  @Patch(':id/terminate')
  @ApiOperation({ summary: 'Terminate active declaration (patient or doctor)' })
  @ApiResponse({
    status: 200,
    description: 'Declaration terminated successfully',
    type: Declaration,
  })
  @ApiResponse({
    status: 400,
    description: 'Declaration is not active',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to terminate this declaration',
  })
  @ApiParam({
    name: 'id',
    description: 'Declaration ID',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for termination',
          example: 'Patient requested termination',
        },
      },
      required: ['reason'],
    },
  })
  @UseGuards(JwtAuthGuard)
  async terminate(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Declaration> {
    return this.declarationService.terminate(id, reason, getUserInfoDto.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete declaration (admin only)' })
  @ApiResponse({
    status: 204,
    description: 'Declaration deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Declaration not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Declaration ID',
    type: String,
  })
  // @Roles('admin') // Uncomment if you have role-based access
  async remove(@Param('id') id: string): Promise<void> {
    return this.declarationService.remove(id);
  }

  // STATISTICS ENDPOINTS - unchanged
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get declarations overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getOverviewStats() {
    const activeDeclarations =
      await this.declarationService.findActiveDeclarations();
    const allDeclarations = await this.declarationService.findAll(1, 1000);

    return {
      total: allDeclarations.total,
      active: activeDeclarations.length,
      terminated: allDeclarations.data.filter(
        (d) => d.status === DeclarationStatus.TERMINATED,
      ).length,
      pending_review: allDeclarations.data.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_REVIEW,
      ).length,
      pending_sign: allDeclarations.data.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_SIGN,
      ).length,
      rejected: allDeclarations.data.filter(
        (d) => d.status === DeclarationStatus.REJECTED,
      ).length,
    };
  }

  @Get('stats/by-status')
  @ApiOperation({ summary: 'Get declarations count by status' })
  @ApiResponse({
    status: 200,
    description: 'Statistics by status retrieved successfully',
  })
  async getStatsByStatus() {
    const allDeclarations = await this.declarationService.findAll(1, 1000);
    const statusCounts = {};

    Object.values(DeclarationStatus).forEach((status) => {
      statusCounts[status] = allDeclarations.data.filter(
        (d) => d.status === status,
      ).length;
    });

    return statusCounts;
  }

  @Get('stats/workflow')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({
    status: 200,
    description: 'Workflow statistics retrieved successfully',
  })
  async getWorkflowStats() {
    const allDeclarations = await this.declarationService.findAll(1, 1000);
    const data = allDeclarations.data;

    // Calculate average processing times (example logic)
    const processingTimes = {
      avg_review_time: 0, // Would need to track when review started/completed
      avg_sign_time: 0, // Would need to track when sign started/completed
      total_in_workflow: data.filter((d) =>
        [
          DeclarationStatus.PENDING_DOCTOR_REVIEW,
          DeclarationStatus.PENDING_DOCTOR_SIGN,
        ].includes(d.status),
      ).length,
    };

    return {
      ...processingTimes,
      pending_review: data.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_REVIEW,
      ).length,
      pending_sign: data.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_SIGN,
      ).length,
      completed_today: data.filter(
        (d) =>
          d.status === DeclarationStatus.ACTIVE &&
          new Date(d.signed_at).toDateString() === new Date().toDateString(),
      ).length,
    };
  }
  @Get('doctors/available')
  @ApiOperation({ summary: 'Get available doctors for declaration' })
  @ApiResponse({
    status: 200,
    description: 'Available doctors retrieved successfully',
    type: [DoctorListDto],
  })
  async getAvailableDoctors(): Promise<DoctorListDto[]> {
    return this.declarationService.getAvailableDoctors();
  }
  @Get('dictionaries/divisions')
  @ApiOperation({ summary: 'Get all divisions for doctor selection' })
  @ApiResponse({
    status: 200,
    description: 'Divisions retrieved successfully',
    type: [Division],
  })
  async getDivisions(): Promise<Division[]> {
    return this.declarationService.getDivisions();
  }

  @Get('dictionaries/legal-entities')
  @ApiOperation({ summary: 'Get all legal entities for doctor selection' })
  @ApiResponse({
    status: 200,
    description: 'Legal entities retrieved successfully',
    type: [LegalEntity],
  })
  async getLegalEntities(): Promise<LegalEntity[]> {
    return this.declarationService.getLegalEntities();
  }

  @Get(':id/pdf')
  async generateDeclarationPdf(
    @Param('id') declarationId: string,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const pdfBuffer =
        await this.declarationService.generatePdf(declarationId);

      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Length', pdfBuffer.length);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="declaration-${declarationId}.pdf"`,
      );

      response.end(pdfBuffer);
    } catch (error) {
      if (error.status === 404) {
        throw new HttpException('Декларацію не знайдено', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Помилка генерації PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/pdf/preview')
  async previewDeclarationPdf(
    @Param('id') declarationId: string,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const pdfBuffer =
        await this.declarationService.generatePdf(declarationId);

      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', 'inline');
      response.setHeader('Content-Length', pdfBuffer.length);

      response.end(pdfBuffer);
    } catch (error) {
      if (error.status === 404) {
        throw new HttpException('Декларацію не знайдено', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Помилка генерації PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
