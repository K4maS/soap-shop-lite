import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private sms: SmsService,
  ) {}

  async sendOtp(phone: string) {
    // Rate limit: max 3 OTPs per 10 minutes per phone
    const recentCount = await this.prisma.otpCode.count({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    if (recentCount >= 3) {
      throw new HttpException(
        'Слишком много запросов. Попробуйте через 10 минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Invalidate old OTPs
    await this.prisma.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    await this.sms.sendOtp(phone, code);

    return { message: 'Код отправлен' };
  }

  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('Неверный или истёкший код');
    }

    // Too many attempts → invalidate
    if (otp.attempts >= 3) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { used: true },
      });
      throw new UnauthorizedException('Слишком много попыток. Запросите новый код.');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    if (otp.code !== code) {
      throw new UnauthorizedException('Неверный код');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({ data: { phone } });
    }

    const token = this.jwt.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      token,
      user: { id: user.id, phone: user.phone, role: user.role },
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, role: true, createdAt: true },
    });
  }
}
