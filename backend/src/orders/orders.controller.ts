import {
  Controller, Get, Post, Patch,
  Param, Body, UseGuards, Request, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/admin.guard';

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() dto: CreateOrderDto) {
    return this.orders.create(req.user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  myOrders(@Request() req) {
    return this.orders.findByUser(req.user.id);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  myOrder(@Param('id') id: string, @Request() req) {
    return this.orders.findOne(id, req.user.id);
  }

  // Admin routes
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll() {
    return this.orders.findAll();
  }

  @Get('export/csv')
  @UseGuards(JwtAuthGuard, AdminGuard)
  exportCsv(@Res() res: Response) {
    return this.orders.exportCsv(res);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
