import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const devMode = this.config.get('SMS_DEV_MODE') === 'true';

    if (devMode) {
      this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
      return;
    }

    const apiKey = this.config.get('SMS_RU_API_KEY');
    if (!apiKey) {
      this.logger.warn('SMS_RU_API_KEY not set, logging OTP to console');
      this.logger.log(`OTP for ${phone}: ${code}`);
      return;
    }

    try {
      const resp = await axios.get('https://sms.ru/sms/send', {
        params: {
          api_id: apiKey,
          to: phone,
          msg: `Ваш код для входа: ${code}. Никому не сообщайте его.`,
          json: 1,
        },
      });

      if (resp.data?.status !== 'OK') {
        this.logger.error(`SMS send failed: ${JSON.stringify(resp.data)}`);
      }
    } catch (err) {
      this.logger.error(`SMS send error: ${err.message}`);
    }
  }
}
