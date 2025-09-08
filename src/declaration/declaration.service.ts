import { Declaration } from './declaration.entity';
import {
  DeclarationStatus,
  DivisionStatus,
  DivisionType,
  DocumentTypes,
  EmployeeStatus,
  EmployeeType,
  Gender,
  PhoneType,
  VerificationStatus,
} from './declaration.enum';
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
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Division } from '../division/division.entity';
import { LegalEntity } from '../legalEntity/lagalEntity.entity';
import { UserRoleEnum } from '../user/enums';
import puppeteer from 'puppeteer';

@Injectable()
export class DeclarationService {
  constructor(
    @InjectRepository(Declaration)
    private declarationRepository: Repository<Declaration>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(LegalEntity)
    private legalEntityRepository: Repository<LegalEntity>,
    @InjectRepository(Division)
    private divisionRepository: Repository<Division>,
  ) {}

  // NEW: Patient creates declaration request with minimal data
  async createByPatient(
    createPatientDeclarationDto: CreatePatientDeclarationDto,
    patientId: number,
  ): Promise<Declaration> {
    const user = await this.userRepository.findOne({
      where: { id: patientId },
    });
    // Validate that patient exists
    const patient = await this.userRepository.findOne({
      where: { email: user.email },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Validate that doctor exists
    const doctor = await this.userRepository.findOne({
      where: { email: createPatientDeclarationDto.doctor_email },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Generate declaration number
    const declarationNumber = this.generateDeclarationNumber();
    console.log(createPatientDeclarationDto);
    const declaration = this.declarationRepository.create({
      patient_email: patient.email,
      doctor_email: createPatientDeclarationDto.doctor_email,
      declaration_number: declarationNumber,
      status: DeclarationStatus.PENDING_DOCTOR_REVIEW,
      scope: createPatientDeclarationDto.scope,
      declaration_request_id:
        createPatientDeclarationDto.declaration_request_id,
      person_data: createPatientDeclarationDto.person_data,
      // All other fields will be null/undefined until doctor completes them
      start_date: null,
      end_date: null,
      reason: null,
      reason_description: null,
      employee_data: null,
      division_data: null,
      legal_entity_data: null,
      doctor_data: null,
      urgent: null,
      signed_at: null,
    });

    return await this.declarationRepository.save(declaration);
  }

  // NEW: Doctor completes declaration with all professional data
  async completeByDoctor(
    id: string,
    doctorCompleteDto: DoctorCompleteDeclarationDto,
    userId: number,
  ): Promise<Declaration> {
    const declaration = await this.findOne(id);
    const user = await this.userRepository.findOne({
      where: { isActive: true, role: UserRoleEnum.Hospital, id: userId },
    });

    // Check if this doctor is assigned to this declaration
    if (declaration.doctor_email !== user.email) {
      throw new ForbiddenException(
        'You are not authorized to complete this declaration',
      );
    }

    // Check if declaration is in correct status
    if (declaration.status !== DeclarationStatus.PENDING_DOCTOR_REVIEW) {
      throw new BadRequestException('Declaration is not in review status');
    }

    // Validate that all required data is complete
    if (
      !doctorCompleteDto.start_date ||
      !doctorCompleteDto.end_date ||
      !doctorCompleteDto.reason
    ) {
      throw new BadRequestException(
        'Start date, end date, and reason are required',
      );
    }

    // Update declaration with all doctor's data
    Object.assign(declaration, {
      start_date: doctorCompleteDto.start_date,
      end_date: doctorCompleteDto.end_date,
      reason: doctorCompleteDto.reason,
      reason_description: doctorCompleteDto.reason_description,
      employee_data: doctorCompleteDto.employee_data,
      division_data: doctorCompleteDto.division_data,
      legal_entity_data: doctorCompleteDto.legal_entity_data,
      doctor_data: doctorCompleteDto.doctor_data,
      urgent: doctorCompleteDto.urgent,
      status: DeclarationStatus.PENDING_DOCTOR_SIGN,
    });

    return await this.declarationRepository.save(declaration);
  }

  // UPDATED: Doctor reviews and adds/updates their data (backward compatibility)
  async reviewByDoctor(
    id: string,
    doctorReviewDto: DoctorReviewDto,
    userId: number,
  ): Promise<Declaration> {
    const declaration = await this.findOne(id);
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    // Check if this doctor is assigned to this declaration
    if (declaration.doctor_email !== user.email) {
      throw new ForbiddenException(
        'You are not authorized to review this declaration',
      );
    }

    // Check if declaration is in correct status
    if (declaration.status !== DeclarationStatus.PENDING_DOCTOR_REVIEW) {
      throw new BadRequestException('Declaration is not in review status');
    }

    // Update declaration with doctor's data and review
    Object.assign(declaration, {
      ...doctorReviewDto,
      status: DeclarationStatus.PENDING_DOCTOR_SIGN,
    });

    return await this.declarationRepository.save(declaration);
  }

  // Doctor signs declaration making it active
  async signByDoctor(
    id: string,
    doctorSignDto: DoctorSignDto,
    userId: number,
  ): Promise<Declaration> {
    const declaration = await this.findOne(id);
    const user = await this.userRepository.findOne({
      where: { isActive: true, role: UserRoleEnum.Hospital, id: userId },
    });
    // Check if this doctor is assigned to this declaration
    if (declaration.doctor_email !== user.email) {
      throw new ForbiddenException(
        'You are not authorized to sign this declaration',
      );
    }

    // Check if declaration is in correct status
    if (declaration.status !== DeclarationStatus.PENDING_DOCTOR_SIGN) {
      throw new BadRequestException('Declaration is not ready for signing');
    }

    // Validate that all required data is present before signing
    if (
      !declaration.start_date ||
      !declaration.end_date ||
      !declaration.reason
    ) {
      throw new BadRequestException(
        'Declaration is incomplete. Start date, end date, and reason are required before signing.',
      );
    }

    if (
      !declaration.employee_data ||
      !declaration.division_data ||
      !declaration.legal_entity_data
    ) {
      throw new BadRequestException(
        'Declaration is incomplete. Employee, division, and legal entity data are required before signing.',
      );
    }

    if (!declaration.doctor_data) {
      throw new BadRequestException(
        'Declaration is incomplete. Doctor data is required before signing.',
      );
    }

    // Sign declaration
    declaration.signed_at = new Date().toISOString();
    declaration.status = DeclarationStatus.ACTIVE;
    if (doctorSignDto.reason_description) {
      declaration.reason_description = doctorSignDto.reason_description;
    }

    return await this.declarationRepository.save(declaration);
  }

  // Doctor rejects declaration
  async rejectByDoctor(
    id: string,
    reason: string,
    userId: number,
  ): Promise<Declaration> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, role: UserRoleEnum.Hospital, id: userId },
    });
    const declaration = await this.findOne(id);
    // Check if this doctor is assigned to this declaration
    if (declaration.doctor_email !== user.email) {
      throw new ForbiddenException('It is not your declaration');
    }

    // Check if declaration can be rejected
    if (
      ![
        DeclarationStatus.PENDING_DOCTOR_REVIEW,
        DeclarationStatus.PENDING_DOCTOR_SIGN,
      ].includes(declaration.status)
    ) {
      throw new BadRequestException(
        'Declaration cannot be rejected in current status',
      );
    }

    declaration.status = DeclarationStatus.REJECTED;
    declaration.reason = reason;
    declaration.end_date = new Date().toISOString();

    return await this.declarationRepository.save(declaration);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const [declarations, total] = await this.declarationRepository.findAndCount(
      {
        relations: ['patient', 'doctor'],
        skip: (page - 1) * limit,
        take: limit,
        order: { inserted_at: 'DESC' },
      },
    );

    return {
      data: declarations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Declaration> {
    const declaration = await this.declarationRepository.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!declaration) {
      throw new NotFoundException(`Declaration with ID ${id} not found`);
    }

    return declaration;
  }

  // UPDATED: Patient can only update their own pending declaration with limited fields
  async updateByPatient(
    id: string,
    updatePatientDeclarationDto: UpdatePatientDeclarationDto,
    userId: number,
  ): Promise<Declaration> {
    const declaration = await this.findOne(id);
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    // Check if this patient owns this declaration
    if (declaration.patient_email !== user.email) {
      throw new ForbiddenException('You can only update your own declarations');
    }

    // Check if declaration can be updated
    if (declaration.status !== DeclarationStatus.PENDING_DOCTOR_REVIEW) {
      throw new BadRequestException(
        'Declaration cannot be updated in current status',
      );
    }

    // Patient can only update limited fields
    if (updatePatientDeclarationDto.doctor_email) {
      // Validate that new doctor exists
      const doctor = await this.userRepository.findOne({
        where: { email: updatePatientDeclarationDto.doctor_email },
      });
      if (!doctor) {
        throw new NotFoundException('New doctor not found');
      }
      declaration.doctor_email = updatePatientDeclarationDto.doctor_email;
    }

    if (updatePatientDeclarationDto.scope) {
      declaration.scope = updatePatientDeclarationDto.scope;
    }

    if (updatePatientDeclarationDto.declaration_request_id) {
      declaration.declaration_request_id =
        updatePatientDeclarationDto.declaration_request_id;
    }

    if (updatePatientDeclarationDto.person_data) {
      declaration.person_data = updatePatientDeclarationDto.person_data;
    }

    return await this.declarationRepository.save(declaration);
  }

  async remove(id: string): Promise<void> {
    const declaration = await this.findOne(id);
    await this.declarationRepository.remove(declaration);
  }

  async terminate(
    id: string,
    reason: string,
    userId: number,
  ): Promise<Declaration> {
    const declaration = await this.findOne(id);
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    // Only active declarations can be terminated
    if (declaration.status !== DeclarationStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active declarations can be terminated',
      );
    }

    // Check if user is authorized (patient or doctor)
    if (
      declaration.patient_email !== user.email &&
      declaration.doctor_email !== user.email
    ) {
      throw new ForbiddenException(
        'You are not authorized to terminate this declaration',
      );
    }

    declaration.status = DeclarationStatus.TERMINATED;
    declaration.reason = reason;
    declaration.end_date = new Date().toISOString();

    return await this.declarationRepository.save(declaration);
  }

  // Get declarations pending doctor's review
  async findPendingReviewByDoctor(userId: number): Promise<Declaration[]> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    return await this.declarationRepository.find({
      where: {
        doctor_email: user.email,
        status: DeclarationStatus.PENDING_DOCTOR_REVIEW,
      },
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'ASC' },
    });
  }

  // Get declarations pending doctor's signature
  async findPendingSignByDoctor(userId: number): Promise<Declaration[]> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    return await this.declarationRepository.find({
      where: {
        doctor_email: user.email,
        status: DeclarationStatus.PENDING_DOCTOR_SIGN,
      },
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'ASC' },
    });
  }

  async findByPatient(userId: number): Promise<Declaration[]> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    return await this.declarationRepository.find({
      where: { patient_email: user.email },
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'DESC' },
    });
  }

  async findByDoctor(id: number): Promise<Declaration[]> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, role: UserRoleEnum.Hospital, id: id },
    });
    return await this.declarationRepository.find({
      where: { doctor_email: user.email },
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'DESC' },
    });
  }

  async findByUser(id: number): Promise<Declaration[]> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: id },
    });
    return await this.declarationRepository.find({
      where: [{ patient_email: user.email }, { doctor_email: user.email }],
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'DESC' },
    });
  }

  async findByStatus(status: DeclarationStatus): Promise<Declaration[]> {
    return await this.declarationRepository.find({
      where: { status },
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'DESC' },
    });
  }

  async findActiveDeclarations(): Promise<Declaration[]> {
    return await this.declarationRepository.find({
      where: { status: DeclarationStatus.ACTIVE },
      relations: ['patient', 'doctor'],
      order: { inserted_at: 'DESC' },
    });
  }

  async findByDeclarationNumber(
    declarationNumber: string,
  ): Promise<Declaration> {
    const declaration = await this.declarationRepository.findOne({
      where: { declaration_number: declarationNumber },
      relations: ['patient', 'doctor'],
    });

    if (!declaration) {
      throw new NotFoundException(
        `Declaration with number ${declarationNumber} not found`,
      );
    }

    return declaration;
  }

  async getPatientDeclarationsSummary(id: number) {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: id },
    });
    const declarations = await this.findByPatient(user.id);

    return {
      total: declarations.length,
      active: declarations.filter((d) => d.status === DeclarationStatus.ACTIVE)
        .length,
      terminated: declarations.filter(
        (d) => d.status === DeclarationStatus.TERMINATED,
      ).length,
      pending_review: declarations.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_REVIEW,
      ).length,
      pending_sign: declarations.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_SIGN,
      ).length,
      rejected: declarations.filter(
        (d) => d.status === DeclarationStatus.REJECTED,
      ).length,
      declarations: declarations,
    };
  }

  async getDoctorDeclarationsSummary(id: number) {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: id },
    });
    const declarations = await this.findByDoctor(user.id);

    return {
      total: declarations.length,
      active: declarations.filter((d) => d.status === DeclarationStatus.ACTIVE)
        .length,
      terminated: declarations.filter(
        (d) => d.status === DeclarationStatus.TERMINATED,
      ).length,
      pending_review: declarations.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_REVIEW,
      ).length,
      pending_sign: declarations.filter(
        (d) => d.status === DeclarationStatus.PENDING_DOCTOR_SIGN,
      ).length,
      rejected: declarations.filter(
        (d) => d.status === DeclarationStatus.REJECTED,
      ).length,
      declarations: declarations,
    };
  }

  private generateDeclarationNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DCL-${timestamp.slice(-6)}-${random}`;
  }

  // LEGACY: Keep old createByPatient for backward compatibility if needed
  async createByPatientLegacy(
    createDeclarationDto: CreateDeclarationDto,
    patientId: number,
  ): Promise<Declaration> {
    // Validate that patient exists
    const patient = await this.userRepository.findOne({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Validate that doctor exists
    const doctor = await this.userRepository.findOne({
      where: { email: createDeclarationDto.doctor_email },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Generate declaration number
    const declarationNumber = this.generateDeclarationNumber();

    const declaration = this.declarationRepository.create({
      ...createDeclarationDto,
      patient_email: patient.email,
      declaration_number: declarationNumber,
      status: DeclarationStatus.PENDING_DOCTOR_REVIEW,
      signed_at: new Date().toISOString(),
      // Doctor data will be empty until doctor fills it
      doctor_data: null,
    });

    return await this.declarationRepository.save(declaration);
  }

  // LEGACY: Keep old updateByPatient for backward compatibility if needed
  async updateByPatientLegacy(
    id: string,
    updateDeclarationDto: UpdateDeclarationDto,
    userId: number,
  ): Promise<Declaration> {
    const user = await this.userRepository.findOne({
      where: { isActive: true, id: userId },
    });
    const declaration = await this.findOne(id);

    // Check if this patient owns this declaration
    if (declaration.patient_email !== user.email) {
      throw new ForbiddenException('You can only update your own declarations');
    }

    // Check if declaration can be updated
    if (declaration.status !== DeclarationStatus.PENDING_DOCTOR_REVIEW) {
      throw new BadRequestException(
        'Declaration cannot be updated in current status',
      );
    }

    Object.assign(declaration, updateDeclarationDto);

    return await this.declarationRepository.save(declaration);
  }

  async getAvailableDoctors(): Promise<DoctorListDto[]> {
    const DOCTOR_ROLE = 1;
    const MAX_PATIENTS_PER_DOCTOR = 200;

    const doctors = await this.userRepository.find({
      where: {
        role: DOCTOR_ROLE,
        isActive: true,
      },
      relations: ['clinicWork'],
    });

    const doctorsWithSlots = await Promise.all(
      doctors.map(async (doctor) => {
        // Рахуємо активні декларації цього лікаря
        const activeDeclarations = await this.declarationRepository.count({
          where: {
            doctor_email: doctor.email,
            status: DeclarationStatus.ACTIVE,
          },
        });

        // Формуємо повне ім'я
        const name =
          [doctor.lastName, doctor.firstName].filter(Boolean).join(' ') ||
          doctor.email;

        return {
          email: doctor.email,
          name: name,
          specialty: doctor.profession || 'Лікар',
          division: doctor.clinicWork[0]?.clinicName || 'Не вказано',
          available_slots: Math.max(
            0,
            MAX_PATIENTS_PER_DOCTOR - activeDeclarations,
          ),
        };
      }),
    );

    // Сортуємо за доступними місцями (більше місць = вище)
    return doctorsWithSlots.sort(
      (a, b) => b.available_slots - a.available_slots,
    );
  }

  async getDivisions(): Promise<Division[]> {
    return await this.divisionRepository.find({
      where: { status: DivisionStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async getLegalEntities(): Promise<LegalEntity[]> {
    return await this.legalEntityRepository.find({
      order: { name: 'ASC' },
    });
  }
  async generatePdf(declarationId: string): Promise<any> {
    const declaration = await this.declarationRepository.findOne({
      where: { id: declarationId },
      relations: ['patient', 'doctor'],
    });

    if (!declaration) {
      throw new NotFoundException('Декларацію не знайдено');
    }

    const html = this.generateHtmlTemplate(declaration);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();
    return pdf;
  }

  private generateHtmlTemplate(declaration: Declaration): string {
    return `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Декларація про вибір лікаря</title>
        <style>
            body {
                font-family: 'Times New Roman', serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                margin: 0;
                padding: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
            }
            .header h1 {
                font-size: 18px;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
            }
            .declaration-number {
                font-size: 14px;
                margin-top: 10px;
                font-weight: bold;
            }
            .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
            }
            .section-title {
                font-size: 14px;
                font-weight: bold;
                background-color: #f0f0f0;
                padding: 8px;
                border: 1px solid #ccc;
                text-transform: uppercase;
                margin-bottom: 10px;
            }
            .field-row {
                display: flex;
                margin-bottom: 8px;
                border-bottom: 1px dotted #ccc;
                padding-bottom: 5px;
            }
            .field-label {
                font-weight: bold;
                min-width: 180px;
                flex-shrink: 0;
            }
            .field-value {
                flex-grow: 1;
                border-bottom: 1px solid #000;
                min-height: 20px;
                padding-left: 10px;
            }
            .subsection {
                margin-left: 20px;
                margin-bottom: 15px;
            }
            .subsection-title {
                font-weight: bold;
                text-decoration: underline;
                margin-bottom: 8px;
            }
            .array-item {
                margin-bottom: 10px;
                padding: 8px;
                border: 1px solid #ddd;
                background-color: #fafafa;
            }
            .status {
                font-weight: bold;
                text-transform: uppercase;
            }
            .signature-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
            }
            .signature-block {
                width: 45%;
                text-align: center;
                border-top: 1px solid #000;
                padding-top: 10px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
                vertical-align: top;
            }
            th {
                background-color: #f0f0f0;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Декларація про вибір лікаря, який надає первинну медичну допомогу</h1>
            <div class="declaration-number">№ ${declaration.declaration_number || ''}</div>
            <div>Дата створення: ${this.formatDate(declaration.inserted_at)}</div>
        </div>

        <!-- Загальна інформація -->
        <div class="section">
            <div class="section-title">Загальна інформація</div>
            <div class="field-row">
                <span class="field-label">Статус декларації:</span>
                <span class="field-value status">${this.getStatusText(declaration.status)}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Дата початку дії:</span>
                <span class="field-value">${this.formatDate(declaration.start_date)}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Дата закінчення дії:</span>
                <span class="field-value">${this.formatDate(declaration.end_date)}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Дата підписання:</span>
                <span class="field-value">${this.formatDate(declaration.signed_at)}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Причина:</span>
                <span class="field-value">${declaration.reason || ''}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Опис причини:</span>
                <span class="field-value">${declaration.reason_description || ''}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Сфера дії:</span>
                <span class="field-value">${declaration.scope || ''}</span>
            </div>
        </div>

        <!-- Інформація про пацієнта -->
        <div class="section">
            <div class="section-title">Інформація про пацієнта</div>
            ${this.generatePersonDataHtml(declaration.person_data)}
        </div>

        <!-- Інформація про лікаря -->
        <div class="section">
            <div class="section-title">Інформація про лікаря</div>
            <div class="field-row">
                <span class="field-label">Email лікаря:</span>
                <span class="field-value">${declaration.doctor_email || ''}</span>
            </div>
            <div class="field-row">
                <span class="field-label">ПІБ лікаря:</span>
                <span class="field-value">${declaration.doctor ? `${declaration.doctor.firstName} ${declaration.doctor.lastName}` : ''}</span>
            </div>
            ${declaration.doctor_data ? this.generateDoctorDataHtml(declaration.doctor_data) : ''}
        </div>

        <!-- Інформація про співробітника -->
        ${
          declaration.employee_data
            ? `
        <div class="section">
            <div class="section-title">Інформація про співробітника</div>
            ${this.generateEmployeeDataHtml(declaration.employee_data)}
        </div>
        `
            : ''
        }

        <!-- Інформація про підрозділ -->
        ${
          declaration.division_data
            ? `
        <div class="section">
            <div class="section-title">Інформація про підрозділ</div>
            ${this.generateDivisionDataHtml(declaration.division_data)}
        </div>
        `
            : ''
        }

        <!-- Інформація про юридичну особу -->
        ${
          declaration.legal_entity_data
            ? `
        <div class="section">
            <div class="section-title">Інформація про юридичну особу</div>
            ${this.generateLegalEntityDataHtml(declaration.legal_entity_data)}
        </div>
        `
            : ''
        }

        <!-- Екстрена інформація -->
        ${
          declaration.urgent
            ? `
        <div class="section">
            <div class="section-title">Екстрена інформація</div>
            ${this.generateUrgentDataHtml(declaration.urgent)}
        </div>
        `
            : ''
        }

        <div class="signature-section">
            <div class="signature-block">
                <div>Підпис пацієнта</div>
                <div style="margin-top: 20px;">_________________</div>
                <div style="font-size: 10px; margin-top: 5px;">(підпис)</div>
            </div>
            <div class="signature-block">
                <div>Підпис лікаря</div>
                <div style="margin-top: 20px;">_________________</div>
                <div style="font-size: 10px; margin-top: 5px;">(підпис)</div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePersonDataHtml(personData: any): string {
    if (!personData) return '';

    return `
      <div class="field-row">
        <span class="field-label">Ім'я:</span>
        <span class="field-value">${personData.first_name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Прізвище:</span>
        <span class="field-value">${personData.last_name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">По батькові:</span>
        <span class="field-value">${personData.second_name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Дата народження:</span>
        <span class="field-value">${this.formatDate(personData.birth_date)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Стать:</span>
        <span class="field-value">${this.getGenderText(personData.gender)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Податковий номер:</span>
        <span class="field-value">${personData.tax_id || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Місце народження:</span>
        <span class="field-value">${personData.birth_settlement || ''}, ${personData.birth_country || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Статус верифікації:</span>
        <span class="field-value">${this.getVerificationStatusText(personData.verification_status)}</span>
      </div>

      ${
        personData.phones && personData.phones.length > 0
          ? `
      <div class="subsection">
        <div class="subsection-title">Телефони:</div>
        <table>
          <thead>
            <tr><th>Тип</th><th>Номер</th></tr>
          </thead>
          <tbody>
            ${personData.phones
              .map(
                (phone) => `
              <tr>
                <td>${this.getPhoneTypeText(phone.type)}</td>
                <td>${phone.number || ''}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      ${
        personData.emergency_contact
          ? `
      <div class="subsection">
        <div class="subsection-title">Контакт для екстрених випадків:</div>
        <div class="field-row">
          <span class="field-label">ПІБ:</span>
          <span class="field-value">${personData.emergency_contact.first_name || ''} ${personData.emergency_contact.last_name || ''} ${personData.emergency_contact.second_name || ''}</span>
        </div>
        ${
          personData.emergency_contact.phones &&
          personData.emergency_contact.phones.length > 0
            ? `
        <table>
          <thead>
            <tr><th>Тип</th><th>Номер</th></tr>
          </thead>
          <tbody>
            ${personData.emergency_contact.phones
              .map(
                (phone) => `
              <tr>
                <td>${phone.type || ''}</td>
                <td>${phone.number || ''}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        `
            : ''
        }
      </div>
      `
          : ''
      }

      ${
        personData.addresses && personData.addresses.length > 0
          ? `
      <div class="subsection">
        <div class="subsection-title">Адреси:</div>
        ${personData.addresses
          .map(
            (address, index) => `
          <div class="array-item">
            <strong>Адреса ${index + 1}:</strong><br>
            Країна: ${address.country || ''}<br>
            Область: ${address.area || ''}<br>
            Район: ${address.region || ''}<br>
            Населений пункт: ${address.settlement_type || ''} ${address.settlement || ''}<br>
            Вулиця: ${address.street_type || ''} ${address.street || ''}<br>
            Будинок: ${address.building || ''}<br>
            Квартира: ${address.apartment || ''}<br>
            Індекс: ${address.zip || ''}
          </div>
        `,
          )
          .join('')}
      </div>
      `
          : ''
      }

      ${
        personData.documents && personData.documents.length > 0
          ? `
      <div class="subsection">
        <div class="subsection-title">Документи:</div>
        ${personData.documents
          .map(
            (doc, index) => `
          <div class="array-item">
            <strong>Документ ${index + 1}:</strong><br>
            Тип: ${this.getDocumentTypeText(doc.type)}<br>
            Номер: ${doc.number || ''}<br>
            Виданий: ${doc.issued_by || ''}<br>
            Дата видачі: ${this.formatDate(doc.issued_at)}<br>
            Дата закінчення: ${this.formatDate(doc.expiration_date)}
          </div>
        `,
          )
          .join('')}
      </div>
      `
          : ''
      }
    `;
  }

  private generateDoctorDataHtml(doctorData: any): string {
    if (!doctorData) return '';

    let html = '';

    if (doctorData.educations && doctorData.educations.length > 0) {
      html += `
      <div class="subsection">
        <div class="subsection-title">Освіта:</div>
        ${doctorData.educations
          .map(
            (education, index) => `
          <div class="array-item">
            <strong>Освіта ${index + 1}:</strong><br>
            Країна: ${education.country || ''}<br>
            Місто: ${education.city || ''}<br>
            Навчальний заклад: ${education.institution_name || ''}<br>
            Дата видачі: ${this.formatDate(education.issued_date)}<br>
            Номер диплома: ${education.diploma_number || ''}<br>
            Ступінь: ${education.degree || ''}<br>
            Спеціальність: ${education.speciality || ''}
          </div>
        `,
          )
          .join('')}
      </div>
      `;
    }

    if (doctorData.qualifications && doctorData.qualifications.length > 0) {
      html += `
      <div class="subsection">
        <div class="subsection-title">Кваліфікації:</div>
        ${doctorData.qualifications
          .map(
            (qual, index) => `
          <div class="array-item">
            <strong>Кваліфікація ${index + 1}:</strong><br>
            Тип: ${qual.type || ''}<br>
            Навчальний заклад: ${qual.institution_name || ''}<br>
            Спеціальність: ${qual.speciality || ''}<br>
            Дата видачі: ${this.formatDate(qual.issued_date)}<br>
            Номер сертифікату: ${qual.certificate_number || ''}<br>
            Дійсний до: ${this.formatDate(qual.valid_to)}<br>
            Додаткова інформація: ${qual.additional_info || ''}
          </div>
        `,
          )
          .join('')}
      </div>
      `;
    }

    if (doctorData.specialities && doctorData.specialities.length > 0) {
      html += `
      <div class="subsection">
        <div class="subsection-title">Спеціалізації:</div>
        ${doctorData.specialities
          .map(
            (spec, index) => `
          <div class="array-item">
            <strong>Спеціалізація ${index + 1}:</strong><br>
            Спеціальність: ${spec.speciality || ''}<br>
            За посадою: ${spec.speciality_officio ? 'Так' : 'Ні'}<br>
            Рівень: ${spec.level || ''}<br>
            Тип кваліфікації: ${spec.qualification_type || ''}<br>
            Назва атестації: ${spec.attestation_name || ''}<br>
            Дата атестації: ${this.formatDate(spec.attestation_date)}<br>
            Дійсний до: ${this.formatDate(spec.valid_to_date)}<br>
            Номер сертифікату: ${spec.certificate_number || ''}
          </div>
        `,
          )
          .join('')}
      </div>
      `;
    }

    if (doctorData.science_degree) {
      html += `
      <div class="subsection">
        <div class="subsection-title">Науковий ступінь:</div>
        <div class="array-item">
          Країна: ${doctorData.science_degree.country || ''}<br>
          Місто: ${doctorData.science_degree.city || ''}<br>
          Ступінь: ${doctorData.science_degree.degree || ''}<br>
          Навчальний заклад: ${doctorData.science_degree.institution_name || ''}<br>
          Номер диплома: ${doctorData.science_degree.diploma_number || ''}<br>
          Спеціальність: ${doctorData.science_degree.speciality || ''}<br>
          Дата видачі: ${this.formatDate(doctorData.science_degree.issued_date)}
        </div>
      </div>
      `;
    }

    return html;
  }

  private generateEmployeeDataHtml(employeeData: any): string {
    if (!employeeData) return '';

    return `
      <div class="field-row">
        <span class="field-label">Посада:</span>
        <span class="field-value">${employeeData.position || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Тип співробітника:</span>
        <span class="field-value">${this.getEmployeeTypeText(employeeData.employee_type)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Статус:</span>
        <span class="field-value">${this.getEmployeeStatusText(employeeData.status)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Дата початку роботи:</span>
        <span class="field-value">${this.formatDate(employeeData.start_date)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Дата закінчення роботи:</span>
        <span class="field-value">${this.formatDate(employeeData.end_date)}</span>
      </div>
      ${
        employeeData.party
          ? `
      <div class="subsection">
        <div class="subsection-title">Інформація про сторону:</div>
        <div class="field-row">
          <span class="field-label">ID:</span>
          <span class="field-value">${employeeData.party.id || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">ПІБ:</span>
          <span class="field-value">${employeeData.party.first_name || ''} ${employeeData.party.last_name || ''} ${employeeData.party.second_name || ''}</span>
        </div>
      </div>
      `
          : ''
      }
    `;
  }

  private generateDivisionDataHtml(divisionData: any): string {
    if (!divisionData) return '';

    return `
      <div class="field-row">
        <span class="field-label">Назва:</span>
        <span class="field-value">${divisionData.name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Тип:</span>
        <span class="field-value">${this.getDivisionTypeText(divisionData.type)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Статус:</span>
        <span class="field-value">${this.getDivisionStatusText(divisionData.status)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Гірський підрозділ:</span>
        <span class="field-value">${divisionData.mountain_group ? 'Так' : 'Ні'}</span>
      </div>
      <div class="field-row">
        <span class="field-label">DLS ID:</span>
        <span class="field-value">${divisionData.dls_id || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">DLS верифіковано:</span>
        <span class="field-value">${divisionData.dls_verified ? 'Так' : 'Ні'}</span>
      </div>
    `;
  }

  private generateLegalEntityDataHtml(legalEntityData: any): string {
    if (!legalEntityData) return '';

    let html = `
      <div class="field-row">
        <span class="field-label">Повна назва:</span>
        <span class="field-value">${legalEntityData.name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Скорочена назва:</span>
        <span class="field-value">${legalEntityData.short_name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Правова форма:</span>
        <span class="field-value">${legalEntityData.legal_form || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Публічна назва:</span>
        <span class="field-value">${legalEntityData.public_name || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">ЄДРПОУ:</span>
        <span class="field-value">${legalEntityData.edrpou || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Статус:</span>
        <span class="field-value">${legalEntityData.status || ''}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Email:</span>
        <span class="field-value">${legalEntityData.email || ''}</span>
      </div>
    `;

    if (legalEntityData.phones && legalEntityData.phones.length > 0) {
      html += `
      <div class="subsection">
        <div class="subsection-title">Телефони:</div>
        <table>
          <thead>
            <tr><th>Тип</th><th>Номер</th></tr>
          </thead>
          <tbody>
            ${legalEntityData.phones
              .map(
                (phone) => `
              <tr>
                <td>${this.getPhoneTypeText(phone.type)}</td>
                <td>${phone.number || ''}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `;
    }

    if (legalEntityData.addresses && legalEntityData.addresses.length > 0) {
      html += `
      <div class="subsection">
        <div class="subsection-title">Адреси:</div>
        ${legalEntityData.addresses
          .map(
            (address, index) => `
          <div class="array-item">
            <strong>Адреса ${index + 1}:</strong><br>
            Країна: ${address.country || ''}<br>
            Область: ${address.area || ''}<br>
            Район: ${address.region || ''}<br>
            Населений пункт: ${address.settlement_type || ''} ${address.settlement || ''}<br>
            Вулиця: ${address.street_type || ''} ${address.street || ''}<br>
            Будинок: ${address.building || ''}<br>
            Квартира: ${address.apartment || ''}<br>
            Індекс: ${address.zip || ''}
          </div>
        `,
          )
          .join('')}
      </div>
      `;
    }

    return html;
  }

  private generateUrgentDataHtml(urgentData: any): string {
    if (!urgentData) return '';

    return `
      ${
        urgentData.authentication_method_current
          ? `
      <div class="subsection">
        <div class="subsection-title">Поточний метод автентифікації:</div>
        <div class="field-row">
          <span class="field-label">Тип:</span>
          <span class="field-value">${urgentData.authentication_method_current.type || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Номер:</span>
          <span class="field-value">${urgentData.authentication_method_current.number || ''}</span>
        </div>
      </div>
      `
          : ''
      }
    `;
  }

  private formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('uk-UA');
    } catch {
      return '';
    }
  }

  private getStatusText(status: DeclarationStatus): string {
    const statusMap = {
      [DeclarationStatus.ACTIVE]: 'Активна',
      [DeclarationStatus.PENDING_DOCTOR_SIGN]: 'Очікує підпису лікаря',
      [DeclarationStatus.REJECTED]: 'Відхилена',
      [DeclarationStatus.TERMINATED]: 'Відмінена',
      [DeclarationStatus.PENDING_DOCTOR_REVIEW]: 'Очікує перегляду лікаря',
    };
    return statusMap[status] || status;
  }

  private getGenderText(gender: Gender): string {
    const genderMap = {
      [Gender.MALE]: 'Чоловік',
      [Gender.FEMALE]: 'Жінка',
    };
    return genderMap[gender] || gender;
  }

  private getVerificationStatusText(status: VerificationStatus): string {
    const statusMap = {
      [VerificationStatus.VERIFIED]: 'Верифіковано',
      [VerificationStatus.NOT_VERIFIED]: 'Не верифіковано',
    };
    return statusMap[status] || status;
  }

  private getPhoneTypeText(type: PhoneType): string {
    const typeMap = {
      [PhoneType.MOBILE]: 'Мобільний',
      [PhoneType.LANDLINE]: 'Стаціонарний',
    };
    return typeMap[type] || type;
  }

  private getDocumentTypeText(type: DocumentTypes): string {
    const typeMap = {
      [DocumentTypes.PASSPORT]: 'Паспорт',
      [DocumentTypes.NATIONAL_ID]: 'ID-картка',
      [DocumentTypes.BIRTH_CERTIFICATE]: 'Свідоцтво про народження',
    };
    return typeMap[type] || type;
  }

  private getEmployeeTypeText(type: EmployeeType): string {
    const typeMap = {
      [EmployeeType.DOCTOR]: 'Лікар',
      [EmployeeType.PHARMACIST]: 'Фармацевт',
      [EmployeeType.NURSE]: 'Медсестра',
      [EmployeeType.ADMIN]: 'Адміністратор',
    };
    return typeMap[type] || type;
  }

  private getEmployeeStatusText(status: EmployeeStatus): string {
    const statusMap = {
      [EmployeeStatus.ACTIVE]: 'Новий',
      [EmployeeStatus.INACTIVE]: 'Неактивний',
      [EmployeeStatus.SUSPENDED]: 'Звільнений',
    };
    return statusMap[status] || status;
  }

  private getDivisionTypeText(type: DivisionType): string {
    const typeMap = {
      [DivisionType.CLINIC]: 'Клініка',
      [DivisionType.AMBULATORY]: 'Амбулаторія',
      [DivisionType.PHARMACY]: 'ФАП',
      [DivisionType.HOSPITAL]: 'Госпіталь',
    };
    return typeMap[type] || type;
  }

  private getDivisionStatusText(status: DivisionStatus): string {
    const statusMap = {
      [DivisionStatus.ACTIVE]: 'Активний',
      [DivisionStatus.INACTIVE]: 'Неактивний',
    };
    return statusMap[status] || status;
  }
}
