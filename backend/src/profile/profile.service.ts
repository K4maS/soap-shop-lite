import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SELECT = {
  id: true,
  phone: true,
  role: true,
  firstName: true,
  lastName: true,
  email: true,
  defaultAddress: true,
  createdAt: true,
};

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  }

  async update(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email уже используется другим аккаунтом');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: SELECT,
    });
  }
}
