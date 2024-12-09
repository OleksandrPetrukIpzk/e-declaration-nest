import {Injectable, UnauthorizedException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import {createProfileDto} from "./create-profile.dto";
import {JwtService} from "@nestjs/jwt";

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
        return this.usersRepository.save(this.usersRepository.create(createProfileDto));
    }

    async loginUser(createProfileDto: createProfileDto): Promise<any | null> {
        const user = await this.usersRepository.findOne({ where: { email: createProfileDto.email } });
        if (user && await bcrypt.compare(createProfileDto.password, user.password)) {
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
}
