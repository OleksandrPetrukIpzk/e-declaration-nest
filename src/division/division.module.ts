import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Division } from './division.entity';
import { DivisionController } from './division.controller';
import { DivisionService } from './division.service';

@Module({
  imports: [TypeOrmModule.forFeature([Division, User])],
  controllers: [DivisionController],
  providers: [DivisionService],
  exports: [DivisionService],
})
export class DivisionModule {}
