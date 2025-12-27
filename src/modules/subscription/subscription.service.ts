import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
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
        // STANDARD PLANS
        {
          planType: 'STANDARD' as const,
          billingCycle: 'MONTHLY' as const,
          name: 'Standard Monthly',
          price: 399,
          stripePriceId: this.configService.get<string>('STRIPE_STANDARD_MONTHLY_PRICE_ID') || 'price_standard_monthly_placeholder',
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
          stripePriceId: this.configService.get<string>('STRIPE_STANDARD_YEARLY_PRICE_ID') || 'price_standard_yearly_placeholder',
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
          stripePriceId: this.configService.get<string>('STRIPE_PREMIUM_MONTHLY_PRICE_ID') || 'price_premium_monthly_placeholder',
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
          stripePriceId: this.configService.get<string>('STRIPE_PREMIUM_YEARLY_PRICE_ID') || 'price_premium_yearly_placeholder',
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
          stripePriceId: this.configService.get<string>('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID') || 'price_enterprise_monthly_placeholder',
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
          stripePriceId: this.configService.get<string>('STRIPE_ENTERPRISE_YEARLY_PRICE_ID') || 'price_enterprise_yearly_placeholder',
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

      let processed = 0;

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
        processed++;
        console.log(`✅ Upserted plan: ${plan.planType} (${plan.billingCycle})`);
      }

      console.log(`\n📊 Subscription Plans Seeding Summary:`);
      console.log(`   - Total Processed: ${processed}`);
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
  async updatePlanDetailsById(id: string, updatePlanDetailsDto: UpdatePlanDetailsDto) {
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
  // Create a new subscription
  async createSubscription(userId: string, createSubscriptionDto: CreateSubscriptionDto) {
    try {
      const { planType, billingCycle, paymentMethodId } = createSubscriptionDto;
      
      // Get plan from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: { 
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any
          }
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Create or retrieve customer
      let customer: Stripe.Customer;
      const existingCustomers = await this.stripe.customers.list({
        email: userId, // You might want to use actual email here
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.stripe.customers.create({
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
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
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
      const planDetails = await this.prisma.subscriptionPlan.findFirst({
        where: { 
          planType: subscription.planType as any,
          // Note: We might want to store billingCycle on the Subscription model too
          // or derive it from the planDetails if we find the correct one.
          // For now, findFirst is safer if we don't have it on subscription.
        },
      });

      if (!planDetails) {
        throw new NotFoundException('Plan details not found');
      }

      const minutesAllocated = subscription.minutesAllocated || 0;
      const minutesUsed = subscription.minutesUsed || 0;

      // Check if subscription is cancelled but still accessible
      const isAccessible = subscription.currentPeriodEnd && new Date() < subscription.currentPeriodEnd;
      const isCancelled = subscription.status === 'CANCELLED' && subscription.cancelledAt !== null;

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
        // Cancellation info
        isCancelled: isCancelled,
        cancelledAt: subscription.cancelledAt,
        isAccessible: isCancelled ? isAccessible : true, // If cancelled, check if still accessible
        accessMessage: isCancelled && isAccessible 
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
        }
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
        message: 'Subscription cancelled successfully. You can continue to use your plan until the end of your billing period.',
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

  async createUpgradeCheckout(userId: string, planType: string, billingCycle: string = 'MONTHLY') {
    try {
      // Check if user has an active subscription
      const currentSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!currentSubscription) {
        throw new BadRequestException('No active subscription found. Please create a subscription first.');
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
            billingCycle: billingCycle as any
          }
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Check if it's the same plan
      if (currentSubscription.planType === planType) {
        throw new BadRequestException('You are already subscribed to this plan');
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
        success_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/cancelled`,
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
        message: 'Checkout session created. Complete payment to upgrade/downgrade your plan.',
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
            billingCycle: billingCycle as any
          }
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Get the new subscription from Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ['latest_invoice', 'customer'] }
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
          'active': 'ACTIVE',
          'past_due': 'PAST_DUE',
          'canceled': 'CANCELLED',
          'cancelled': 'CANCELLED',
          'unpaid': 'PAST_DUE',
          'incomplete': 'PENDING',
          'incomplete_expired': 'CANCELLED',
          'trialing': 'ACTIVE',
        };
        return statusMap[stripeStatus] || 'PENDING';
      };

      // Cancel old subscription in Stripe if it exists
      if (oldSubscriptionId && oldSubscriptionId !== '') {
        try {
          console.log(`🔄 Attempting to cancel old subscription: ${oldSubscriptionId}`);
          const cancelledSub = await this.stripe.subscriptions.cancel(oldSubscriptionId);
          console.log(`✅ Old subscription cancelled successfully: ${cancelledSub.id}, status: ${cancelledSub.status}`);
        } catch (error) {
          console.error('❌ Error cancelling old subscription:', error.message);
          // Continue anyway - new subscription is already created
        }
      } else {
        console.warn('⚠️ No old subscription ID found in metadata to cancel');
      }

      // Update subscription in database
      const subscription = await this.prisma.subscription.update({
        where: { userId },
        data: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          planType: planType as any,
          status: mapStripeStatus(stripeSubscription.status) as any,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          minutesAllocated: planDetails.minutes,
          minutesUsed: 0, // Reset minutes on upgrade
          cancelledAt: null,
        },
      });

      return {
        success: true,
        message: 'Subscription upgraded successfully! Old subscription has been cancelled.',
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
  async getInvoices(userId: string) {
    try {
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
        limit: 10,
      });

      return invoices.data.map((invoice) => ({
        date: new Date(invoice.created * 1000),
        name: customer.name || 'Customer',
        transactionId: invoice.number,
        status: invoice.status?.toUpperCase() || 'UNKNOWN',
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
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
  async getUserPurchases(userId: string) {
    try {
      // Get user's subscription history
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

      // Get Stripe invoices
      let stripeInvoices: any[] = [];
      try {
        let customerId = subscription?.stripeCustomerId;
        
        // If no customerId in subscription, search by metadata
        if (!customerId) {
          const customers = await this.stripe.customers.search({
            query: `metadata['userId']:'${userId}'`,
            limit: 1,
          });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }

        if (customerId) {
          const customer = await this.stripe.customers.retrieve(customerId);
          const invoices = await this.stripe.invoices.list({
            customer: customerId,
            limit: 100, // Get more history
          });

          stripeInvoices = invoices.data.map((invoice) => ({
            date: new Date(invoice.created * 1000),
            name: (customer as any).name || (customer as any).email || 'Customer',
            transactionId: invoice.number || invoice.id,
            status: invoice.status === 'paid' ? 'Paid' : invoice.status === 'open' ? 'Pending' : 'Failed',
            payAmount: `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            invoiceUrl: invoice.hosted_invoice_url,
            planType: invoice.lines.data[0]?.description || 'Subscription',
          }));
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe invoices:', stripeError.message);
      }

      // Get database invoices
      const dbInvoices = await this.prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const dbInvoicesMapped = dbInvoices.map((invoice) => ({
        date: invoice.createdAt || new Date(),
        transactionId: invoice.invoiceNo || invoice.id,
        status: invoice.status || 'Unknown',
        payAmount: `${((invoice.amountPaid || 0) / 100).toFixed(2)} ${invoice.currency || 'USD'}`,
        amount: (invoice.amountPaid || 0) / 100,
        currency: invoice.currency || 'USD',
        invoiceUrl: invoice.invoicePdfUrl,
      }));

      // If no invoices found but subscription exists, create a transaction from subscription
      let subscriptionTransaction: any[] = [];
      if (stripeInvoices.length === 0 && dbInvoices.length === 0 && subscription) {
        const planDetails = await this.prisma.subscriptionPlan.findFirst({
          where: { planType: subscription.planType as any },
        });

        if (planDetails) {
          subscriptionTransaction = [{
            date: subscription.createdAt || new Date(),
            name: 'Subscription Purchase',
            transactionId: subscription.id || 'N/A',
            status: subscription.status === 'ACTIVE' ? 'Paid' : 'Pending',
            payAmount: `${(planDetails.price / 100).toFixed(2)} USD`,
            amount: planDetails.price / 100,
            currency: 'USD',
            planType: planDetails.name,
          }];
        }
      }

      // Combine and sort by date
      const allTransactions = [...stripeInvoices, ...dbInvoicesMapped, ...subscriptionTransaction]
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });

      console.log(`Found ${stripeInvoices.length} Stripe invoices, ${dbInvoices.length} DB invoices, ${subscriptionTransaction.length} subscription transactions`);

      return {
        currentSubscription: subscription,
        transactions: allTransactions,
        totalTransactions: allTransactions.length,
      };
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      throw new BadRequestException(error.message);
    }
  }

  // Create checkout session
  async createCheckoutSession(userId: string, planType: string, billingCycle: string = 'MONTHLY') {
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
            billingCycle: billingCycle as any
          }
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
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
        success_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get<string>('ClIENT_URL')}/subscription/cancelled`,
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
            billingCycle: billingCycle as any
          }
        },
      });

      if (!planDetails) {
        throw new BadRequestException('Invalid plan type');
      }

      // Get the subscription from Stripe with expanded data
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ['latest_invoice', 'customer'] }
      );

      // Extract period dates safely with type casting
      const subscriptionData = stripeSubscription as any;
      const periodStart = subscriptionData.current_period_start 
        ? new Date(subscriptionData.current_period_start * 1000)
        : new Date();
      const periodEnd = subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      // Map Stripe status to SubscriptionStatus enum
      const mapStripeStatus = (stripeStatus: string) => {
        const statusMap: { [key: string]: string } = {
          'active': 'ACTIVE',
          'past_due': 'PAST_DUE',
          'canceled': 'CANCELLED',
          'cancelled': 'CANCELLED',
          'unpaid': 'PAST_DUE',
          'incomplete': 'PENDING',
          'incomplete_expired': 'CANCELLED',
          'trialing': 'ACTIVE',
        };
        return statusMap[stripeStatus] || 'PENDING';
      };

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
            stripeSubscriptionId: stripeSubscription.id,
            planType: planType as any,
            status: mapStripeStatus(stripeSubscription.status) as any,
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
            stripeSubscriptionId: stripeSubscription.id,
            planType: planType as any,
            status: mapStripeStatus(stripeSubscription.status) as any,
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
          // Handled by confirmUpgrade but good to have safety here
          // We can call confirmUpgrade logic or a simplified version
          console.log(`Webhook: Processing upgrade for session ${session.id}`);
        } else {
          console.log(`Webhook: Processing new subscription for session ${session.id}`);
          await this.completeSubscription(session.id);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const userId = stripeSubscription.metadata.userId;

        if (!userId) {
          console.warn(`Webhook: No userId found in subscription metadata for ${stripeSubscription.id}`);
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
            'active': 'ACTIVE',
            'past_due': 'PAST_DUE',
            'canceled': 'CANCELLED',
            'cancelled': 'CANCELLED',
            'unpaid': 'PAST_DUE',
            'incomplete': 'PENDING',
            'incomplete_expired': 'CANCELLED',
            'trialing': 'ACTIVE',
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
          // Optional: Create an invoice record in your DB
          await this.prisma.invoice.create({
            data: {
              stripeInvoiceId: invoice.id,
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
          const stripeSubscription = await this.stripe.subscriptions.retrieve((invoice as any).subscription as string);
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

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
}
