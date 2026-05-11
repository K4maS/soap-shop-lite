import {
  Controller, Post, Param, UseGuards, Request, RawBodyRequest,
  Req, Headers, HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('create/:orderId')
  @UseGuards(JwtAuthGuard)
  createPayment(@Param('orderId') orderId: string, @Request() req) {
    return this.payments.createPayment(orderId, req.user.id);
  }

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    return this.payments.handleWebhook(
      (req as any).body,
      (req as any).rawBody,
      signature,
    );
  }
}
