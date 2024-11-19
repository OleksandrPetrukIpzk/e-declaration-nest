import {UserService} from "./user.service";
import {Body, Controller, Get, Post} from "@nestjs/common";
import {createProfileDto} from "./create-profile.dto";
import {User} from "./user.entity";

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('/create')
    create(@Body()createProfileDto: createProfileDto): Promise<User> {
        return this.userService.createUser(createProfileDto);
    }

    @Post('/login')
    loginUser(@Body()createProfileDto: createProfileDto): Promise<User> {
        return this.userService.loginUser(createProfileDto)
    }
}