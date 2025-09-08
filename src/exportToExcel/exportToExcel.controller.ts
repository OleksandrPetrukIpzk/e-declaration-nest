import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Res,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ExportToExcelService } from './exportToExcel.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export interface ExportToExcelConfigDto {
  tableName: string;
  fields: Array<{
    columnName: string;
    fieldPaths: string;
  }>;
}

@Controller('export-excel')
export class ExportToExcelController {
  constructor(private readonly exportToExcelService: ExportToExcelService) {}

  @Post('csv-to-excel')
  @UseInterceptors(FileInterceptor('csvFile'))
  async exportCsvToExcel(
    @UploadedFile() csvFile: Express.Multer.File,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (!csvFile) {
      throw new BadRequestException('CSV file is required');
    }

    // Парсимо конфігурацію з body
    let config: ExportToExcelConfigDto;
    try {
      config = {
        tableName: body.tableName,
        fields: JSON.parse(body.fields || '[]'),
      };
    } catch {
      throw new BadRequestException('Invalid fields configuration');
    }

    if (!config.tableName || !config.fields || config.fields.length === 0) {
      throw new BadRequestException(
        'Table name and fields configuration are required',
      );
    }

    try {
      // Парсимо CSV файл
      const csvData = await this.exportToExcelService.parseCsvFile(
        csvFile.buffer,
      );

      // Валідуємо поля в CSV файлі
      await this.exportToExcelService.validateTableFields(
        config.tableName,
        config.fields,
        csvData,
      );

      // Створюємо Excel файл з даними з CSV
      const excelBuffer = await this.exportToExcelService.createExcelFromCsv(
        csvData,
        config.tableName,
        config.fields,
      );

      const fileName = `export_${config.tableName}_${Date.now()}.xlsx`;

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      res.send(excelBuffer);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('available-tables')
  async getAvailableTables() {
    return { message: 'This endpoint is not needed for CSV processing' };
  }

  @Post('csv-fields')
  @UseInterceptors(FileInterceptor('csvFile'))
  async getCsvFields(@UploadedFile() csvFile: Express.Multer.File) {
    if (!csvFile) {
      throw new BadRequestException('CSV file is required');
    }
    try {
      const csvData = await this.exportToExcelService.parseCsvFile(
        csvFile.buffer,
      );
      const fields =
        await this.exportToExcelService.getAvailableCsvFields(csvData);
      return { fields };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  @Post('relations-separate-sheets')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importWithSeparateSheets(@UploadedFile() file: Express.Multer.File) {
    return await this.exportToExcelService.importFromExcel(file);
  }

  @Post('denormalized')
  @UseInterceptors(FileInterceptor('file'))
  async importDenormalized(@UploadedFile() file: Express.Multer.File) {
    return await this.exportToExcelService.importFromExcelWithDenormalizedData(
      file,
    );
  }

  @Post('by-ids')
  @UseInterceptors(FileInterceptor('file'))
  async importById(@UploadedFile() file: Express.Multer.File) {
    return await this.exportToExcelService.importFromExcelByService(file);
  }
}
