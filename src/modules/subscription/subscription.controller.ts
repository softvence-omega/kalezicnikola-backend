import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Request,
  Query,
  Put,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UpdatePlanDetailsDto } from './dto/update-plan-details.dto';
import { JwtAuthGuard } from '../../common/guard/auth.guard';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available subscription plans with pricing and features',
  })
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update plan details by ID (name, price, minutes, features)' })
  @ApiResponse({
    status: 200,
    description: 'Plan details updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid plan ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async updatePlanDetails(
    @Param('id') id: string,
    @Body() updatePlanDetailsDto: UpdatePlanDetailsDto,
  ) {
    return this.subscriptionService.updatePlanDetailsById(id, updatePlanDetailsDto);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid plan type or payment method',
  })
  async createSubscription(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    const userId = req.user.id;
    return this.subscriptionService.createSubscription(userId, createSubscriptionDto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current subscription details' })
  @ApiResponse({
    status: 200,
    description: 'Returns current subscription details including minutes used and remaining',
  })
  @ApiResponse({
    status: 404,
    description: 'No subscription found for this user',
  })
  async getCurrentSubscription(@Request() req) {
    const userId = req.user.id;
    return this.subscriptionService.getCurrentSubscription(userId);
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel current subscription permanently' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  async cancelSubscription(@Request() req) {
    const userId = req.user.id;
    return this.subscriptionService.cancelSubscription(userId);
  }

  @Post('upgrade/checkout')
  @ApiOperation({ summary: 'Create checkout session for upgrading/downgrading plan' })
  @ApiResponse({
    status: 201,
    description: 'Returns checkout session URL for new plan',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan type or no active subscription',
  })
  async createUpgradeCheckout(@Request() req, @Query('planType') planType: string) {
    const userId = req.user.id;
    return this.subscriptionService.createUpgradeCheckout(userId, planType);
  }

  @Get('upgrade/confirm')
  @ApiOperation({ summary: 'Confirm upgrade and cancel old subscription after successful payment' })
  @ApiResponse({
    status: 200,
    description: 'Subscription upgraded successfully, old subscription cancelled',
  })
  @ApiResponse({
    status: 400,
    description: 'Payment not completed or invalid session',
  })
  async confirmUpgrade(@Query('session_id') sessionId: string) {
    return this.subscriptionService.confirmUpgrade(sessionId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get subscription transaction history/invoices' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of invoices for the user',
  })
  @ApiResponse({
    status: 404,
    description: 'No customer found',
  })
  async getInvoices(@Request() req) {
    const userId = req.user.id;
    return this.subscriptionService.getInvoices(userId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({
    status: 201,
    description: 'Returns checkout session URL',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan type',
  })
  async createCheckoutSession(@Request() req, @Query('planType') planType: string) {
    const userId = req.user.id;
    return this.subscriptionService.createCheckoutSession(userId, planType);
  }

  @Get('success')
  @ApiOperation({ summary: 'Handle successful checkout and complete subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Payment not completed or invalid session',
  })
  @ApiResponse({
    status: 404,
    description: 'Checkout session not found',
  })
  async handleSuccess(@Query('session_id') sessionId: string) {
    return this.subscriptionService.completeSubscription(sessionId);
  }
}
