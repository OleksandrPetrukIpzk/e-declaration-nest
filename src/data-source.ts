import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'rootPass',
  database: 'edeclaration',
  entities: [__dirname + '/src/*/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: true,
});
