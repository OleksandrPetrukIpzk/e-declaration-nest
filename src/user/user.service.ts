import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import {createProfileDto} from "./create-profile.dto";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
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

    async loginUser(createProfileDto: createProfileDto): Promise<User | null> {
        const user = await this.usersRepository.findOne({ where: { email: createProfileDto.email} });
        if (user && await bcrypt.compare(createProfileDto.password, user.password)) {
            return user;
        }
        return null;
    }
}
