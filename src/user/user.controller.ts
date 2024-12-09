import {UserService} from "./user.service";
import {Body, Controller, Get, Post, UseGuards} from "@nestjs/common";
import {createProfileDto} from "./create-profile.dto";
import {User} from "./user.entity";
import {AuthGuard} from "@nestjs/passport";
import {GetUserInfoDto} from "./dtos";

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
    @Get('/count')
    getUsersCount(): Promise<number> {
        return this.userService.getUsersCount();
    }

    @Post('/refresh')
    async refresh(@Body() body: { refreshToken: string }) {
        return this.userService.refreshToken(body.refreshToken);
    }
    @UseGuards(AuthGuard('jwt'))
    @Post('/info')
    async getUserInfo(@Body() getUserInfoDto: GetUserInfoDto): Promise<User> {
        return this.userService.getUserInfo(getUserInfoDto.userId);
    }
}