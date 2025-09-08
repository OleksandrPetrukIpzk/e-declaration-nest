import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Clinic } from './clinic.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../jwt/jwt.strategy';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Clinic]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [JwtStrategy, ClinicService],
  controllers: [ClinicController],
})
export class ClinicModule {}
