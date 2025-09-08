import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { LegalEntity } from './lagalEntity.entity';
import {
  CreateLegalEntityDto,
  LegalEntitySearchDto,
  UpdateLegalEntityDto,
} from './legalEntity.dto';

@Injectable()
export class LegalEntityService {
  constructor(
    @InjectRepository(LegalEntity)
    private legalEntityRepository: Repository<LegalEntity>,
  ) {}

  async create(
    createLegalEntityDto: CreateLegalEntityDto,
  ): Promise<LegalEntity> {
    try {
      const legalEntity =
        this.legalEntityRepository.create(createLegalEntityDto);
      return await this.legalEntityRepository.save(legalEntity);
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException(
          'Legal entity with this EDRPOU already exists',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<LegalEntity[]> {
    return await this.legalEntityRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LegalEntity> {
    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id },
    });
    if (!legalEntity) {
      throw new NotFoundException(`Legal entity with ID ${id} not found`);
    }
    return legalEntity;
  }

  async findByEdrpou(edrpou: string): Promise<LegalEntity> {
    const legalEntity = await this.legalEntityRepository.findOne({
      where: { edrpou },
    });
    if (!legalEntity) {
      throw new NotFoundException(
        `Legal entity with EDRPOU ${edrpou} not found`,
      );
    }
    return legalEntity;
  }

  async search(searchDto: LegalEntitySearchDto): Promise<LegalEntity[]> {
    const where: FindOptionsWhere<LegalEntity> = {};

    if (searchDto.name) {
      where.name = Like(`%${searchDto.name}%`);
    }

    if (searchDto.edrpou) {
      where.edrpou = Like(`%${searchDto.edrpou}%`);
    }

    if (searchDto.email) {
      where.email = Like(`%${searchDto.email}%`);
    }

    if (searchDto.status) {
      where.status = searchDto.status;
    }

    if (searchDto.legal_form) {
      where.legal_form = Like(`%${searchDto.legal_form}%`);
    }

    return await this.legalEntityRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async update(
    id: string,
    updateLegalEntityDto: UpdateLegalEntityDto,
  ): Promise<LegalEntity> {
    const legalEntity = await this.findOne(id);

    Object.assign(legalEntity, updateLegalEntityDto);

    try {
      return await this.legalEntityRepository.save(legalEntity);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Legal entity with this EDRPOU already exists',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const legalEntity = await this.findOne(id);
    await this.legalEntityRepository.remove(legalEntity);
  }

  async bulkCreate(
    legalEntities: CreateLegalEntityDto[],
  ): Promise<LegalEntity[]> {
    const results: LegalEntity[] = [];

    for (const legalEntityDto of legalEntities) {
      try {
        const legalEntity = await this.create(legalEntityDto);
        results.push(legalEntity);
      } catch (error) {
        console.error(
          `Error creating legal entity: ${error.message}`,
          legalEntityDto,
        );
      }
    }

    return results;
  }
}
