import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Division } from './division.entity';
import {
  CreateDivisionDto,
  DivisionSearchDto,
  UpdateDivisionDto,
} from './division.dto';

@Injectable()
export class DivisionService {
  constructor(
    @InjectRepository(Division)
    private divisionRepository: Repository<Division>,
  ) {}

  async create(createDivisionDto: CreateDivisionDto): Promise<Division> {
    try {
      const division = this.divisionRepository.create(createDivisionDto);
      return await this.divisionRepository.save(division);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Division with this DLS ID already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Division[]> {
    return await this.divisionRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Division> {
    const division = await this.divisionRepository.findOne({ where: { id } });
    if (!division) {
      throw new NotFoundException(`Division with ID ${id} not found`);
    }
    return division;
  }

  async search(searchDto: DivisionSearchDto): Promise<Division[]> {
    const where: FindOptionsWhere<Division> = {};

    if (searchDto.name) {
      where.name = Like(`%${searchDto.name}%`);
    }

    if (searchDto.type) {
      where.type = searchDto.type;
    }

    if (searchDto.status) {
      where.status = searchDto.status;
    }

    if (searchDto.mountain_group !== undefined) {
      where.mountain_group = searchDto.mountain_group;
    }

    if (searchDto.dls_verified !== undefined) {
      where.dls_verified = searchDto.dls_verified;
    }

    return await this.divisionRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDivisionDto: UpdateDivisionDto,
  ): Promise<Division> {
    const division = await this.findOne(id);

    Object.assign(division, updateDivisionDto);

    try {
      return await this.divisionRepository.save(division);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Division with this DLS ID already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const division = await this.findOne(id);
    await this.divisionRepository.remove(division);
  }

  async bulkCreate(divisions: CreateDivisionDto[]): Promise<Division[]> {
    const results: Division[] = [];

    for (const divisionDto of divisions) {
      try {
        const division = await this.create(divisionDto);
        results.push(division);
      } catch (error) {
        console.error(`Error creating division: ${error.message}`, divisionDto);
      }
    }

    return results;
  }
}
