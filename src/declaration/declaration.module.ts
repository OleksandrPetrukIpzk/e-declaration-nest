import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Declaration } from './declaration.entity';
import { DeclarationController } from './declaration.controller';
import { DeclarationService } from './declaration.service';
import { User } from '../user/user.entity';
import { LegalEntity } from '../legalEntity/lagalEntity.entity';
import { Division } from '../division/division.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Declaration, User, LegalEntity, Division]),
  ],
  controllers: [DeclarationController],
  providers: [DeclarationService],
  exports: [DeclarationService],
})
export class DeclarationModule {}
