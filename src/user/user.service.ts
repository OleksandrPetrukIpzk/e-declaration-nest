import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { createProfileDto } from './create-profile.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRoleEnum } from './enums';
import { UpdateUserDto } from './update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async createUser(createProfileDto: createProfileDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createProfileDto.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    return this.usersRepository.save(
      this.usersRepository.create(createProfileDto),
    );
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, {
      email: dto.email ?? user.email,
      firstName: dto.firstName ?? user.firstName,
      lastName: dto.lastName ?? user.lastName,
      phone: dto.phone ?? user.phone,
      bio: dto.bio ?? user.bio,
      address: dto.address ?? user.address,
      region: dto.region ?? user.region,
      profession: dto.profession ?? user.profession,
      isActive: dto.isActive ?? user.isActive,
    });

    return await this.usersRepository.save(user);
  }

  async loginUser(createProfileDto: createProfileDto): Promise<any | null> {
    const user = await this.usersRepository.findOne({
      where: { email: createProfileDto.email },
    });
    if (
      user &&
      (await bcrypt.compare(createProfileDto.password, user.password))
    ) {
      const payload = { username: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      return { user, accessToken, refreshToken };
    }
    return null;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newAccessToken = this.jwtService.sign({ sub: payload.sub });
      return { accessToken: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  async getUsersCount(): Promise<number> {
    const users = await this.usersRepository.count();
    return users;
  }

  async getUserInfo(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  async getActiveProviderList(): Promise<User[] | null> {
    const user = await this.usersRepository.find({
      where: { isActive: true, role: UserRoleEnum.Hospital },
    });
    if (!user) {
      return null;
    }
    return user;
  }

  async getAllProviderList(userId: number): Promise<User[] | null> {
    const user = await this.usersRepository.find({
      where: { isActive: true, role: UserRoleEnum.Admin, id: userId },
    });
    if (user) {
      const user = await this.usersRepository.find({
        where: { role: UserRoleEnum.Hospital },
      });
      if (!user) {
        return null;
      }
      return user;
    }
    return null;
  }

  async getActiveAdminList(userId: number): Promise<User[] | null> {
    const user = await this.usersRepository.find({
      where: {
        isActive: true,
        role: UserRoleEnum.Admin || UserRoleEnum.Hospital,
        id: userId,
      },
    });
    if (user) {
      const user = await this.usersRepository.find({
        where: { isActive: true, role: UserRoleEnum.Admin },
      });
      if (!user) {
        return null;
      }
      return user;
    }
    return null;
  }
  async getAllAdminList(userId: number): Promise<User[] | null> {
    const user = await this.usersRepository.find({
      where: {
        isActive: true,
        role: UserRoleEnum.Admin,
        id: userId,
      },
    });
    if (user) {
      const user = await this.usersRepository.find({
        where: { role: UserRoleEnum.Admin },
      });
      if (!user) {
        return null;
      }
      return user;
    }
    return null;
  }
  async connectUsers(userId: number, otherUserId: number) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot connect to yourself');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['connections'],
    });

    const otherUser = await this.usersRepository.findOne({
      where: { id: otherUserId },
      relations: ['connections'],
    });

    if (!user || !otherUser) {
      throw new NotFoundException('One or both users not found');
    }

    // 1. Перевірка: користувачі вже пов’язані
    const alreadyConnected = user.connections.some(
      (conn) => Number(conn.id) === Number(otherUser.id),
    );
    if (alreadyConnected) {
      throw new BadRequestException('Users already connected');
    }

    // 2. Перевірка: otherUser вже має хоча б один connection
    if (otherUser.connections.length > 0) {
      throw new BadRequestException('Target user already has a connection');
    }

    // Додаємо один одного
    user.connections.push(otherUser);
    otherUser.connections.push(user);

    await this.usersRepository.save([user, otherUser]);

    return { message: 'Users successfully connected' };
  }
}
