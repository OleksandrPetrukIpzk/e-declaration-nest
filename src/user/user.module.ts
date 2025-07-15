import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../jwt/jwt.strategy';
import { Clinic } from '../clinic/clinic.entity';
import { Declaration } from '../declaration/declaration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Clinic, Declaration]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [UserService, JwtStrategy],
  controllers: [UserController],
})
export class UserModule {}
