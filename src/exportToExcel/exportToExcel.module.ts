import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ExportToExcelController } from './exportToExcel.controller';
import { ExportToExcelService } from './exportToExcel.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Clinic } from '../clinic/clinic.entity';
import { Division } from '../division/division.entity';
import { LegalEntity } from '../legalEntity/lagalEntity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Clinic, Division, LegalEntity]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        if (
          file.mimetype === 'text/csv' ||
          file.originalname.endsWith('.csv') ||
          file.originalname.endsWith('.xls') ||
          file.originalname.endsWith('.xlsx')
        ) {
          callback(null, true);
        } else {
          callback(new Error('Only CSV files are allowed!'), false);
        }
      },
    }),
  ],
  controllers: [ExportToExcelController],
  providers: [ExportToExcelService],
})
export class ExportToExcelModule {}
