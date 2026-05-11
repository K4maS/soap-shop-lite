import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  async createPayment(orderId: string, userId: string) {
    const order = await this.ordersService.findOne(orderId, userId);
    if (!order) throw new NotFoundException('Заказ не найден');

    const existing = await this.prisma.payment.findUnique({ where: { orderId } });
    if (existing?.status === 'PAID') {
      throw new BadRequestException('Заказ уже оплачен');
    }

    const shopId = this.config.get('YOOKASSA_SHOP_ID');
    const secretKey = this.config.get('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      // Dev mode: create mock payment
      const payment = await this.prisma.payment.upsert({
        where: { orderId },
        update: { status: 'PENDING', confirmUrl: `${this.config.get('FRONTEND_URL')}/orders` },
        create: {
          orderId,
          status: 'PENDING',
          amount: order.total,
          confirmUrl: `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/orders`,
        },
      });
      return { confirmUrl: payment.confirmUrl, paymentId: payment.id };
    }

    const idempotenceKey = uuidv4();
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';

    const resp = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount: { value: Number(order.total).toFixed(2), currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: `${frontendUrl}/orders/${orderId}`,
        },
        capture: true,
        description: `Заказ #${orderId.slice(0, 8)}`,
        metadata: { orderId },
      },
      {
        auth: { username: shopId, password: secretKey },
        headers: {
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json',
        },
      },
    );

    const yk = resp.data;

    await this.prisma.payment.upsert({
      where: { orderId },
      update: {
        yookassaId: yk.id,
        status: 'PENDING',
        confirmUrl: yk.confirmation.confirmation_url,
      },
      create: {
        orderId,
        yookassaId: yk.id,
        status: 'PENDING',
        amount: order.total,
        confirmUrl: yk.confirmation.confirmation_url,
      },
    });

    return { confirmUrl: yk.confirmation.confirmation_url, paymentId: yk.id };
  }

  async handleWebhook(body: any, rawBody: Buffer, signature: string) {
    // Verify IP or signature in production — YooKassa sends from fixed IPs
    // For simplicity we trust the payload here; add IP allowlist in nginx/infra
    const event = body?.event;
    const object = body?.object;

    if (!object?.id) return { ok: true };

    this.logger.log(`YooKassa webhook: ${event} for payment ${object.id}`);

    const payment = await this.prisma.payment.findUnique({
      where: { yookassaId: object.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for yookassaId ${object.id}`);
      return { ok: true };
    }

    if (event === 'payment.succeeded') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID' },
      });
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' },
      });
    } else if (event === 'payment.canceled') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    return { ok: true };
  }
}
