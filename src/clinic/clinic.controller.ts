import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { CreateClinicDto } from './create-clinic.dto';
import { Clinic } from './clinic.entity';
import { JwtAuthGuard } from '../jwt/jwt.auth.guard';
import { CurrentUser } from '../decorators/user.decorator';
import { GetUserInfoDto } from '../user/dtos';
import { User } from '../user/user.entity';
import { UpdateClinicDto } from './edit-clinic.dto';

@Controller('clinic')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @UseGuards(JwtAuthGuard)
  @Post('/create')
  create(
    @Body() createClinicDto: CreateClinicDto,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic> {
    return this.clinicService.createClinic(
      createClinicDto,
      getUserInfoDto.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/invite')
  invite(
    @Body('clinicId') clinicId: number,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic> {
    return this.clinicService.inviteUser(clinicId, getUserInfoDto.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/invite/confirm')
  inviteConfirm(
    @Body('clinicId') clinicId: number,
    @Body('userId') userId: number,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic> {
    return this.clinicService.confirmInvite(
      clinicId,
      userId,
      getUserInfoDto.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/join-to-clinic')
  joinToClinic(
    @Body('clinicId') clinicId: number,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic> {
    return this.clinicService.inviteClinicWorker(
      clinicId,
      getUserInfoDto.userId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('/invite/reject')
  inviteReject(
    @Body('clinicId') clinicId: number,
    @Body('userId') userId: number,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic> {
    return this.clinicService.removeInvite(
      clinicId,
      userId,
      getUserInfoDto.userId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('/invite/get')
  getAllInvites(
    @Body('clinicId') clinicId: number,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<User[]> {
    return this.clinicService.getAllInvitesByCreator(
      clinicId,
      getUserInfoDto.userId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('/get')
  getUserClinics(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic[]> {
    return this.clinicService.getClinicsByCreator(getUserInfoDto.userId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('/get-active')
  getClinics(@CurrentUser() getUserInfoDto: GetUserInfoDto): Promise<Clinic[]> {
    return this.clinicService.getActiveClinics(getUserInfoDto.userId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('/get-all')
  getAllClinics(
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ): Promise<Clinic[]> {
    return this.clinicService.getAllClinics(getUserInfoDto.userId);
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateClinic(
    @Param('id') id: string,
    @Body() updateClinicDto: UpdateClinicDto,
    @CurrentUser() getUserInfoDto: GetUserInfoDto,
  ) {
    return this.clinicService.update(
      +id,
      updateClinicDto,
      getUserInfoDto.userId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getClinicById(@Param('id') id: string) {
    const clinic = await this.clinicService.findOneById(+id);
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }
}
