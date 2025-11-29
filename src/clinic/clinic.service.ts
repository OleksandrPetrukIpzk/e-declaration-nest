import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Clinic } from './clinic.entity';
import { CreateClinicDto } from './create-clinic.dto';
import { User } from '../user/user.entity';
import { UserRoleEnum } from '../user/enums';
import { UpdateClinicDto } from './edit-clinic.dto';

@Injectable()
export class ClinicService {
  constructor(
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createClinic(
    dto: CreateClinicDto,
    userId: number,
  ): Promise<Clinic | null> {
    const user = await this.usersRepository.findOne({
      where: {
        isActive: true,
        role: UserRoleEnum.Admin,
        id: userId,
      },
      relations: ['clinic'],
    });
    if (user) {
      const clinic = this.clinicRepository.create({
        ...dto,
        createdBy: user,
        clinicAdmins: [user],
      });

      user.clinic = [...(user.clinic || []), clinic];
      await this.usersRepository.save(user);

      return await this.clinicRepository.save(clinic);
    }
    return null;
  }

  async inviteUser(clinicId: number, userId: number): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['invites', 'createdBy'],
    });

    if (!clinic) throw new NotFoundException('Clinic not found');

    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true, role: UserRoleEnum.Admin },
    });
    if (!user) throw new NotFoundException('User not found');

    clinic.invites = clinic.invites || [];
    if (!clinic.invites.find((u) => u.id === user.id)) {
      clinic.invites.push(user);
    }

    return this.clinicRepository.save(clinic);
  }

  async confirmInvite(
    clinicId: number,
    userId: number,
    ownerId: number,
  ): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['invites', 'clinicAdmins', 'createdBy'],
    });
    const owner = await this.usersRepository.findOne({
      where: { id: ownerId },
    });

    if (!clinic) throw new NotFoundException('Clinic not found');
    if (clinic.createdBy.id !== owner.id)
      throw new ForbiddenException('Only creator can confirm');

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    clinic.invites = clinic.invites?.filter((u) => u.id !== user.id) || [];

    clinic.clinicAdmins = clinic.clinicAdmins || [];
    if (!clinic.clinicAdmins.find((u) => u.id === user.id)) {
      clinic.clinicAdmins.push(user);
    }

    const updatedClinic = await this.clinicRepository.save(clinic);
    return updatedClinic;
  }

  async removeInvite(
    clinicId: number,
    userId: number,
    ownerId: number,
  ): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['invites', 'createdBy'],
    });
    const owner = await this.usersRepository.findOne({
      where: { id: ownerId },
    });

    if (!clinic) throw new NotFoundException('Clinic not found');
    if (clinic.createdBy.id !== owner.id)
      throw new ForbiddenException('Only creator can remove invites');

    clinic.invites = clinic.invites?.filter((u) => u.id !== userId) || [];

    return this.clinicRepository.save(clinic);
  }
  async getAllInvitesByCreator(
    clinicId: number,
    userId: number,
  ): Promise<User[]> {
    const clinics = await this.clinicRepository.find({
      where: { id: clinicId, createdBy: { id: userId } },
      relations: ['invites'],
    });

    const allInvites = clinics.flatMap((clinic) => clinic.invites);

    const uniqueInvites = allInvites.filter(
      (invite, index, self) =>
        index === self.findIndex((u) => u.id === invite.id),
    );

    return uniqueInvites;
  }
  async getClinicsByCreator(userId: number): Promise<Clinic[]> {
    return this.clinicRepository
      .createQueryBuilder('clinic')
      .leftJoinAndSelect('clinic.invites', 'invites')
      .leftJoinAndSelect('clinic.clinicAdmins', 'clinicAdmins')
      .leftJoinAndSelect('clinic.createdBy', 'createdBy')
      .leftJoinAndSelect('clinic.clinicWorkers', 'clinicWorkers')
      .where('createdBy.id = :userId', { userId })
      .orWhere('clinicAdmins.id = :userId', { userId })
      .getMany();
  }
  async getActiveClinics(userId: number): Promise<Clinic[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (
      (user && user.role === UserRoleEnum.Hospital) ||
      user.role === UserRoleEnum.Admin
    ) {
      return this.clinicRepository.find({
        where: { isActive: true },
        relations: ['invites', 'clinicWorkers'],
      });
    }
    return null;
  }
  async getAllClinics(userId: number): Promise<Clinic[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, role: UserRoleEnum.Admin || UserRoleEnum.Hospital },
      relations: ['invites', 'clinicWorkers'],
    });
    if (user) {
      return this.clinicRepository.find();
    }
    return null;
  }
  async update(
    id: number,
    dto: UpdateClinicDto,
    userId: number,
  ): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({
      where: { id, createdBy: { id: userId } },
    });
    if (!clinic) {
      throw new NotFoundException(
        'Clinic not found or you dont have permissions',
      );
    }

    Object.assign(clinic, dto);
    return await this.clinicRepository.save(clinic);
  }
  async findOneById(id: number): Promise<Clinic | null> {
    return this.clinicRepository.findOne({
      where: { id },
    });
  }
  async inviteClinicWorker(clinicId: number, userId: number): Promise<any> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
    });
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!clinic) throw new NotFoundException('Clinic not found');
    if (!user) throw new NotFoundException('User not found');

    const userEmail = user.email;
    const clinicName = clinic.clinicName;

    await this.clinicRepository
      .createQueryBuilder()
      .delete()
      .from('clinic_clinic_workers_user')
      .where('user_email = :userEmail AND clinic_name != :clinicName', {
        userEmail,
        clinicName,
      })
      .execute();

    await this.clinicRepository
      .createQueryBuilder()
      .insert()
      .into('clinic_clinic_workers_user')
      .values({ clinic_name: clinicName, user_email: userEmail })
      .orIgnore()
      .execute();

    const updatedClinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['clinicWorkers', 'clinicAdmins'],
    });

    return {
      id: updatedClinic.id,
      isActive: updatedClinic.isActive,
      clinicName: updatedClinic.clinicName,
      clinicAddress: updatedClinic.clinicAddress,
      clinicBio: updatedClinic.clinicBio,
      dateOfCreate: updatedClinic.dateOfCreate,
      clinicWorkers: updatedClinic.clinicWorkers?.map((worker) => ({
        id: worker.id,
        email: worker.email,
        firstName: worker.firstName,
        lastName: worker.lastName,
        profession: worker.profession,
      })),
      clinicAdmins: updatedClinic.clinicAdmins?.map((admin) => ({
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      })),
    };
  }

  async leaveClinic(clinicId: number, userId: number): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
      relations: ['clinicAdmins', 'createdBy'],
    });

    if (!clinic) throw new NotFoundException('Clinic not found');

    const user = await this.usersRepository.findOne({
      where: { id: userId, role: UserRoleEnum.Admin },
    });
    if (!user) throw new NotFoundException('User not found or not an admin');

    if (clinic.createdBy.id === userId) {
      throw new ForbiddenException('Clinic creator cannot leave the clinic');
    }

    const isAdmin = clinic.clinicAdmins?.some((admin) => admin.id === userId);
    if (!isAdmin) {
      throw new ForbiddenException('You are not an admin of this clinic');
    }

    clinic.clinicAdmins = clinic.clinicAdmins.filter(
      (admin) => admin.id !== userId,
    );

    return this.clinicRepository.save(clinic);
  }
}
