import { UserService } from './user.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { createProfileDto } from './create-profile.dto';
import { User } from './user.entity';
import { GetUserInfoDto } from './dtos';
import { JwtAuthGuard } from '../jwt/jwt.auth.guard';
import { CurrentUser } from '../decorators/user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/create')
  create(@Body() createProfileDto: createProfileDto): Promise<User> {
    return this.userService.createUser(createProfileDto);
  }

  @Post('/login')
  loginUser(@Body() createProfileDto: createProfileDto): Promise<User> {
    return this.userService.loginUser(createProfileDto);
  }
  @Get('/count')
  getUsersCount(): Promise<number> {
    return this.userService.getUsersCount();
  }

  @Post('/refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.userService.refreshToken(body.refreshToken);
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getUserInfo(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<User> {
    return this.userService.getUserInfo(getUserInfoDto.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('provider-active-list')
  async getProviderList(): Promise<User[] | null> {
    return this.userService.getActiveProviderList();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin-active-list')
  async getAdminList(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<User[] | null> {
    return this.userService.getActiveAdminList(getUserInfoDto.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('provider-list')
  async getAllProviderList(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<User[] | null> {
    return this.userService.getAllProviderList(getUserInfoDto.role);
  }
  @UseGuards(JwtAuthGuard)
  @Get('admin-list')
  async getAllAdminList(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<User[] | null> {
    return this.userService.getAllAdminList(getUserInfoDto.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('connect-users')
  async connectUsers(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
    userId: number,
  ): Promise<{ message: string }> {
    return this.userService.connectUsers(getUserInfoDto.userId, userId);
  }
}
