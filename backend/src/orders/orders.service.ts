import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrmService } from './crm.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { Response } from 'express';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private crm: CrmService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Fetch products and validate stock
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Один или несколько товаров недоступны');
    }

    const itemsWithPrice = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Недостаточно товара "${product.name}" на складе`);
      }
      return { ...item, price: Number(product.price) };
    });

    const total = itemsWithPrice.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      // Decrement stock
      for (const item of itemsWithPrice) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          userId,
          total,
          address: dto.address,
          phone: dto.phone,
          name: dto.name,
          comment: dto.comment,
          items: {
            create: itemsWithPrice.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });
    });

    // Notify CRM async (don't block response)
    this.crm.notify(order.id, 'order.created', {
      total,
      address: dto.address,
      name: dto.name,
      phone: dto.phone,
      itemsCount: dto.items.length,
    });

    return order;
  }

  findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: { include: { product: true } },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { phone: true } },
        items: { include: { product: { select: { name: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
    });

    this.crm.notify(id, 'order.status_changed', { status });

    return updated;
  }

  async exportCsv(res: Response) {
    const orders = await this.prisma.order.findMany({
      include: {
        user: { select: { phone: true } },
        items: { include: { product: { select: { name: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = [
      ['ID', 'Дата', 'Покупатель', 'Телефон', 'Адрес', 'Сумма', 'Статус', 'Оплата', 'Товары'].join(';'),
      ...orders.map((o) =>
        [
          o.id,
          o.createdAt.toISOString(),
          o.name,
          o.phone,
          `"${o.address}"`,
          o.total.toString(),
          o.status,
          o.payment?.status || 'N/A',
          `"${o.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}"`,
        ].join(';'),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send('﻿' + rows); // BOM for Excel
  }
}
