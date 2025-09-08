// src/controllers/legal-entity.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LegalEntityService } from './legalEntity.service';
import { LegalEntity } from './lagalEntity.entity';
import {
  CreateLegalEntityDto,
  LegalEntitySearchDto,
  UpdateLegalEntityDto,
} from './legalEntity.dto';
import { Division } from '../division/division.entity';

@ApiTags('legal-entities')
@Controller('legal-entities')
// @UseGuards(JwtAuthGuard) // Uncomment if you have auth guards
// @ApiBearerAuth()
export class LegalEntityController {
  constructor(private readonly legalEntityService: LegalEntityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new legal entity' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Legal entity created successfully',
    type: LegalEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Legal entity with this EDRPOU already exists',
  })
  async create(
    @Body() createLegalEntityDto: CreateLegalEntityDto,
  ): Promise<LegalEntity> {
    return await this.legalEntityService.create(createLegalEntityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all legal entities' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all legal entities',
    type: [LegalEntity],
  })
  async findAll(): Promise<LegalEntity[]> {
    return await this.legalEntityService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search legal entities with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filtered list of legal entities',
    type: [LegalEntity],
  })
  async search(
    @Query() searchDto: LegalEntitySearchDto,
  ): Promise<LegalEntity[]> {
    return await this.legalEntityService.search(searchDto);
  }

  @Get('edrpou/:edrpou')
  @ApiOperation({ summary: 'Get legal entity by EDRPOU' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Legal entity found',
    type: LegalEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Legal entity not found',
  })
  async findByEdrpou(@Param('edrpou') edrpou: string): Promise<LegalEntity> {
    return await this.legalEntityService.findByEdrpou(edrpou);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get legal entity by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Legal entity found',
    type: LegalEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Legal entity not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LegalEntity> {
    return await this.legalEntityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update legal entity by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Legal entity updated successfully',
    type: LegalEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Legal entity not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Legal entity with this EDRPOU already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLegalEntityDto: UpdateLegalEntityDto,
  ): Promise<LegalEntity> {
    return await this.legalEntityService.update(id, updateLegalEntityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete legal entity by ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Legal entity deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Legal entity not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return await this.legalEntityService.remove(id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple legal entities' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Legal entities created successfully',
    type: [LegalEntity],
  })
  async bulkCreate(
    @Body() createLegalEntityDtos: CreateLegalEntityDto[],
  ): Promise<LegalEntity[]> {
    return await this.legalEntityService.bulkCreate(createLegalEntityDtos);
  }
}
