// export.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, EntityMetadata, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { ExportToExcelConfigDto } from './exportToExcel.controller';
import { InjectRepository } from '@nestjs/typeorm';
import { Clinic } from '../clinic/clinic.entity';
import { User } from '../user/user.entity';
import { CreateDivisionDto } from '../division/division.dto';
import { Division } from '../division/division.entity';
import { LegalEntity } from '../legalEntity/lagalEntity.entity';
import { CreateLegalEntityDto } from '../legalEntity/legalEntity.dto';

@Injectable()
export class ExportToExcelService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Division)
    private divisionRepository: Repository<Division>,
    @InjectRepository(LegalEntity)
    private legalEntityRepository: Repository<LegalEntity>,
  ) {}

  async parseCsvFile(csvBuffer: Buffer): Promise<any[]> {
    const csvString = csvBuffer.toString('utf-8');

    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`));
          } else {
            resolve(result.data);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  async validateTableFields(
    tableName: string,
    fields: ExportToExcelConfigDto['fields'],
    csvData: any[],
  ): Promise<void> {
    if (csvData.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    if (!fields || fields.length === 0) {
      throw new BadRequestException('Fields configuration is required');
    }

    // Отримуємо доступні поля з CSV файлу
    const csvFields = Object.keys(csvData[0]);

    // Перевіряємо кожне поле
    for (const field of fields) {
      if (!field.fieldPaths || typeof field.fieldPaths !== 'string') {
        throw new BadRequestException(
          'Each field must have fieldPaths as string',
        );
      }

      const fieldPaths = field.fieldPaths.split(',').map((f) => f.trim());

      for (const fieldPath of fieldPaths) {
        // Для простих полів перевіряємо чи існують в CSV
        const pathParts = fieldPath.split('.');
        const rootField = pathParts[0];

        if (!csvFields.includes(rootField)) {
          throw new BadRequestException(
            `Field '${rootField}' not found in CSV. Available fields: ${csvFields.join(', ')}`,
          );
        }
      }
    }
  }

  private async validateFieldPath(
    metadata: EntityMetadata,
    fieldPath: string,
    tableName: string,
  ): Promise<void> {
    const pathParts = fieldPath.split('.');
    let currentMetadata = metadata;

    for (let i = 0; i < pathParts.length; i++) {
      const fieldName = pathParts[i];

      // Перевіряємо чи існує поле в поточній метадаті
      const column = currentMetadata.columns.find(
        (col) => col.propertyName === fieldName,
      );
      const relation = currentMetadata.relations.find(
        (rel) => rel.propertyName === fieldName,
      );

      if (!column && !relation) {
        throw new BadRequestException(
          `Field '${fieldName}' not found in table '${currentMetadata.tableName}'. Full path: '${fieldPath}'`,
        );
      }

      // Якщо це не останній елемент шляху і це relation
      if (i < pathParts.length - 1) {
        if (!relation) {
          throw new BadRequestException(
            `Field '${fieldName}' is not a relation in table '${currentMetadata.tableName}'. Cannot access nested field '${pathParts[i + 1]}'`,
          );
        }

        // Переходимо до метадати зв'язаної таблиці
        currentMetadata = relation.inverseEntityMetadata;
      }
    }
  }

  async createExcelFromCsv(
    csvData: any[],
    tableName: string,
    fields: ExportToExcelConfigDto['fields'],
  ): Promise<Buffer> {
    if (csvData.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Створюємо робочу книгу Excel
    const workbook = XLSX.utils.book_new();

    // Підготовляємо дані для Excel з CSV даних
    const excelData = this.prepareExcelDataFromCsv(csvData, fields);

    // Створюємо аркуш
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Додаємо аркуш до книги
    XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

    // Конвертуємо в buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
  }

  private async getDataFromDatabase(
    tableName: string,
    fields: ExportToExcelConfigDto['fields'],
  ): Promise<any[]> {
    // Отримуємо метадату таблиці (аналогічно до validateTableFields)
    let repository;
    let entityClass;

    try {
      repository = this.dataSource.getRepository(tableName);
      entityClass = tableName;
    } catch (error) {
      // Шукаємо по назві таблиці
      const allMetadata = this.dataSource.entityMetadatas;
      const metadata = allMetadata.find((meta) => meta.tableName === tableName);

      if (!metadata) {
        throw new BadRequestException(`Table '${tableName}' not found`);
      }

      repository = this.dataSource.getRepository(metadata.target);
      entityClass = metadata.targetName;
    }

    // Визначаємо які relations потрібно завантажити
    const relations = this.extractRelations(fields);

    // Отримуємо всі записи з потрібними relations
    const queryBuilder = repository.createQueryBuilder(
      entityClass.toLowerCase(),
    );

    // Додаємо joins для вкладених полів
    relations.forEach((relation) => {
      queryBuilder.leftJoinAndSelect(
        `${entityClass.toLowerCase()}.${relation}`,
        relation,
      );
    });

    return await queryBuilder.getMany();
  }

  private extractRelations(fields: ExportToExcelConfigDto['fields']): string[] {
    const relations = new Set<string>();

    fields.forEach((field) => {
      const fieldPaths = field.fieldPaths.split(',').map((f) => f.trim());

      fieldPaths.forEach((fieldPath) => {
        const pathParts = fieldPath.split('.');
        if (pathParts.length > 1) {
          relations.add(pathParts[0]); // Додаємо тільки перший рівень relation
        }
      });
    });

    return Array.from(relations);
  }

  private prepareExcelDataFromCsv(
    csvData: any[],
    fields: ExportToExcelConfigDto['fields'],
  ): any[] {
    return csvData.map((record) => {
      const row: any = {};

      fields.forEach((field) => {
        const fieldPaths = field.fieldPaths.split(',').map((f) => f.trim());
        const values: string[] = [];

        fieldPaths.forEach((fieldPath) => {
          const value = this.getNestedValue(record, fieldPath);
          if (value !== null && value !== undefined) {
            values.push(String(value));
          }
        });

        row[field.columnName] = values.join(' ');
      });

      return row;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  async getAvailableCsvFields(csvData: any[]): Promise<string[]> {
    if (csvData.length === 0) {
      return [];
    }
    return Object.keys(csvData[0]);
  }
  private async importUsers(worksheet: XLSX.WorkSheet) {
    const users = XLSX.utils.sheet_to_json(worksheet) as any[];

    for (const userData of users) {
      const user = this.userRepository.create({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        bio: userData.bio,
        address: userData.address,
        region: userData.region,
        role: userData.role,
        profession: userData.profession,
        password: userData.password ?? 'testPassword',
        isActive: true,
        // НЕ додаємо релейшини тут!
      });

      await this.userRepository.save(user);
    }
  }
  private async importClinics(worksheet: XLSX.WorkSheet) {
    const clinics = XLSX.utils.sheet_to_json(worksheet) as any[];

    for (const clinicData of clinics) {
      // Знаходимо createdBy користувача за email або ID
      let createdByUser = null;
      if (clinicData.createdBy) {
        createdByUser = await this.userRepository.findOne({
          where: { email: clinicData.createdBy },
        });
      }

      const clinic = this.clinicRepository.create({
        clinicName: clinicData.clinicName,
        clinicAddress: clinicData.clinicAddress,
        clinicBio: clinicData.clinicBio,
        isActive: true,
        createdBy: createdByUser,
      });

      await this.clinicRepository.save(clinic);
    }
  }
  private async importUserClinicRelations(worksheet: XLSX.WorkSheet) {
    const relations = XLSX.utils.sheet_to_json(worksheet) as any[];

    for (const relation of relations) {
      const user = await this.userRepository.findOne({
        where: { email: relation.userEmail },
      });

      const clinic = await this.clinicRepository.findOne({
        where: { clinicName: relation.clinicName },
      });

      if (user && clinic) {
        switch (relation.relationType) {
          case 'admin':
            // Перевіряємо чи зв'язок вже існує
            const existingAdminRelation = await this.dataSource.query(
              `SELECT 1 FROM clinic_clinic_admins_user
           WHERE "user_email" = $1 AND "clinic_name" = $2`,
              [user.email, clinic.clinicName],
            );

            if (existingAdminRelation.length === 0) {
              await this.dataSource.query(
                `INSERT INTO clinic_clinic_admins_user ("user_email", "clinic_name") 
             VALUES ($1, $2)`,
                [user.email, clinic.clinicName],
              );
            }
            break;

          case 'worker':
            const existingWorkerRelation = await this.dataSource.query(
              `SELECT 1 FROM clinic_clinic_workers_user 
           WHERE "user_email" = $1 AND "clinic_name" = $2`,
              [user.email, clinic.clinicName],
            );

            if (existingWorkerRelation.length === 0) {
              await this.dataSource.query(
                `INSERT INTO clinic_clinic_workers_user ("user_email", "clinic_name") 
             VALUES ($1, $2)`,
                [user.email, clinic.clinicName],
              );
            }
            break;

          case 'invite':
            const existingInviteRelation = await this.dataSource.query(
              `SELECT 1 FROM clinic_invites_user
           WHERE "user_email" = $1 AND "clinic_name" = $2`,
              [user.email, clinic.clinicName],
            );

            if (existingInviteRelation.length === 0) {
              await this.dataSource.query(
                `INSERT INTO clinic_invites_user ("user_email", "clinic_name") 
             VALUES ($1, $2)`,
                [user.email, clinic.clinicName],
              );
            }
            break;
        }
      }
    }
  }
  private async importUserConnections(worksheet: XLSX.WorkSheet) {
    const connections = XLSX.utils.sheet_to_json(worksheet) as any[];

    // Формат CSV для user connections:
    // userEmail1, userEmail2
    // john@test.com, jane@test.com
    for (const connection of connections) {
      const user1 = await this.userRepository.findOne({
        where: { email: connection.userEmail1 },
        relations: ['connections'],
      });

      const user2 = await this.userRepository.findOne({
        where: { email: connection.userEmail2 },
      });
      if (user1 && user2) {
        if (!user1.connections) user1.connections = [];
        user1.connections.push(user2);
        await this.userRepository.save(user1);
      }
    }
  }
  private async createRelation(
    user: User,
    clinic: Clinic,
    relationType: string,
  ) {
    switch (relationType) {
      case 'admin':
        if (!user.clinic) user.clinic = [];
        if (!clinic.clinicAdmins) clinic.clinicAdmins = [];

        // Перевіряємо чи вже існує зв'язок
        const existsAdmin = user.clinic.some((c) => c.id === clinic.id);
        if (!existsAdmin) {
          user.clinic.push(clinic);
          clinic.clinicAdmins.push(user);
          await this.userRepository.save(user);
          await this.clinicRepository.save(clinic);
        }
        break;

      case 'worker':
        if (!user.clinicWork) user.clinicWork = null;
        if (!clinic.clinicWorkers) clinic.clinicWorkers = [];

        const existsWorker = user.clinicWork.some((clinicWork) => clinicWork.id === clinic.id);
        if (!existsWorker) {
          user.clinicWork.push(clinic);
          clinic.clinicWorkers.push(user);
          await this.userRepository.save(user);
          await this.clinicRepository.save(clinic);
        }
        break;

      case 'invite':
        if (!clinic.invites) clinic.invites = [];

        const existsInvite = clinic.invites.some((c) => c.id === clinic.id);
        if (!existsInvite) {
          clinic.invites.push(user);
          await this.userRepository.save(user);
          await this.clinicRepository.save(clinic);
        }
        break;
    }
  }

  async importFromExcelWithDenormalizedData(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    const usersMap = new Map<string, User>();
    const clinicsMap = new Map<string, Clinic>();

    // 1. Створюємо всі унікальні користувачі та клініки
    for (const row of data) {
      // Створюємо користувача якщо ще не існує
      if (!usersMap.has(row.email)) {
        let user = await this.userRepository.findOne({
          where: { email: row.email },
          relations: ['clinic', 'clinicWork'],
        });

        if (!user) {
          user = this.userRepository.create({
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            role: row.role,
            password: row.password,
            bio: row.bio,
            address: row.address,
            region: row.region,
          });
          user = await this.userRepository.save(user);
        }

        usersMap.set(row.email, user);
      }

      // Створюємо клініку якщо ще не існує
      if (row.clinicName && !clinicsMap.has(row.clinicName)) {
        let clinic = await this.clinicRepository.findOne({
          where: { clinicName: row.clinicName },
          relations: ['clinicAdmins', 'clinicWorkers', 'invites'],
        });

        if (!clinic) {
          clinic = this.clinicRepository.create({
            clinicName: row.clinicName,
            clinicAddress: row.clinicAddress,
            clinicBio: row.clinicBio,
          });
          clinic = await this.clinicRepository.save(clinic);
        }

        clinicsMap.set(row.clinicName, clinic);
      }
    }

    // 2. Створюємо релейшини
    for (const row of data) {
      if (!row.clinicName || !row.relationType) continue;

      const user = usersMap.get(row.email);
      const clinic = clinicsMap.get(row.clinicName);

      if (user && clinic) {
        await this.createRelation(user, clinic, row.relationType);
      }
    }
  }
  private async importDivision(worksheet: XLSX.WorkSheet) {
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];
    const divisions: Division[] = [];

    for (const row of data) {
      try {
        const createDto: CreateDivisionDto = {
          name: row.name || row['Name'] || row['Назва'],
          type: row.type || row['Type'] || row['Тип'],
          status: row.status || row['Status'] || row['Статус'],
          mountain_group:
            row.mountain_group ||
            row['Mountain Group'] ||
            row['Гірська група'] ||
            false,
          dls_id: row.dls_id || row['DLS ID'] || row['ДЛС ID'],
          dls_verified:
            row.dls_verified ||
            row['DLS Verified'] ||
            row['ДЛС Верифіковано'] ||
            false,
        };

        const division = this.divisionRepository.create(createDto);
        divisions.push(division);
      } catch (error) {
        console.error(`Error importing division: ${error.message}`, row);
      }
    }

    return divisions;
  }
  private async importLegalEntity(worksheet: XLSX.WorkSheet) {
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];
    const legalEntities: LegalEntity[] = [];

    for (const row of data) {
      try {
        const createDto: CreateLegalEntityDto = {
          name: row.name || row['Name'] || row['Назва'],
          short_name:
            row.short_name || row['Short Name'] || row['Коротка назва'],
          legal_form:
            row.legal_form || row['Legal Form'] || row['Правова форма'],
          public_name:
            row.public_name || row['Public Name'] || row['Публічна назва'],
          edrpou: row.edrpou || row['EDRPOU'] || row['ЄДРПОУ'],
          status: row.status || row['Status'] || row['Статус'],
          email: row.email || row['Email'] || row['Електронна пошта'],
          phones: this.parsePhones(
            row.phones || row['Phones'] || row['Телефони'] || [],
          ),
          addresses: this.parseAddresses(
            row.addresses || row['Addresses'] || row['Адреси'] || [],
          ),
        };

        const legalEntity = this.legalEntityRepository.create(createDto);
        legalEntities.push(legalEntity);
      } catch (error) {
        console.error(`Error importing legal entity: ${error.message}`, row);
      }
    }

    return legalEntities;
  }

  private parsePhones(phonesData: any): any[] {
    if (typeof phonesData === 'string') {
      try {
        return JSON.parse(phonesData);
      } catch {
        return [];
      }
    }
    return Array.isArray(phonesData) ? phonesData : [];
  }

  private parseAddresses(addressesData: any): any[] {
    if (typeof addressesData === 'string') {
      try {
        return JSON.parse(addressesData);
      } catch {
        return [];
      }
    }
    return Array.isArray(addressesData) ? addressesData : [];
  }
  async importFromExcel(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer);

    if (workbook.SheetNames.includes('users')) {
      await this.importUsers(workbook.Sheets['users']);
    }

    if (workbook.SheetNames.includes('clinics')) {
      await this.importClinics(workbook.Sheets['clinics']);
    }

    if (workbook.SheetNames.includes('user_clinic_relations')) {
      await this.importUserClinicRelations(
        workbook.Sheets['user_clinic_relations'],
      );
    }

    if (workbook.SheetNames.includes('user_connections')) {
      await this.importUserConnections(workbook.Sheets['user_connections']);
    }
    if (workbook.SheetNames.includes('division')) {
      await this.importDivision(workbook.Sheets['division']);
    }
    if (workbook.SheetNames.includes('legalEntity')) {
      await this.importLegalEntity(workbook.Sheets['legalEntity']);
    }
  }
  async importFromExcelByService(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer);
    const data = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
    ) as any[];

    for (const row of data) {
      const user = this.userRepository.create({
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        role: row.role,
        password: row.password,
        bio: row.bio,
        address: row.address,
        region: row.region,
      });

      // Релейшини через ID (розділені комами)
      if (row.administeredClinicIds) {
        const clinicIds = row.administeredClinicIds
          .split(',')
          .map((id) => parseInt(id.trim()));
        user.clinic = await this.clinicRepository.findByIds(clinicIds);
      }

      if (row.workClinicIds) {
        const clinicIds = row.workClinicIds
          .split(',')
          .map((id) => parseInt(id.trim()));
        user.clinicWork = await this.clinicRepository.findByIds(clinicIds);
      }

      if (row.connectionIds) {
        const userIds = row.connectionIds
          .split(',')
          .map((id) => parseInt(id.trim()));
        user.connections = await this.userRepository.findByIds(userIds);
      }

      await this.userRepository.save(user);
    }
  }
}
