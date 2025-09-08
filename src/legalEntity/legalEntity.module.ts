import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { LegalEntity } from './lagalEntity.entity';
import { LegalEntityService } from './legalEntity.service';
import { LegalEntityController } from './legalEntity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LegalEntity, User])],
  controllers: [LegalEntityController],
  providers: [LegalEntityService],
  exports: [LegalEntityService],
})
export class LegalEntityModule {}
