import { DataSource } from 'typeorm';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';
import { Declaration } from '../declaration/declaration.entity';
import {
  Notification,
  NotificationType,
} from '../notification/notification.entity';
import {
  DeclarationStatus,
  Gender,
  PhoneType,
  VerificationStatus,
  DocumentTypes,
} from '../declaration/declaration.enum';

export class AnalyticsDataSeeder {
  constructor(private dataSource: DataSource) {}
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomDate(start: Date, end: Date): Date {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private hoursAgo(hours: number): Date {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date;
  }

  private randomElement<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  // ==================================================================================
  // 0. ОЧИЩЕННЯ ІСНУЮЧИХ ТЕСТОВИХ ДАНИХ
  // ==================================================================================

  async cleanTestData(): Promise<void> {
    console.log('🗑️  Видаляю старі тестові дані...');

    try {
      // 1. Видаляємо декларації (за email тестових користувачів)
      const declarationsResult = await this.dataSource.query(`
        DELETE FROM declarations
        WHERE doctor_email LIKE '%@clinic.test'
        OR patient_email LIKE '%@test.com'
      `);
      console.log(`  ✓ Видалено ${declarationsResult[1] || 0} декларацій`);

      // 2. Видаляємо нотифікації
      const notificationsResult = await this.dataSource.query(`
        DELETE FROM notification
        WHERE "senderId" IN (
          SELECT id FROM "user"
          WHERE email LIKE '%@clinic.test' OR email LIKE '%@test.com'
        )
        OR "recipientId" IN (
          SELECT id FROM "user"
          WHERE email LIKE '%@clinic.test' OR email LIKE '%@test.com'
        )
      `);
      console.log(`  ✓ Видалено ${notificationsResult[1] || 0} нотифікацій`);

      // 3. Видаляємо analytics_event
      const analyticsEventsResult = await this.dataSource.query(`
        DELETE FROM analytics_event
        WHERE "userId" IN (
          SELECT id FROM "user"
          WHERE email LIKE '%@clinic.test' OR email LIKE '%@test.com'
        )
      `);
      console.log(
        `  ✓ Видалено ${analyticsEventsResult[1] || 0} analytics events`,
      );

      // 4. Видаляємо зв'язки користувачів (user_connections_user)
      const userConnectionsResult = await this.dataSource.query(`
        DELETE FROM user_connections_user
        WHERE user_email LIKE '%@clinic.test' OR user_email LIKE '%@test.com'
        OR connection_email LIKE '%@clinic.test' OR connection_email LIKE '%@test.com'
      `);
      console.log(
        `  ✓ Видалено ${userConnectionsResult[1] || 0} зв'язків користувачів`,
      );

      // 5. Видаляємо зв'язки клініки з користувачами (many-to-many таблиці)
      // Видаляємо зв'язки з many-to-many таблиць для тестових користувачів і тестової клініки
      await this.dataSource.query(`
        DELETE FROM clinic_clinic_admins_user
        WHERE user_email LIKE '%@clinic.test' OR user_email LIKE '%@test.com'
        OR clinic_name = 'Тестова Клініка Аналітики'
      `);
      await this.dataSource.query(`
        DELETE FROM clinic_clinic_workers_user
        WHERE user_email LIKE '%@clinic.test' OR user_email LIKE '%@test.com'
        OR clinic_name = 'Тестова Клініка Аналітики'
      `);
      await this.dataSource.query(`
        DELETE FROM clinic_invites_user
        WHERE user_email LIKE '%@clinic.test' OR user_email LIKE '%@test.com'
        OR clinic_name = 'Тестова Клініка Аналітики'
      `);

      // Встановлюємо createdBy в NULL для ВСІХ клінік, що посилаються на тестових користувачів
      const updateResult = await this.dataSource.query(`
        UPDATE clinic SET "createdById" = NULL
        WHERE "createdById" IN (
          SELECT id FROM "user"
          WHERE email LIKE '%@clinic.test' OR email LIKE '%@test.com'
        )
      `);
      console.log(
        `  ✓ Оновлено ${updateResult[1] || 0} клінік (createdById = NULL)`,
      );

      // Видаляємо тестову клініку
      const deleteClinicResult = await this.dataSource.query(`
        DELETE FROM clinic WHERE "clinicName" = 'Тестова Клініка Аналітики'
      `);
      console.log(`  ✓ Видалено ${deleteClinicResult[1] || 0} тестову клініку`);

      // 5. Видаляємо користувачів
      const usersResult = await this.dataSource.query(`
        DELETE FROM "user"
        WHERE email LIKE '%@clinic.test' OR email LIKE '%@test.com'
      `);
      console.log(`  ✓ Видалено ${usersResult[1] || 0} користувачів`);

      console.log('✅ Очищення завершено\n');
    } catch (error) {
      console.log('⚠️  Помилка при очищенні:', error.message);
      console.log(
        '   ВАЖЛИВО: Будь ласка, видаліть тестові дані вручну перед повторним запуском.',
      );
      console.log('   SQL для очищення:');
      console.log(
        `   DELETE FROM declarations WHERE doctor_email LIKE '%@clinic.test' OR patient_email LIKE '%@test.com';`,
      );
      console.log(
        `   UPDATE clinic SET "createdById" = NULL WHERE "clinicName" = 'Тестова Клініка Аналітики';`,
      );
      console.log(
        `   DELETE FROM clinic WHERE "clinicName" = 'Тестова Клініка Аналітики';`,
      );
      console.log(
        `   DELETE FROM "user" WHERE email LIKE '%@clinic.test' OR email LIKE '%@test.com';\n`,
      );
      throw new Error(
        'Не вдалося очистити старі дані. Виконайте SQL команди вище вручну.',
      );
    }
  }

  // ==================================================================================
  // 1. СТВОРЕННЯ КЛІНІКИ ТА АДМІНА
  // ==================================================================================

  async createClinicAndAdmin(): Promise<{ clinic: Clinic; admin: User }> {
    console.log('🏥 Створюю клініку та адміна...');

    const userRepo = this.dataSource.getRepository(User);
    const clinicRepo = this.dataSource.getRepository(Clinic);

    const admin = userRepo.create({
      email: 'analytics.admin@clinic.test',
      firstName: 'Олександр',
      lastName: 'Петренко',
      phone: '+380501234567',
      role: 2,
      password: 'admin123',
      isActive: true,
    });
    await userRepo.save(admin);

    const clinic = clinicRepo.create({
      clinicName: 'Тестова Клініка Аналітики',
      clinicAddress: 'м. Київ, вул. Хрещатик, 1',
      clinicBio: 'Клініка для тестування системи аналітики',
      isActive: true,
      createdBy: admin,
      dateOfCreate: this.daysAgo(180),
    });

    clinic.clinicAdmins = [admin];
    await clinicRepo.save(clinic);

    console.log(`✅ Створено клініку: ${clinic.clinicName} (ID: ${clinic.id})`);
    console.log(`✅ Створено адміна: ${admin.email}`);

    return { clinic, admin };
  }

  // ==================================================================================
  // 2. СТВОРЕННЯ ЛІКАРІВ (15 ЛІКАРІВ З РІЗНИМИ ПРОФІЛЯМИ)
  // ==================================================================================

  async createDoctors(clinic: Clinic): Promise<User[]> {
    console.log('👨‍⚕️ Створюю 15 лікарів...');

    const userRepo = this.dataSource.getRepository(User);
    const clinicRepo = this.dataSource.getRepository(Clinic);

    const doctorProfiles = [
      // Champions (3) - активні, багато декларацій, висока успішність
      {
        name: 'Іван',
        surname: 'Коваленко',
        lastActive: 3,
        declarationsTarget: 80,
      },
      {
        name: 'Марія',
        surname: 'Шевченко',
        lastActive: 5,
        declarationsTarget: 70,
      },
      {
        name: 'Петро',
        surname: 'Бондаренко',
        lastActive: 7,
        declarationsTarget: 60,
      },

      // Loyal (2) - регулярно активні, середня кількість
      {
        name: 'Олена',
        surname: 'Ткаченко',
        lastActive: 10,
        declarationsTarget: 45,
      },
      {
        name: 'Андрій',
        surname: 'Мельник',
        lastActive: 14,
        declarationsTarget: 40,
      },

      // Potential Loyalists (2) - нові активні
      {
        name: 'Наталія',
        surname: 'Поліщук',
        lastActive: 2,
        declarationsTarget: 12,
      },
      {
        name: 'Віктор',
        surname: 'Семенюк',
        lastActive: 4,
        declarationsTarget: 10,
      },

      // At Risk (2) - давно неактивні, але раніше були активні
      {
        name: 'Юлія',
        surname: 'Коваль',
        lastActive: 65,
        declarationsTarget: 35,
      },
      {
        name: 'Сергій',
        surname: 'Захарчук',
        lastActive: 70,
        declarationsTarget: 30,
      },

      // Can't Lose Them (1) - дуже давно неактивні, але мали багато
      {
        name: 'Тетяна',
        surname: 'Савченко',
        lastActive: 95,
        declarationsTarget: 55,
      },

      // Hibernating (2) - неактивні з малою кількістю
      {
        name: 'Дмитро',
        surname: 'Литвин',
        lastActive: 125,
        declarationsTarget: 8,
      },
      {
        name: 'Ірина',
        surname: 'Гончар',
        lastActive: 130,
        declarationsTarget: 6,
      },

      // Проблемні (3) - для аномалій
      {
        name: 'Роман',
        surname: 'Кравець',
        lastActive: 15,
        declarationsTarget: 25,
        highRejection: true,
      },
      {
        name: 'Оксана',
        surname: 'Мороз',
        lastActive: 20,
        declarationsTarget: 30,
        slowProcessing: true,
      },
      {
        name: 'Ігор',
        surname: 'Данилюк',
        lastActive: 40,
        declarationsTarget: 4,
        lowActivity: true,
      },
    ];

    const doctors: User[] = [];
    // Пароль буде автоматично хешований через @BeforeInsert() хук в entity

    for (let i = 0; i < doctorProfiles.length; i++) {
      const profile = doctorProfiles[i];
      const doctor = userRepo.create({
        email: `doctor${i + 1}@clinic.test`,
        firstName: profile.name,
        lastName: profile.surname,
        phone: `+38050${String(i + 1).padStart(7, '0')}`,
        role: 1, // Лікар
        profession: 'Сімейний лікар',
        password: 'doctor123',
        isActive: true,
      });

      await userRepo.save(doctor);
      doctors.push(doctor);
    }

    // Додаємо лікарів до клініки через query builder, щоб не перезаписувати існуючі зв'язки
    for (const doctor of doctors) {
      await this.dataSource.query(
        `INSERT INTO clinic_clinic_workers_user (clinic_name, user_email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [clinic.clinicName, doctor.email],
      );
    }

    console.log(`✅ Створено ${doctors.length} лікарів`);
    return doctors;
  }

  // ==================================================================================
  // 3. СТВОРЕННЯ ПАЦІЄНТІВ (250 ПАЦІЄНТІВ, 6 КОГОРТ)
  // ==================================================================================

  async createPatients(): Promise<User[]> {
    console.log('👥 Створюю 250 пацієнтів...');

    const userRepo = this.dataSource.getRepository(User);
    const patients: User[] = [];
    // Пароль буде автоматично хешований через @BeforeInsert() хук в entity

    const firstNames = [
      'Олександр',
      'Марія',
      'Іван',
      'Олена',
      'Петро',
      'Наталія',
      'Андрій',
      'Юлія',
      'Сергій',
      'Тетяна',
      'Дмитро',
      'Ірина',
      'Віктор',
      'Оксана',
      'Роман',
    ];
    const lastNames = [
      'Коваленко',
      'Шевченко',
      'Бондаренко',
      'Ткаченко',
      'Мельник',
      'Поліщук',
      'Семенюк',
      'Коваль',
      'Захарчук',
      'Савченко',
      'Литвин',
      'Гончар',
    ];

    for (let i = 0; i < 250; i++) {
      const patient = userRepo.create({
        email: `patient${i + 1}@test.com`,
        firstName: this.randomElement(firstNames),
        lastName: this.randomElement(lastNames),
        phone: `+38067${String(i + 1).padStart(7, '0')}`,
        role: 0, // Пацієнт
        password: 'patient123',
        isActive: true,
      });

      await userRepo.save(patient);
      patients.push(patient);
    }

    console.log(`✅ Створено ${patients.length} пацієнтів`);
    return patients;
  }

  // ==================================================================================
  // 4. СТВОРЕННЯ ДЕКЛАРАЦІЙ (1000 ДЕКЛАРАЦІЙ З ПАТЕРНАМИ ТА АНОМАЛІЯМИ)
  // ==================================================================================

  async createDeclarations(
    doctors: User[],
    patients: User[],
  ): Promise<Declaration[]> {
    console.log('📋 Створюю 1000 декларацій...');

    const declarationRepo = this.dataSource.getRepository(Declaration);
    const declarations: Declaration[] = [];

    // Розподіл по статусах
    const statusDistribution = [
      { status: DeclarationStatus.PENDING_DOCTOR_REVIEW, count: 150 },
      { status: DeclarationStatus.PENDING_DOCTOR_SIGN, count: 100 },
      { status: DeclarationStatus.ACTIVE, count: 500 },
      { status: DeclarationStatus.REJECTED, count: 200 },
      { status: DeclarationStatus.TERMINATED, count: 50 },
    ];

    // Когорти (по місяцях, останні 6 місяців)
    const cohorts = [
      { monthsAgo: 6, count: 120 },
      { monthsAgo: 5, count: 140 },
      { monthsAgo: 4, count: 160 },
      { monthsAgo: 3, count: 180 },
      { monthsAgo: 2, count: 200 },
      { monthsAgo: 1, count: 200 },
    ];

    // Аномальні дні
    const anomalousDays = [
      { daysAgo: 28, count: 55, type: 'spike' }, // Сплеск
      { daysAgo: 21, count: 2, type: 'drop' }, // Провал
      { daysAgo: 14, count: 20, type: 'high_rejection', rejectionRate: 0.6 }, // Високий % відхилень
      { daysAgo: 7, count: 50, type: 'spike' }, // Ще один сплеск
    ];

    // Розподіл по днях тижня (0 = неділя, 6 = субота)
    const dayOfWeekDistribution = [0.06, 0.2, 0.18, 0.17, 0.16, 0.15, 0.08]; // Неділя-Субота

    // Розподіл по годинах
    const hourDistribution = [
      0.01,
      0.01,
      0.01,
      0.01,
      0.01,
      0.01,
      0.01,
      0.02, // 00-07
      0.08,
      0.07,
      0.12,
      0.13,
      0.1,
      0.05,
      0.05,
      0.08, // 08-15
      0.08,
      0.07,
      0.05,
      0.03,
      0.02,
      0.01,
      0.01,
      0.01, // 16-23
    ];

    let declarationCounter = 1;

    // Генеруємо декларації для кожної когорти
    for (const cohort of cohorts) {
      const cohortStart = this.daysAgo(cohort.monthsAgo * 30);
      const cohortEnd = this.daysAgo((cohort.monthsAgo - 1) * 30);

      for (let i = 0; i < cohort.count; i++) {
        // Випадкова дата в межах когорти з урахуванням патернів
        const insertedAt = this.randomDate(cohortStart, cohortEnd);

        // Корегуємо день тижня згідно розподілу
        const targetDayOfWeek = this.getWeightedRandomIndex(
          dayOfWeekDistribution,
        );
        const currentDayOfWeek = insertedAt.getDay();
        const dayDiff = targetDayOfWeek - currentDayOfWeek;
        insertedAt.setDate(insertedAt.getDate() + dayDiff);

        // Корегуємо годину згідно розподілу
        const targetHour = this.getWeightedRandomIndex(hourDistribution);
        insertedAt.setHours(
          targetHour,
          this.randomInt(0, 59),
          this.randomInt(0, 59),
        );

        // Вибираємо випадкового лікаря та пацієнта
        const doctor = this.randomElement(doctors);
        const patient = this.randomElement(patients);

        // Визначаємо статус
        const status = this.getStatusByDistribution(statusDistribution, i);

        // Час обробки (для різних лікарів)
        let processingHours = this.randomInt(1, 72);

        // Повільні лікарі (для аномалій)
        if (doctor.email === 'doctor14@clinic.test') {
          processingHours = this.randomInt(100, 200); // Оксана Мороз - повільна обробка
        }

        const updatedAt = new Date(insertedAt);
        updatedAt.setHours(updatedAt.getHours() + processingHours);

        // Rejection rate (для проблемних лікарів)
        let isRejected = status === DeclarationStatus.REJECTED;
        if (doctor.email === 'doctor13@clinic.test') {
          // Роман Кравець - високий % відхилень
          isRejected = Math.random() < 0.5; // 50% rejection rate
        }

        const declaration = declarationRepo.create({
          declaration_number: `DEC-${String(declarationCounter).padStart(6, '0')}`,
          patient_email: patient.email,
          doctor_email: doctor.email,
          status: isRejected ? DeclarationStatus.REJECTED : status,
          scope: 'family_doctor',
          declaration_request_id: `REQ-${String(declarationCounter).padStart(6, '0')}`,
          inserted_at: insertedAt,
          updated_at: updatedAt,
          start_date: insertedAt.toISOString().split('T')[0],
          end_date: new Date(
            insertedAt.getFullYear() + 1,
            insertedAt.getMonth(),
            insertedAt.getDate(),
          )
            .toISOString()
            .split('T')[0],
          signed_at:
            status === DeclarationStatus.ACTIVE
              ? updatedAt.toISOString()
              : null,
          reason: isRejected ? 'Недостатньо документів' : null,
          reason_description: isRejected
            ? 'Пацієнт не надав усі необхідні документи'
            : null,
          person_data: this.generatePersonData(patient),
        });

        declarations.push(declaration);
        declarationCounter++;
      }
    }

    // Додаємо аномальні дні
    for (const anomaly of anomalousDays) {
      const anomalyDate = this.daysAgo(anomaly.daysAgo);

      for (let i = 0; i < anomaly.count; i++) {
        const doctor = this.randomElement(doctors);
        const patient = this.randomElement(patients);

        const insertedAt = new Date(anomalyDate);
        insertedAt.setHours(this.randomInt(8, 18), this.randomInt(0, 59));

        let status = this.randomElement([
          DeclarationStatus.ACTIVE,
          DeclarationStatus.PENDING_DOCTOR_REVIEW,
          DeclarationStatus.PENDING_DOCTOR_SIGN,
        ]);

        if (anomaly.type === 'high_rejection' && Math.random() < 0.6) {
          status = DeclarationStatus.REJECTED;
        }

        const processingHours = this.randomInt(1, 72);
        const updatedAt = new Date(insertedAt);
        updatedAt.setHours(updatedAt.getHours() + processingHours);

        const declaration = declarationRepo.create({
          declaration_number: `DEC-${String(declarationCounter).padStart(6, '0')}`,
          patient_email: patient.email,
          doctor_email: doctor.email,
          status,
          scope: 'family_doctor',
          declaration_request_id: `REQ-${String(declarationCounter).padStart(6, '0')}`,
          inserted_at: insertedAt,
          updated_at: updatedAt,
          start_date: insertedAt.toISOString().split('T')[0],
          end_date: new Date(
            insertedAt.getFullYear() + 1,
            insertedAt.getMonth(),
            insertedAt.getDate(),
          )
            .toISOString()
            .split('T')[0],
          signed_at:
            status === DeclarationStatus.ACTIVE
              ? updatedAt.toISOString()
              : null,
          reason:
            status === DeclarationStatus.REJECTED
              ? 'Недостатньо документів'
              : null,
          person_data: this.generatePersonData(patient),
        });

        declarations.push(declaration);
        declarationCounter++;
      }
    }

    // Зберігаємо батчами по 100
    for (let i = 0; i < declarations.length; i += 100) {
      const batch = declarations.slice(i, i + 100);
      await declarationRepo.save(batch);
      console.log(
        `  💾 Збережено ${i + batch.length}/${declarations.length} декларацій`,
      );
    }

    console.log(`✅ Створено ${declarations.length} декларацій`);
    return declarations;
  }

  // ==================================================================================
  // 5. СТВОРЕННЯ ЗВ'ЯЗКІВ МІЖ КОРИСТУВАЧАМИ (user_connections_user)
  // ==================================================================================

  async createUserConnections(declarations: Declaration[]): Promise<void> {
    console.log("🔗 Створюю зв'язки між користувачами...");

    // Отримуємо всі унікальні пари лікар-пацієнт з ACTIVE декларацій
    const activeDeclarations = declarations.filter(
      (d) => d.status === DeclarationStatus.ACTIVE,
    );

    const uniqueConnections = new Map<
      string,
      { doctor: string; patient: string }
    >();

    for (const declaration of activeDeclarations) {
      const key = `${declaration.doctor_email}___${declaration.patient_email}`;
      if (!uniqueConnections.has(key)) {
        uniqueConnections.set(key, {
          doctor: declaration.doctor_email,
          patient: declaration.patient_email,
        });
      }
    }

    console.log(
      `  📊 Знайдено ${uniqueConnections.size} унікальних зв'язків лікар-пацієнт`,
    );

    // Вставляємо зв'язки в таблицю
    let insertedCount = 0;
    for (const connection of uniqueConnections.values()) {
      try {
        await this.dataSource.query(
          `INSERT INTO user_connections_user (user_email, connection_email)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [connection.doctor, connection.patient],
        );
        insertedCount++;
      } catch (error) {
        console.log(
          `  ⚠️ Помилка при створенні зв'язку ${connection.doctor} <-> ${connection.patient}:`,
          error.message,
        );
      }
    }

    console.log(`✅ Створено ${insertedCount} зв'язків між користувачами`);
  }

  // ==================================================================================
  // 6. СТВОРЕННЯ НОТИФІКАЦІЙ (80 НОТИФІКАЦІЙ)
  // ==================================================================================

  async createNotifications(doctors: User[], patients: User[]): Promise<void> {
    console.log('🔔 Створюю 80 нотифікацій...');

    const notificationRepo = this.dataSource.getRepository(Notification);
    const allUsers = [...doctors, ...patients];

    // 40 нотифікацій відправлені пацієнтами (для churn prediction)
    for (let i = 0; i < 40; i++) {
      const sender = this.randomElement(patients);
      const recipient = this.randomElement(doctors);
      const daysAgo = this.randomInt(1, 90);

      const notification = notificationRepo.create({
        sender,
        recipient,
        title: 'Запитання щодо декларації',
        message: 'Доброго дня! Хотів би уточнити деталі щодо моєї декларації.',
        type: NotificationType.GENERAL_MESSAGE,
        isRead: Math.random() > 0.3, // 70% прочитані
        createdAt: this.daysAgo(daysAgo),
        updatedAt: this.daysAgo(daysAgo - this.randomInt(0, 5)), // Прочитано пізніше
      });

      await notificationRepo.save(notification);
    }

    // 40 нотифікацій отримані пацієнтами (для churn prediction)
    for (let i = 0; i < 40; i++) {
      const sender = this.randomElement(doctors);
      const recipient = this.randomElement(patients);
      const daysAgo = this.randomInt(1, 90);

      const notification = notificationRepo.create({
        sender,
        recipient,
        title: 'Повідомлення від клініки',
        message: 'Ваша декларація оброблена. Будь ласка, перевірте статус.',
        type: NotificationType.GENERAL_MESSAGE,
        isRead: Math.random() > 0.4, // 60% прочитані
        createdAt: this.daysAgo(daysAgo),
        updatedAt: this.daysAgo(daysAgo - this.randomInt(0, 7)),
      });

      await notificationRepo.save(notification);
    }

    console.log('✅ Створено 80 нотифікацій');
  }

  // ==================================================================================
  // ДОПОМІЖНІ ФУНКЦІЇ
  // ==================================================================================

  private getWeightedRandomIndex(weights: number[]): number {
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) return i;
    }
    return weights.length - 1;
  }

  private getStatusByDistribution(
    distribution: { status: DeclarationStatus; count: number }[],
    index: number,
  ): DeclarationStatus {
    let totalCount = 0;
    for (const item of distribution) {
      totalCount += item.count;
      if (index < totalCount) {
        return item.status;
      }
    }
    return DeclarationStatus.PENDING_DOCTOR_REVIEW;
  }

  private generatePersonData(patient: User) {
    return {
      first_name: patient.firstName,
      last_name: patient.lastName,
      second_name: 'Іванович',
      birth_date: '1990-01-01',
      gender: Gender.MALE,
      tax_id: String(this.randomInt(1000000000, 9999999999)),
      birth_settlement: 'Київ',
      birth_country: 'Україна',
      verification_status: VerificationStatus.VERIFIED,
      phones: [
        {
          type: PhoneType.MOBILE,
          number: patient.phone,
        },
      ],
      emergency_contact: {
        first_name: 'Контакт',
        last_name: 'Екстрений',
        second_name: 'Іванович',
        phones: [{ type: 'MOBILE', number: '+380501111111' }],
      },
      addresses: [
        {
          type: 'RESIDENCE',
          country: 'Україна',
          area: 'Київська область',
          region: 'Київський район',
          settlement: 'Київ',
          settlement_type: 'CITY',
          settlement_id: '01',
          street_type: 'STREET',
          street: 'Хрещатик',
          building: '1',
          zip: '01001',
        },
      ],
      documents: [
        {
          type: DocumentTypes.PASSPORT,
          number: 'AA123456',
          issued_by: 'МВС України',
          issued_at: '2015-01-01',
        },
      ],
    };
  }

  // ==================================================================================
  // ГОЛОВНА ФУНКЦІЯ ЗАПУСКУ
  // ==================================================================================

  async seed(): Promise<void> {
    console.log('\n🚀 ПОЧАТОК ГЕНЕРАЦІЇ ДАНИХ ДЛЯ АНАЛІТИКИ\n');
    console.log('='.repeat(60));

    try {
      // 0. Очищаємо старі тестові дані
      await this.cleanTestData();

      // 1. Створюємо клініку та адміна
      const { clinic, admin } = await this.createClinicAndAdmin();

      // 2. Створюємо лікарів
      const doctors = await this.createDoctors(clinic);

      // 3. Створюємо пацієнтів
      const patients = await this.createPatients();

      // 4. Створюємо декларації
      const declarations = await this.createDeclarations(doctors, patients);

      // 5. Створюємо зв'язки між користувачами
      await this.createUserConnections(declarations);

      // 6. Створюємо нотифікації
      await this.createNotifications(doctors, patients);

      console.log('\n' + '='.repeat(60));
      console.log('\n✅ ГЕНЕРАЦІЯ ЗАВЕРШЕНА УСПІШНО!\n');
      console.log('📊 ПІДСУМОК:');
      console.log(`  🏥 Клінік: 1`);
      console.log(`  👨‍💼 Адмінів: 1`);
      console.log(`  👨‍⚕️ Лікарів: ${doctors.length}`);
      console.log(`  👥 Пацієнтів: ${patients.length}`);
      console.log(`  📋 Декларацій: ${declarations.length}`);
      console.log(
        `  🔗 Зв'язків користувачів: (створено автоматично на основі ACTIVE декларацій)`,
      );
      console.log(`  🔔 Нотифікацій: 80`);
      console.log('\n📝 ДАНІ ДЛЯ ВХОДУ:');
      console.log(`  Email адміна: analytics.admin@clinic.test`);
      console.log(`  Пароль адміна: admin123`);
      console.log(`  Email лікаря: doctor1@clinic.test`);
      console.log(`  Пароль лікаря: doctor123`);
      console.log('\n');
    } catch (error) {
      console.error('\n❌ ПОМИЛКА ПІД ЧАС ГЕНЕРАЦІЇ:', error);
      throw error;
    }
  }
}

// ==================================================================================
// ЕКСПОРТ ФУНКЦІЇ ДЛЯ ЗАПУСКУ
// ==================================================================================

export async function runAnalyticsSeeder(
  dataSource: DataSource,
): Promise<void> {
  const seeder = new AnalyticsDataSeeder(dataSource);
  await seeder.seed();
}
