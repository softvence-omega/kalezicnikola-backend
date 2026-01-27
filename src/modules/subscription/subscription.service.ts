import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UpdatePlanDetailsDto } from './dto/update-plan-details.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
      {
        apiVersion: '2025-11-17.clover',
      },
    );
  }

  async onModuleInit() {
    await this.seedSubscriptionPlans();
  }

  // Seed subscription plans on startup
  private async seedSubscriptionPlans() {
    try {
      const defaultPlans = [
        // TRIAL PLANS
        {
          planType: 'TRIAL' as const,
          billingCycle: 'LIFETIME' as const,
          name: 'Trial Lifetime',
          price: 0,
          stripePriceId: 'trial_no_stripe', // Placeholder, won't be used
          minutes: 8000, // Same as Enterprise
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '8000 call minutes / month included',
            '€0.25 per extra minute',
            'Multilingual (25+ languages)',
            '24/7 Premium support',
            '✨ Lifetime access',
          ],
        },
        {
          planType: 'TRIAL' as const,
          billingCycle: 'SEVEN_DAYS' as const,
          name: 'Trial 7 Days',
          price: 0,
          stripePriceId: 'trial_7_days_no_stripe',
          minutes: 500,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '500 call minutes / month included',
            '€0.25 per extra minute',
            'Multilingual (25+ languages)',
            '24/7 Premium support',
            '7 Days of Trial',
          ],
        },
        // BASIC PLANS
        {
          planType: 'BASIC' as const,
          billingCycle: 'ONETIME' as const,
          name: 'Basic Onetime',
          price: 279,
          stripePriceId:
            this.configService.get<string>('STRIPE_BASIC_ONETIME_PRICE_ID') ||
            'basic_onetime_no_stripe',
          minutes: 1000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '1000 call minutes included',
            'Multilingual (25+ languages)',
            '24/7 Premium support',
            '1 Month Access',
          ],
        },
        // STANDARD PLANS
        {
          planType: 'STANDARD' as const,
          billingCycle: 'MONTHLY' as const,
          name: 'Standard Monthly',
          price: 399,
          stripePriceId:
            this.configService.get<string>(
              'STRIPE_STANDARD_MONTHLY_PRICE_ID',
            ) || 'price_standard_monthly_placeholder',
          minutes: 2000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '2000 call minutes / month included',
            '€0.35 per extra minute',
            'Email support',
          ],
        },
        {
          planType: 'STANDARD' as const,
          billingCycle: 'YEARLY' as const,
          name: 'Standard Yearly',
          price: 339,
          stripePriceId:
            this.configService.get<string>('STRIPE_STANDARD_YEARLY_PRICE_ID') ||
            'price_standard_yearly_placeholder',
          minutes: 2000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '2000 call minutes / month included',
            '€0.35 per extra minute',
            'Email support',
          ],
        },
        // PREMIUM PLANS
        {
          planType: 'PREMIUM' as const,
          billingCycle: 'MONTHLY' as const,
          name: 'Premium Monthly',
          price: 899,
          stripePriceId:
            this.configService.get<string>('STRIPE_PREMIUM_MONTHLY_PRICE_ID') ||
            'price_premium_monthly_placeholder',
          minutes: 4000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '4000 call minutes / month included',
            '€0.30 per extra minute',
            'Multilingual (25+ languages)',
            'Prioritized email and live chat support',
          ],
        },
        {
          planType: 'PREMIUM' as const,
          billingCycle: 'YEARLY' as const,
          name: 'Premium Yearly',
          price: 765,
          stripePriceId:
            this.configService.get<string>('STRIPE_PREMIUM_YEARLY_PRICE_ID') ||
            'price_premium_yearly_placeholder',
          minutes: 4000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '4000 call minutes / month included',
            '€0.30 per extra minute',
            'Multilingual (25+ languages)',
            'Prioritized email and live chat support',
          ],
        },
        // ENTERPRISE PLANS
        {
          planType: 'ENTERPRISE' as const,
          billingCycle: 'MONTHLY' as const,
          name: 'Enterprise Monthly',
          price: 1299,
          stripePriceId:
            this.configService.get<string>(
              'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID',
            ) || 'price_enterprise_monthly_placeholder',
          minutes: 8000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '8000 call minutes / month included',
            '€0.25 per extra minute',
            'Multilingual (25+ languages)',
            '24/7 Premium support',
          ],
        },
        {
          planType: 'ENTERPRISE' as const,
          billingCycle: 'YEARLY' as const,
          name: 'Enterprise Yearly',
          price: 1105,
          stripePriceId:
            this.configService.get<string>(
              'STRIPE_ENTERPRISE_YEARLY_PRICE_ID',
            ) || 'price_enterprise_yearly_placeholder',
          minutes: 8000,
          features: [
            'AI Agent creation & setup',
            '24/7 availability & call logging',
            'Intelligent triage & task creation',
            '8000 call minutes / month included',
            '€0.25 per extra minute',
            'Multilingual (25+ languages)',
            '24/7 Premium support',
          ],
        },
      ];

      let created = 0;
      let skipped = 0;

      for (const plan of defaultPlans) {
        await this.prisma.subscriptionPlan.upsert({
          where: {
            planType_billingCycle: {
              planType: plan.planType,
              billingCycle: plan.billingCycle,
            },
          },
          update: plan,
          create: plan,
        });

        const existingPlan = await this.prisma.subscriptionPlan.findUnique({
          where: {
            planType_billingCycle: {
              planType: plan.planType,
              billingCycle: plan.billingCycle,
            },
          },
        });

        if (existingPlan && existingPlan.createdAt.getTime() === existingPlan.updatedAt.getTime()) {
          created++;
          console.log(
            `✅ Created plan: ${plan.planType} (${plan.billingCycle})`,
          );
        } else {
          skipped++;
          console.log(
            `🆙 Updated plan: ${plan.planType} (${plan.billingCycle})`,
          );
        }
      }

      console.log(`\n📊 Subscription Plans Seeding Summary:`);
      console.log(`   - Total Processed: ${defaultPlans.length}`);
      console.log(`   - Created: ${created}`);
      console.log(`   - Skipped: ${skipped}`);
      console.log(`   - Total Expected: ${defaultPlans.length}\n`);
    } catch (error) {
      console.error('❌ Error seeding subscription plans:', error.message);
    }
  }

  // Get all available plans
  async getPlans() {
    const dbPlans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return {
      productId: this.configService.get<string>('STRIPE_PRODUCT_ID'),
      plans: dbPlans.map((plan) => ({
        id: plan.id,
        type: plan.planType,
        name: plan.name,
        price: plan.price,
        priceId: plan.stripePriceId,
        minutes: plan.minutes,
        features: plan.features,
      })),
    };
  }

  // Update plan details by ID
  async updatePlanDetailsById(
    id: string,
    updatePlanDetailsDto: UpdatePlanDetailsDto,
  ) {
    const { name, price, priceId, minutes, features } = updatePlanDetailsDto;

    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new NotFoundException('Plan not found');
    }

    // Update in database
    const updatedPlan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(priceId !== undefined && { stripePriceId: priceId }),
        ...(minutes !== undefined && { minutes }),
        ...(features !== undefined && { features }),
      },
    });

    return {
      message: 'Plan details updated successfully',
      planType: updatedPlan.planType,
      updatedPlan: {
        id: updatedPlan.id,
        name: updatedPlan.name,
        price: updatedPlan.price,
        priceId: updatedPlan.stripePriceId,
        minutes: updatedPlan.minutes,
        features: updatedPlan.features,
      },
    };
  }

  // Archive current subscription to history
  private async archiveCurrentSubscription(userId: string) {
    const currentSubscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (currentSubscription && currentSubscription.planType) {
      await this.prisma.subscriptionHistory.create({
        data: {
          userId: currentSubscription.userId!,
          planType: currentSubscription.planType,
          billingCycle: currentSubscription.billingCycle!,
          status: currentSubscription.status!,
          minutesAllocated: currentSubscription.minutesAllocated || 0,
          minutesUsed: currentSubscription.minutesUsed || 0,
          extraMinutes: currentSubscription.extraMinutes || 0,
          startDate: currentSubscription.currentPeriodStart || new Date(),
          endDate: currentSubscription.currentPeriodEnd,
          archivedAt: new Date(),
        },
      });
      console.log(`📦 Archived subscription for user ${userId}`);
    }
  }

  // Check if user is eligible to purchase the BASIC plan (limited to once per account and new users only)
  private async checkBasicPlanEligibility(userId: string) {
    const paidPlans = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];

    // Check current subscription
    const currentSub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { planType: true },
    });

    if (currentSub?.planType && paidPlans.includes(currentSub.planType)) {
      throw new BadRequestException(
        'The Basic plan is only available for new customers who have not previously purchased a paid plan.',
      );
    }

    // Check history
    const pastSub = await this.prisma.subscriptionHistory.findFirst({
      where: {
        userId,
        planType: { in: paidPlans as any },
      },
    });

    if (pastSub) {
      throw new BadRequestException(
        'The Basic plan is only available for new customers who have not previously purchased a paid plan.',
      );
    }
  }

  // Assign Trial Plan (Admin only, no Stripe integration)
  async assignTrialPlan(
    userId: string,
    adminId?: string,
    dto: { trialType?: 'LIFETIME' | 'SEVEN_DAYS'; startDate?: string } = {},
  ) {
    try {
      // Verify user exists
      const user = await this.prisma.doctor.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get trial plan details from database
      const trialPlan = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: 'TRIAL',
            billingCycle: !dto.trialType || dto.trialType === 'LIFETIME' ? 'LIFETIME' : 'SEVEN_DAYS',
          },
        },
      });

      if (!trialPlan) {
        throw new NotFoundException(
          'Trial plan not found. Please ensure the database is seeded.',
        );
      }

      // Check if user already has a subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      // Determine trial settings based on input
      // Default to LIFETIME for backward compatibility if not specified
      const isLifetime = !dto.trialType || dto.trialType === 'LIFETIME';
      const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

      // Set period end based on type
      let currentPeriodEnd: Date;
      if (isLifetime) {
        currentPeriodEnd = new Date('2099-12-31T23:59:59Z');
      } else {
        // SEVEN_DAYS
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        currentPeriodEnd = endDate;
      }

      if (existingSubscription) {
        // [NEW] Archive old plan before overwriting
        await this.archiveCurrentSubscription(userId);

        // Update existing subscription to trial plan
        const updatedSubscription = await this.prisma.subscription.update({
          where: { userId },
          data: {
            planType: 'TRIAL',
            billingCycle: isLifetime ? 'LIFETIME' : 'SEVEN_DAYS',
            status: 'ACTIVE',
            minutesAllocated: trialPlan.minutes,
            minutesUsed: 0,
            extraMinutes: 0, // Reset extra minutes
            currentPeriodStart: startDate,
            currentPeriodEnd: currentPeriodEnd,
            cancelledAt: null,
            isActive: true,
            // Clear Stripe IDs since trial doesn't use Stripe
            stripeCustomerId: existingSubscription.stripeCustomerId, // Keep customer ID if exists
            stripeSubscriptionId: null,
          },
        });

        console.log(
          `✅ ${isLifetime ? 'Lifetime' : '7-Day'} trial plan assigned to existing user: ${user.email} by admin: ${adminId || 'system'}`,
        );

        return {
          success: true,
          message: `${isLifetime ? 'Lifetime' : '7-Day'} trial plan assigned successfully`,
          subscription: {
            userId: updatedSubscription.userId,
            planType: updatedSubscription.planType,
            billingCycle: updatedSubscription.billingCycle,
            status: updatedSubscription.status,
            minutesAllocated: updatedSubscription.minutesAllocated,
            features: trialPlan.features,
            accessMessage: isLifetime
              ? '✨ Lifetime access - No expiration'
              : `Trial ends on ${currentPeriodEnd.toLocaleDateString()}`,
          },
        };
      } else {
        // Create new subscription with trial plan
        const newSubscription = await this.prisma.subscription.create({
          data: {
            userId,
            planType: 'TRIAL',
            billingCycle: isLifetime ? 'LIFETIME' : 'SEVEN_DAYS',
            status: 'ACTIVE',
            minutesAllocated: trialPlan.minutes,
            minutesUsed: 0,
            extraMinutes: 0,
            currentPeriodStart: startDate,
            currentPeriodEnd: currentPeriodEnd,
            isActive: true,
            // No Stripe IDs for trial plans
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        });

        console.log(
          `✅ ${isLifetime ? 'Lifetime' : '7-Day'} trial plan assigned to new user: ${user.email} by admin: ${adminId || 'system'}`,
        );

        return {
          success: true,
          message: `${isLifetime ? 'Lifetime' : '7-Day'} trial plan assigned successfully`,
          subscription: {
            userId: newSubscription.userId,
            planType: newSubscription.planType,
            billingCycle: newSubscription.billingCycle,
            status: newSubscription.status,
            minutesAllocated: newSubscription.minutesAllocated,
            features: trialPlan.features,
            accessMessage: isLifetime
              ? '✨ Lifetime access - No expiration'
              : `Trial ends on ${currentPeriodEnd.toLocaleDateString()}`,
          },
        };
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to assign trial plan: ${error.message}`,
      );
    }
  }

  // Cancel Trial Plan (Admin only)
  async cancelTrialPlan(userId: string, adminId?: string) {
    try {
      // Verify user exists
      const user = await this.prisma.doctor.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user has an active subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!existingSubscription) {
        throw new NotFoundException('No subscription found for this user');
      }

      // Ensure it is a trial plan to avoid corrupting Stripe state
      if (existingSubscription.planType !== 'TRIAL') {
        throw new BadRequestException(
          'User is not on a trial plan. Cannot cancel paid subscriptions via this endpoint.',
        );
      }

      // Update subscription to CANCELLED
      const updatedSubscription = await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELLED',
          isActive: false,
          cancelledAt: new Date(),
          currentPeriodEnd: new Date(), // Expire immediately
        },
      });

      console.log(
        `✅ Trial plan cancelled for user: ${user.email} by admin: ${adminId || 'system'}`,
      );

      return {
        success: true,
        message: 'Trial plan cancelled successfully',
        subscription: {
          userId: updatedSubscription.userId,
          status: updatedSubscription.status,
          cancelledAt: updatedSubscription.cancelledAt,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to cancel trial plan: ${error.message}`,
      );
    }
  }

  // Create a new subscription
  async createSubscription(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ) {
    try {
      const { planType, billingCycle, paymentMethodId } = createSubscriptionDto;

      // Get plan from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Check eligibility for BASIC plan
      if (planType === 'BASIC') {
        await this.checkBasicPlanEligibility(userId);
      }

      // Create or retrieve customer
      const user = await this.prisma.doctor.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new BadRequestException('User email not found');
      }

      let customer: Stripe.Customer;
      const existingCustomers = await this.stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planDetails.stripePriceId }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status,
        planType,
        minutesAllocated: planDetails.minutes,
        minutesUsed: 0,
        minutesRemaining: planDetails.minutes,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
        clientSecret: (subscription.latest_invoice as any)?.payment_intent
          ?.client_secret,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Get current subscription
  async getCurrentSubscription(userId: string) {
    try {
      // Get subscription from database
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription || !subscription.planType) {
        throw new NotFoundException('No subscription found for this user');
      }

      // Get plan details from database
      const searchBillingCycle = subscription.billingCycle || 'MONTHLY';

      const planDetails = await this.prisma.subscriptionPlan.findFirst({
        where: {
          planType: subscription.planType as any,
          billingCycle: searchBillingCycle as any,
        },
      });

      if (!planDetails) {
        throw new NotFoundException('Plan details not found');
      }

      const minutesAllocated = subscription.minutesAllocated || 0;
      const minutesUsed = subscription.minutesUsed || 0;

      // Check if this is a trial plan
      const isTrialPlan = subscription.planType === 'TRIAL';

      // Check if subscription is cancelled but still accessible
      const isAccessible =
        subscription.currentPeriodEnd &&
        new Date() < subscription.currentPeriodEnd;
      const isCancelled =
        subscription.status === 'CANCELLED' &&
        subscription.cancelledAt !== null;

      return {
        subscriptionId: subscription.stripeSubscriptionId,
        customerId: subscription.stripeCustomerId,
        status: subscription.status,
        planType: planDetails.planType,
        planName: planDetails.name,
        price: planDetails.price,
        minutesAllocated: minutesAllocated,
        minutesUsed: minutesUsed,
        minutesRemaining: minutesAllocated - minutesUsed,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        features: planDetails.features,
        // Trial plan specific info
        isTrialPlan: isTrialPlan,
        billingCycle: subscription.billingCycle,
        // Cancellation info
        isCancelled: isCancelled,
        cancelledAt: subscription.cancelledAt,
        isAccessible: isCancelled ? isAccessible : true, // If cancelled, check if still accessible
        accessMessage:
          isTrialPlan && subscription.currentPeriodEnd
            ? subscription.currentPeriodEnd > new Date('2090-01-01')
              ? '✨ Lifetime access - No expiration'
              : `Trial ends on ${subscription.currentPeriodEnd.toLocaleDateString()}`
            : isCancelled && isAccessible
              ? `Your subscription has been cancelled but you can continue using it until ${subscription.currentPeriodEnd?.toLocaleDateString()}`
              : isCancelled && !isAccessible
                ? 'Your subscription has expired'
                : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string) {
    try {
      // Get subscription from database
      const dbSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!dbSubscription || !dbSubscription.stripeSubscriptionId) {
        throw new NotFoundException('No subscription found for this user');
      }

      // Cancel subscription in Stripe (at period end)
      const stripeSubscription = await this.stripe.subscriptions.update(
        dbSubscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true, // Cancel at the end of billing period
        },
      );

      const subscriptionData = stripeSubscription as any;
      const periodEnd = subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000)
        : dbSubscription.currentPeriodEnd;

      // Update database - mark as cancelled but keep active until period end
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          cancelledAt: new Date(), // Record when user requested cancellation
          status: 'CANCELLED', // Mark as cancelled
          // Keep currentPeriodEnd as is - user can still use until this date
        },
      });

      return {
        message:
          'Subscription cancelled successfully. You can continue to use your plan until the end of your billing period.',
        subscriptionId: stripeSubscription.id,
        status: 'CANCELLED',
        accessUntil: periodEnd,
        cancelledAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async createUpgradeCheckout(
    userId: string,
    planType: string,
    billingCycle: string = 'MONTHLY',
  ) {
    try {
      // Check if user has an active subscription
      const currentSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!currentSubscription) {
        throw new BadRequestException(
          'No active subscription found. Please create a subscription first.',
        );
      }

      // Get user email from database
      const user = await this.prisma.doctor.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new BadRequestException('User email not found');
      }

      // Get new plan from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Check eligibility for BASIC plan
      if (planType === 'BASIC') {
        await this.checkBasicPlanEligibility(userId);
      }

      // Check if it's the same plan
      const currentBillingCycle = currentSubscription.billingCycle || 'MONTHLY';
      if (
        currentSubscription.planType === planType &&
        currentBillingCycle === billingCycle
      ) {
        throw new BadRequestException(
          'You are already subscribed to this plan',
        );
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: planDetails.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/upgrade/success?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/cancelled?status=fail`,
        customer_email: user.email,
        metadata: {
          userId,
          planType,
          billingCycle,
          isUpgrade: 'true',
          oldSubscriptionId: currentSubscription.stripeSubscriptionId || '',
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
        message:
          'Checkout session created. Complete payment to upgrade/downgrade your plan.',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Confirm upgrade after successful payment
  async confirmUpgrade(sessionId: string) {
    try {
      // Retrieve the checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        throw new NotFoundException('Checkout session not found');
      }

      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment not completed');
      }

      if (!session.metadata || session.metadata.isUpgrade !== 'true') {
        throw new BadRequestException('This is not an upgrade session');
      }

      const userId = session.metadata.userId;
      const planType = session.metadata.planType;
      const billingCycle = session.metadata.billingCycle || 'MONTHLY';
      const oldSubscriptionId = session.metadata.oldSubscriptionId;

      // Get plan details from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Get the new subscription from Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ['latest_invoice', 'customer'] },
      );

      // Extract period dates safely with type casting
      const subscriptionData = stripeSubscription as any;
      const periodStart = subscriptionData.current_period_start
        ? new Date(subscriptionData.current_period_start * 1000)
        : new Date();
      const periodEnd = subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Map Stripe status to SubscriptionStatus enum
      const mapStripeStatus = (stripeStatus: string) => {
        const statusMap: { [key: string]: string } = {
          active: 'ACTIVE',
          past_due: 'PAST_DUE',
          canceled: 'CANCELLED',
          cancelled: 'CANCELLED',
          unpaid: 'PAST_DUE',
          incomplete: 'PENDING',
          incomplete_expired: 'CANCELLED',
          trialing: 'ACTIVE',
        };
        return statusMap[stripeStatus] || 'PENDING';
      };

      // Cancel old subscription in Stripe if it exists
      if (oldSubscriptionId && oldSubscriptionId !== '') {
        try {
          console.log(
            `🔄 Attempting to cancel old subscription: ${oldSubscriptionId}`,
          );
          const cancelledSub =
            await this.stripe.subscriptions.cancel(oldSubscriptionId);
          console.log(
            `✅ Old subscription cancelled successfully: ${cancelledSub.id}, status: ${cancelledSub.status}`,
          );
        } catch (error) {
          console.error('❌ Error cancelling old subscription:', error.message);
          // Continue anyway - new subscription is already created
        }
      } else {
        console.warn('⚠️ No old subscription ID found in metadata to cancel');
      }

      // [NEW] Archive old plan before overwriting
      await this.archiveCurrentSubscription(userId);

      // Update subscription in database
      const subscription = await this.prisma.subscription.update({
        where: { userId },
        data: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          planType: planType as any,
          billingCycle: billingCycle as any,
          status: mapStripeStatus(stripeSubscription.status) as any,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          minutesAllocated: planDetails.minutes,
          minutesUsed: 0, // Reset minutes on upgrade
          extraMinutes: 0, // Reset extra minutes
          cancelledAt: null,
        },
      });

      return {
        success: true,
        message:
          'Subscription upgraded successfully! Old subscription has been cancelled.',
        subscription: {
          ...subscription,
          plan: planDetails,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Get invoices/transactions
  async getInvoices(userId: string, role: string = 'DOCTOR') {
    try {
      const isAdmin = role.toUpperCase() === 'ADMIN';

      if (isAdmin) {
        const invoices = await this.stripe.invoices.list({ limit: 100 });
        return invoices.data.map((invoice) => ({
          date: new Date(invoice.created * 1000),
          name: invoice.customer_name || invoice.customer_email || 'Customer',
          transactionId: invoice.number,
          status: invoice.status?.toUpperCase() || 'UNKNOWN',
          amount: parseFloat((invoice.amount_paid / 100).toFixed(2)),
          currency: 'EUR', // Force EUR as requested
          invoiceUrl: invoice.hosted_invoice_url,
        }));
      }

      const customers = await this.stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });

      if (customers.data.length === 0) {
        throw new NotFoundException('No customer found for this user');
      }

      const customer = customers.data[0];
      const invoices = await this.stripe.invoices.list({
        customer: customer.id,
        limit: 20,
      });

      return invoices.data.map((invoice) => ({
        date: new Date(invoice.created * 1000),
        name: customer.name || 'Customer',
        transactionId: invoice.number,
        status: invoice.status?.toUpperCase() || 'UNKNOWN',
        amount: parseFloat((invoice.amount_paid / 100).toFixed(2)),
        currency: 'EUR', // Force EUR as requested
        invoiceUrl: invoice.hosted_invoice_url,
      }));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  // Get all user purchases/transactions
  async getUserPurchases(userId: string, role: string = 'DOCTOR') {
    try {
      const isAdmin = role.toUpperCase() === 'ADMIN';

      // Get user's subscription record (needed for customerId)
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
        select: {
          id: true,
          planType: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
          stripeCustomerId: true,
        },
      });

      let stripeCustomerId = subscription?.stripeCustomerId;
      if (!stripeCustomerId && !isAdmin) {
        // Only search for customerId if not admin and missing
        const customers = await this.stripe.customers.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 1,
        });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        }
      }

      // Get Stripe invoices
      let stripeInvoices: any[] = [];
      try {
        if (isAdmin) {
          // Admin sees all invoices - use auto-paging to get all history
          const allInvoices: any[] = [];

          // Using a higher limit per page and auto-paging
          for await (const invoice of this.stripe.invoices.list({ limit: 100 })) {
            allInvoices.push({
              date: new Date(invoice.created * 1000),
              name: invoice.customer_name || invoice.customer_email || 'Customer',
              email: invoice.customer_email || 'N/A',
              transactionId: invoice.number || invoice.id,
              stripeInvoiceId: invoice.id,
              stripeCustomerId: invoice.customer as string,
              status:
                invoice.status === 'paid'
                  ? 'Paid'
                  : invoice.status === 'open'
                    ? 'Pending'
                    : 'Failed',
              payAmount: `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency.toUpperCase(),
              invoiceUrl: invoice.hosted_invoice_url,
              planType: invoice.lines.data[0]?.description || 'Subscription',
            });

            // Safety break if there are thousands of invoices to prevent memory issues
            if (allInvoices.length >= 1000) break;
          }
          stripeInvoices = allInvoices;
        } else {
          // Doctor sees only their invoices
          // Fetch doctor's email
          const doctor = await this.prisma.doctor.findUnique({
            where: { id: userId },
            select: { email: true },
          });

          if (!doctor || !doctor.email) {
            throw new NotFoundException('Doctor or email not found');
          }

          // Search for ALL customers with this email to catch multiple accounts/guest checkouts
          const customersByEmail = await this.stripe.customers.list({
            email: doctor.email,
            limit: 10,
          });

          const customerIds = customersByEmail.data.map((c) => c.id);

          // Also include the one from subscription record if not present
          if (stripeCustomerId && !customerIds.includes(stripeCustomerId)) {
            customerIds.push(stripeCustomerId);
          }

          if (customerIds.length > 0) {
            // Fetch invoices for each customer ID found
            const invoicePromises = customerIds.map((cid) =>
              this.stripe.invoices.list({
                customer: cid,
                limit: 50,
              }),
            );

            const allInvoiceResults = await Promise.all(invoicePromises);

            for (const result of allInvoiceResults) {
              const mappedInvoices = result.data.map((invoice) => ({
                date: new Date(invoice.created * 1000),
                name: invoice.customer_name || doctor.email,
                transactionId: invoice.number || invoice.id,
                stripeInvoiceId: invoice.id,
                stripeCustomerId: invoice.customer as string,
                status:
                  invoice.status === 'paid'
                    ? 'Paid'
                    : invoice.status === 'open'
                      ? 'Pending'
                      : 'Failed',
                payAmount: `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency.toUpperCase(),
                invoiceUrl: invoice.hosted_invoice_url,
                planType: invoice.lines.data[0]?.description || 'Subscription',
              }));
              stripeInvoices.push(...mappedInvoices);
            }
          }
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe invoices:', stripeError.message);
      }

      // Get database invoices
      const dbInvoices = await this.prisma.invoice.findMany({
        where: isAdmin ? {} : { stripeCustomerId }, // Filter if not admin
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const dbInvoicesMapped = dbInvoices.map((invoice) => ({
        date: invoice.createdAt || new Date(),
        transactionId: invoice.invoiceNo || invoice.id,
        stripeInvoiceId: invoice.stripeInvoiceId,
        stripeCustomerId: invoice.stripeCustomerId,
        status: invoice.status || 'Unknown',
        payAmount: `${((invoice.amountPaid || 0) / 100).toFixed(2)} EUR`,
        amount: parseFloat(((invoice.amountPaid || 0) / 100).toFixed(2)),
        currency: 'EUR',
        invoiceUrl: invoice.invoicePdfUrl,
      }));

      // Combined and sorted by date
      const allTransactions = [...stripeInvoices, ...dbInvoicesMapped]
        // Filter unique by stripeInvoiceId to avoid duplicates between Stripe and DB listing
        .filter(
          (v, i, a) =>
            a.findIndex(
              (t) =>
                t.stripeInvoiceId === v.stripeInvoiceId &&
                v.stripeInvoiceId !== 'N/A',
            ) === i,
        )
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });

      return {
        currentSubscription: isAdmin ? null : subscription, // Admins don't have a specific "current" subscription context here
        transactions: allTransactions,
        totalTransactions: allTransactions.length,
      };
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      throw new BadRequestException(error.message);
    }
  }

  // Create checkout session
  async createCheckoutSession(
    userId: string,
    planType: string,
    billingCycle: string = 'MONTHLY',
  ) {
    try {
      // Get user email from database
      const user = await this.prisma.doctor.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new BadRequestException('User email not found');
      }

      // Get plan from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Check eligibility for BASIC plan
      if (planType === 'BASIC') {
        await this.checkBasicPlanEligibility(userId);
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: planDetails.stripePriceId,
            quantity: 1,
          },
        ],
        mode: billingCycle === 'ONETIME' ? 'payment' : 'subscription',
        success_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/cancelled?status=fail`,
        customer_email: user.email,
        metadata: {
          userId,
          planType,
          billingCycle,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Complete subscription after successful checkout
  async completeSubscription(sessionId: string) {
    try {
      // Retrieve the checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        throw new NotFoundException('Checkout session not found');
      }

      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment not completed');
      }

      if (!session.metadata) {
        throw new BadRequestException('Session metadata not found');
      }

      const userId = session.metadata.userId;
      const planType = session.metadata.planType;
      const billingCycle = session.metadata.billingCycle || 'MONTHLY';

      // Get plan details from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Map Stripe status to SubscriptionStatus enum
      const mapStripeStatus = (stripeStatus: string) => {
        const statusMap: { [key: string]: string } = {
          active: 'ACTIVE',
          past_due: 'PAST_DUE',
          canceled: 'CANCELLED',
          cancelled: 'CANCELLED',
          unpaid: 'PAST_DUE',
          incomplete: 'PENDING',
          incomplete_expired: 'CANCELLED',
          trialing: 'ACTIVE',
        };
        return statusMap[stripeStatus] || 'PENDING';
      };

      // Extract period dates safely with type casting
      let periodStart = new Date();
      let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
      let stripeSubscriptionId: string | null = null;
      let subscriptionStatus: string = 'ACTIVE';

      if (session.mode === 'subscription') {
        // Get the subscription from Stripe with expanded data
        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          session.subscription as string,
          { expand: ['latest_invoice', 'customer'] },
        );

        const subscriptionData = stripeSubscription as any;
        periodStart = subscriptionData.current_period_start
          ? new Date(subscriptionData.current_period_start * 1000)
          : new Date();
        periodEnd = subscriptionData.current_period_end
          ? new Date(subscriptionData.current_period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        stripeSubscriptionId = stripeSubscription.id;
        subscriptionStatus = mapStripeStatus(stripeSubscription.status);
      } else {
        // One-time payment mode
        periodStart = new Date();
        periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month access for BASIC
        stripeSubscriptionId = null;
        subscriptionStatus = 'ACTIVE';
      }



      // Check if user already has a subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      let subscription;
      if (existingSubscription) {
        // Update existing subscription
        subscription = await this.prisma.subscription.update({
          where: { userId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSubscriptionId,
            planType: planType as any,
            billingCycle: billingCycle as any,
            status: subscriptionStatus as any,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            minutesAllocated: planDetails.minutes,
            minutesUsed: 0,
          },
        });
      } else {
        // Create new subscription
        subscription = await this.prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSubscriptionId,
            planType: planType as any,
            billingCycle: billingCycle as any,
            status: subscriptionStatus as any,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            minutesAllocated: planDetails.minutes,
            minutesUsed: 0,
          },
        });
      }

      return {
        success: true,
        subscription: {
          ...subscription,
          plan: planDetails,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Refund an invoice
  // Refund an invoice
  async refundInvoice(userId: string, inputId: string) {
    try {
      // 0. Direct ID Support as a Fail-Safe (PI or CH)
      if (inputId.startsWith('pi_') || inputId.startsWith('ch_')) {
        console.log(
          `🚀 Direct Payment ID detected: ${inputId}. Verifying ownership...`,
        );

        let payment: any;
        if (inputId.startsWith('pi_')) {
          payment = await this.stripe.paymentIntents.retrieve(inputId);
        } else {
          payment = await this.stripe.charges.retrieve(inputId);
        }

        const userSubscription = await this.prisma.subscription.findUnique({
          where: { userId },
        });

        if (
          !userSubscription ||
          payment.customer !== userSubscription.stripeCustomerId
        ) {
          throw new BadRequestException(
            'This payment does not belong to your account',
          );
        }

        const refund = await this.stripe.refunds.create({
          [inputId.startsWith('pi_') ? 'payment_intent' : 'charge']: inputId,
        });

        return {
          success: true,
          message: 'Refund processed successfully via Direct ID',
          refundId: refund.id,
        };
      }

      // 1. Find the invoice in our DB first
      let invoice = await this.prisma.invoice.findFirst({
        where: {
          OR: [{ stripeInvoiceId: inputId }, { invoiceNo: inputId }],
        },
        orderBy: { createdAt: 'desc' }, // Pick the most recent one if multiple match No
      });

      // 2. If not in DB, search Stripe directly (robustness for missed webhooks)
      let stripeInvoice: any;
      if (!invoice) {
        console.log(
          `🔍 Invoice ${inputId} not found in DB, searching Stripe...`,
        );
        try {
          if (inputId.startsWith('in_')) {
            stripeInvoice = await this.stripe.invoices.retrieve(inputId);
          } else {
            const searchResults = await this.stripe.invoices.search({
              query: `number:'${inputId}'`,
              limit: 1,
            });
            if (searchResults.data.length > 0) {
              stripeInvoice = searchResults.data[0];
            }
          }
        } catch (e) {
          console.error(`Stripe search failed: ${e.message}`);
        }

        if (!stripeInvoice) {
          throw new NotFoundException(
            'Invoice not found in our records or in Stripe. If this was a successful test payment, please provide the Payment ID (pi_...) directly.',
          );
        }

        // Auto-sync missing invoice to DB
        let planType: any = null;
        if (stripeInvoice.subscription) {
          try {
            const sub = await this.stripe.subscriptions.retrieve(
              stripeInvoice.subscription as string,
            );
            planType = sub.metadata.planType;
          } catch (e) {
            console.warn(
              `Could not fetch subscription for planType: ${e.message}`,
            );
          }
        }

        invoice = await this.prisma.invoice.create({
          data: {
            stripeInvoiceId: stripeInvoice.id,
            stripeCustomerId: stripeInvoice.customer, // Save customer ID
            planType: planType,
            invoiceNo: stripeInvoice.number,
            amountDue: stripeInvoice.amount_due,
            amountPaid: stripeInvoice.amount_paid,
            currency: stripeInvoice.currency.toUpperCase(),
            status: stripeInvoice.status || 'paid',
            invoicePdfUrl: stripeInvoice.hosted_invoice_url,
          },
        });
        console.log(`✅ Auto-synced invoice ${stripeInvoice.id} to local DB`);
      } else {
        // Retrieve with expansions to be 100% sure we get the IDs
        stripeInvoice = await this.stripe.invoices.retrieve(
          invoice.stripeInvoiceId as string,
          {
            expand: ['payment_intent', 'charge'],
          },
        );
      }

      // 3. Verify Ownership
      const userSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (
        !userSubscription ||
        stripeInvoice.customer !== userSubscription.stripeCustomerId
      ) {
        console.warn(
          `Mismatch: Stripe Cust ${stripeInvoice.customer} vs Local Cust ${userSubscription?.stripeCustomerId}`,
        );
        throw new BadRequestException(
          'This invoice does not belong to your account',
        );
      }

      let paymentIntentId =
        typeof stripeInvoice.payment_intent === 'string'
          ? stripeInvoice.payment_intent
          : (stripeInvoice.payment_intent as any)?.id;

      let chargeId =
        typeof stripeInvoice.charge === 'string'
          ? stripeInvoice.charge
          : (stripeInvoice.charge as any)?.id;

      // 4. Exhaustive Search: If Stripe invoice object has nulls, search customer transactions
      if (!paymentIntentId && !chargeId) {
        console.log(
          `🔎 Payment details missing on invoice ${stripeInvoice.id}. Searching customer payments...`,
        );
        const customerId = stripeInvoice.customer as string;

        // Search PaymentIntents for this customer that match the invoice
        const pIntents = await this.stripe.paymentIntents.list({
          customer: customerId,
          limit: 15, // Search a bit more
        });
        const match = pIntents.data.find(
          (pi) => (pi as any).invoice === stripeInvoice.id,
        );
        if (match) {
          paymentIntentId = match.id;
        } else {
          // Search Charges as a fallback
          const charges = await this.stripe.charges.list({
            customer: customerId,
            limit: 15,
          });
          const chargeMatch = charges.data.find(
            (c) => (c as any).invoice === stripeInvoice.id,
          );
          if (chargeMatch) {
            chargeId = chargeMatch.id;
            paymentIntentId = (chargeMatch as any).payment_intent;
          }
        }
      }

      if (!paymentIntentId && !chargeId) {
        throw new BadRequestException(
          `No payment intent or charge found for invoice ${stripeInvoice.id}. Status: ${stripeInvoice.status}. If this was a successful test payment, please use the Payment Intent ID (starts with "pi_") from your Stripe Dashboard for a direct refund.`,
        );
      }

      // 5. Process Refund
      const refund = await this.stripe.refunds.create({
        [paymentIntentId ? 'payment_intent' : 'charge']: (paymentIntentId ||
          chargeId) as string,
      });

      // 6. Update local status
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'REFUNDED',
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Refund processed successfully',
        refundId: refund.id,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Handle Stripe Webhooks
  async handleStripeWebhook(payload: any, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.isUpgrade === 'true') {
          console.log(`Webhook: Processing upgrade for session ${session.id}`);
          await this.confirmUpgrade(session.id);
        } else {
          console.log(
            `Webhook: Processing new subscription for session ${session.id}`,
          );
          await this.completeSubscription(session.id);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const userId = stripeSubscription.metadata.userId;

        if (!userId) {
          console.warn(
            `Webhook: No userId found in subscription metadata for ${stripeSubscription.id}`,
          );
          break;
        }

        const subscriptionData = stripeSubscription as any;
        const periodStart = subscriptionData.current_period_start
          ? new Date(subscriptionData.current_period_start * 1000)
          : undefined;
        const periodEnd = subscriptionData.current_period_end
          ? new Date(subscriptionData.current_period_end * 1000)
          : undefined;

        const mapStripeStatus = (stripeStatus: string) => {
          const statusMap: { [key: string]: string } = {
            active: 'ACTIVE',
            past_due: 'PAST_DUE',
            canceled: 'CANCELLED',
            cancelled: 'CANCELLED',
            unpaid: 'PAST_DUE',
            incomplete: 'PENDING',
            incomplete_expired: 'CANCELLED',
            trialing: 'ACTIVE',
          };
          return statusMap[stripeStatus] || 'PENDING';
        };

        const status = mapStripeStatus(stripeSubscription.status);

        if (event.type === 'customer.subscription.deleted') {
          await this.prisma.subscription.update({
            where: { userId },
            data: {
              status: 'CANCELLED',
              isActive: false,
              cancelledAt: new Date(),
            },
          });
        } else {
          await this.prisma.subscription.update({
            where: { userId },
            data: {
              status: status as any,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              updatedAt: new Date(),
            },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).subscription) {
          let planType: any = null;
          try {
            const sub = await this.stripe.subscriptions.retrieve(
              (invoice as any).subscription as string,
            );
            planType = sub.metadata.planType;
          } catch (e) {
            console.warn(
              `Webhook: Could not fetch subscription for planType: ${e.message}`,
            );
          }

          // Optional: Create an invoice record in your DB
          await this.prisma.invoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            update: {
              status: invoice.status || 'paid',
              amountPaid: invoice.amount_paid,
              stripeCustomerId: invoice.customer as string, // Ensure customerId is updated
              planType: planType,
            },
            create: {
              stripeInvoiceId: invoice.id,
              stripeCustomerId: invoice.customer as string,
              planType: planType,
              invoiceNo: invoice.number || null,
              amountDue: invoice.amount_due,
              amountPaid: invoice.amount_paid,
              currency: invoice.currency.toUpperCase(),
              status: invoice.status || 'paid',
              invoicePdfUrl: invoice.hosted_invoice_url || null,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).subscription) {
          const stripeSubscription = await this.stripe.subscriptions.retrieve(
            (invoice as any).subscription as string,
          );
          const userId = stripeSubscription.metadata.userId;
          if (userId) {
            await this.prisma.subscription.update({
              where: { userId },
              data: { status: 'PAST_DUE' },
            });
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if ((charge as any).invoice) {
          await this.prisma.invoice.update({
            where: { stripeInvoiceId: (charge as any).invoice as string },
            data: {
              status: 'REFUNDED',
              updatedAt: new Date(),
            },
          });
          console.log(
            `Webhook: Invoice ${(charge as any).invoice} marked as REFUNDED`,
          );
        }
        break;
      }
    }
  }

  async getAdminStats() {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // 1. Current Users by Plan (Active)
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { planType: true },
    });

    const currentUsersByPlan = {
      STANDARD: activeSubscriptions.filter((s) => s.planType === 'STANDARD')
        .length,
      PREMIUM: activeSubscriptions.filter((s) => s.planType === 'PREMIUM')
        .length,
      ENTERPRISE: activeSubscriptions.filter((s) => s.planType === 'ENTERPRISE')
        .length,
    };

    // 2. Overall Plan Purchased (Lifetime)
    const allInvoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['paid', 'succeeded', 'REFUNDED'] } },
      select: { planType: true },
    });

    const lifetimePurchasesByPlan = {
      STANDARD: allInvoices.filter((i) => i.planType === 'STANDARD').length,
      PREMIUM: allInvoices.filter((i) => i.planType === 'PREMIUM').length,
      ENTERPRISE: allInvoices.filter((i) => i.planType === 'ENTERPRISE').length,
    };

    // 3. Active Subscriptions count & Comparison
    const currentActiveCount = activeSubscriptions.length;
    const lastMonthActiveCount = await this.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        createdAt: { lte: endOfLastMonth },
      },
    });

    // 4. Monthly Recurring Revenue (MRR)
    // We normalize yearly plans to monthly (Price / 12)
    const activeSubsWithPlans = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    // Fetch all plans to get prices
    const plans = await this.prisma.subscriptionPlan.findMany();

    const calculateMRR = (subs: any[]) => {
      return subs.reduce((acc, sub) => {
        const plan = plans.find(
          (p) =>
            p.planType === sub.planType && p.billingCycle === sub.billingCycle,
        );
        if (plan) {
          const monthlyPrice =
            sub.billingCycle === 'YEARLY' ? plan.price / 12 : plan.price;
          return acc + monthlyPrice;
        }
        return acc;
      }, 0);
    };

    const currentMRR = calculateMRR(activeSubsWithPlans);

    // For last month MRR, we'd ideally need snapshot data,
    // but we can approximate using subscriptions active then
    const lastMonthSubs = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        createdAt: { lte: endOfLastMonth },
      },
    });
    const lastMonthMRR = calculateMRR(lastMonthSubs);

    // 5. Total Revenue & Comparison
    const currentTotalRevenue =
      (
        await this.prisma.invoice.aggregate({
          where: { status: { in: ['paid', 'succeeded'] } },
          _sum: { amountPaid: true },
        })
      )._sum.amountPaid || 0;

    const lastMonthTotalRevenue =
      (
        await this.prisma.invoice.aggregate({
          where: {
            status: { in: ['paid', 'succeeded'] },
            createdAt: { lte: endOfLastMonth },
          },
          _sum: { amountPaid: true },
        })
      )._sum.amountPaid || 0;

    // 6. Pending Invoices & Comparison
    const currentPendingCount = await this.prisma.invoice.count({
      where: { status: { in: ['open', 'unpaid', 'PENDING'] } },
    });

    const lastMonthPendingCount = await this.prisma.invoice.count({
      where: {
        status: { in: ['open', 'unpaid', 'PENDING'] },
        createdAt: { lte: endOfLastMonth },
      },
    });

    // Helper to calculate percentage change
    const getPercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };

    return {
      currency: 'EUR',
      planDistribution: {
        currentActive: currentUsersByPlan,
        lifetimePurchases: lifetimePurchasesByPlan,
      },
      metrics: {
        activeSubscriptions: {
          value: currentActiveCount,
          previousValue: lastMonthActiveCount,
          percentageChange: getPercentageChange(
            currentActiveCount,
            lastMonthActiveCount,
          ),
        },
        monthlyRecurringRevenue: {
          value: parseFloat(currentMRR.toFixed(2)),
          previousValue: parseFloat(lastMonthMRR.toFixed(2)),
          percentageChange: getPercentageChange(currentMRR, lastMonthMRR),
        },
        totalRevenue: {
          value: parseFloat((currentTotalRevenue / 100).toFixed(2)),
          previousValue: parseFloat((lastMonthTotalRevenue / 100).toFixed(2)),
          percentageChange: getPercentageChange(
            currentTotalRevenue,
            lastMonthTotalRevenue,
          ),
        },
        pendingInvoices: {
          value: currentPendingCount,
          previousValue: lastMonthPendingCount,
          percentageChange: getPercentageChange(
            currentPendingCount,
            lastMonthPendingCount,
          ),
        },
      },
    };
  }
}
