import { DataSource } from 'typeorm';
import { runAnalyticsSeeder } from './analytics-data.seeder';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';
import { Declaration } from '../declaration/declaration.entity';
import { Notification } from '../notification/notification.entity';
import { AnalyticsEvent } from './analytics-event.entity';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'edeclaration',
    entities: [User, Clinic, Declaration, Notification, AnalyticsEvent],
    synchronize: false,
    logging: false,
  });

  try {
    // Ініціалізуємо з'єднання
    console.log('🔌 Підключення до бази даних...');
    await dataSource.initialize();
    console.log('✅ Підключено до бази даних\n');
    await runAnalyticsSeeder(dataSource);
    await dataSource.destroy();
    console.log("🔌 З'єднання закрито\n");

    process.exit(0);
  } catch (error) {
    console.error('❌ Критична помилка:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
