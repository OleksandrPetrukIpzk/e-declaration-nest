import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentModule } from './document/document.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { JwtGlobalModule } from './jwt/jwt.module';
import { ClinicModule } from './clinic/clinic.module';
import { ExportToExcelModule } from './exportToExcel/exportToExcel.module';
import { DeclarationModule } from './declaration/declaration.module';
import { DivisionModule } from './division/division.module';
import { LegalEntityModule } from './legalEntity/legalEntity.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'rootPass',
      database: 'edeclaration',
      entities: [__dirname + '/**/*.entity.{js,ts}'],
      migrations: [__dirname + '/migrations/*.ts'], // Шлях до папки міграцій
      synchronize: true,
    }),
    JwtGlobalModule,
    UserModule,
    DocumentModule,
    ClinicModule,
    ExportToExcelModule,
    DeclarationModule,
    DivisionModule,
    LegalEntityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
