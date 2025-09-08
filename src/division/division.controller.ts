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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DivisionService } from './division.service';
import { Division } from './division.entity';
import {
  CreateDivisionDto,
  DivisionSearchDto,
  UpdateDivisionDto,
} from './division.dto';

@ApiTags('divisions')
@Controller('divisions')
export class DivisionController {
  constructor(private readonly divisionService: DivisionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new division' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Division created successfully',
    type: Division,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Division with this DLS ID already exists',
  })
  async create(
    @Body() createDivisionDto: CreateDivisionDto,
  ): Promise<Division> {
    return await this.divisionService.create(createDivisionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all divisions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all divisions',
    type: [Division],
  })
  async findAll(): Promise<Division[]> {
    return await this.divisionService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search divisions with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filtered list of divisions',
    type: [Division],
  })
  async search(@Query() searchDto: DivisionSearchDto): Promise<Division[]> {
    return await this.divisionService.search(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get division by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Division found',
    type: Division,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Division not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Division> {
    return await this.divisionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update division by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Division updated successfully',
    type: Division,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Division not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Division with this DLS ID already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDivisionDto: UpdateDivisionDto,
  ): Promise<Division> {
    return await this.divisionService.update(id, updateDivisionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete division by ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Division deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Division not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return await this.divisionService.remove(id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple divisions' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Divisions created successfully',
    type: [Division],
  })
  async bulkCreate(
    @Body() createDivisionDtos: CreateDivisionDto[],
  ): Promise<Division[]> {
    return await this.divisionService.bulkCreate(createDivisionDtos);
  }
}
