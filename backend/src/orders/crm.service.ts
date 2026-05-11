import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async notify(orderId: string, event: string, payload: object) {
    const url = this.config.get('CRM_WEBHOOK_URL');

    if (!url) return;

    const body = JSON.stringify({ event, orderId, ...payload, timestamp: new Date().toISOString() });

    const secret = this.config.get('CRM_WEBHOOK_SECRET');
    const signature = secret
      ? crypto.createHmac('sha256', secret).update(body).digest('hex')
      : undefined;

    let status = 'error';
    let response = '';

    try {
      const resp = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'X-Signature': signature }),
        },
        timeout: 5000,
      });
      status = 'success';
      response = String(resp.status);
    } catch (err) {
      response = err.message;
      this.logger.error(`CRM webhook failed for order ${orderId}: ${err.message}`);
    }

    await this.prisma.crmLog.create({
      data: { orderId, event, status, payload, response },
    });
  }
}
