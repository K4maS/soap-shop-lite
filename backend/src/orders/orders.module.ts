import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CrmService } from './crm.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, CrmService],
  exports: [OrdersService],
})
export class OrdersModule {}
