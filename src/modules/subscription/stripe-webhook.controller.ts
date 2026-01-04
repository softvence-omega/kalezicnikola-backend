import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Subscription')
@Controller('stripe-webhook')
export class StripeWebhookController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      return res.status(400).send('Missing stripe-signature');
    }

    try {
      await this.subscriptionService.handleStripeWebhook(req.rawBody, signature);
      return res.status(200).send({ received: true });
    } catch (error) {
      console.error('Webhook Error:', error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
}
