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
        {
          planType: 'BASIC' as const,
          name: 'Basic Plan',
          price: 399,
          stripePriceId: 'price_1SbCviD60jTqpzFUD4WuxbQN',
          minutes: 500,
          features: [
            'Average of 2-5 easy to follow trade alerts',
            'Average of 2-5 easy to follow trade',
            'Average of 2-5 easy to follow trade alerts per week',
            'Average of 2-5 easy to follow trade alerts',
          ],
        },
        {
          planType: 'PROFESSIONAL' as const,
          name: 'Professional',
          price: 899,
          stripePriceId: 'price_1SbCv9D60jTqpzFUYuH2aykt',
          minutes: 1000,
          features: [
            'Average of 2-5 easy to follow trade alerts',
            'Average of 2-5 easy to follow trade',
            'Average of 2-5 easy to follow trade alerts per week',
            'Average of 2-5 easy to follow',
          ],
        },
        {
          planType: 'ENTERPRISE' as const,
          name: 'Enterprise',
          price: 1299,
          stripePriceId: 'price_1SbCwLD60jTqpzFUGZBNsqi0',
          minutes: 2000,
          features: [
            'Average of 2-5 easy to follow trade alerts',
            'Average of 2-5 easy to follow trade alerts',
            'Average of 2-5 easy to follow',
            'Average of 2-5 easy to follow trade alerts',
          ],
        },
      ];

      let created = 0;
      let skipped = 0;

      for (const plan of defaultPlans) {
        const existingPlan = await this.prisma.subscriptionPlan.findUnique({
          where: { planType: plan.planType },
        });

        if (existingPlan) {
          skipped++;
          console.log(`⏭️  Plan ${plan.planType} already exists, skipping...`);
        } else {
          await this.prisma.subscriptionPlan.create({
            data: plan,
          });
          created++;
          console.log(`✅ Created plan: ${plan.planType}`);
        }
      }

      console.log(`\n📊 Subscription Plans Seeding Summary:`);
      console.log(`   - Created: ${created}`);
      console.log(`   - Skipped: ${skipped}`);
      console.log(`   - Total: ${defaultPlans.length}\n`);
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
      const { planType, paymentMethodId } = createSubscriptionDto;
      
      // Get plan from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: { planType },
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
        where: { planType: subscription.planType },
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

  // Create checkout session for upgrade/downgrade
  async createUpgradeCheckout(userId: string, planType: string) {
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
        where: { planType: planType as any },
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
      const oldSubscriptionId = session.metadata.oldSubscriptionId;

      // Get plan details from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: { planType: planType as any },
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
        const planDetails = await this.prisma.subscriptionPlan.findUnique({
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
  async createCheckoutSession(userId: string, planType: string) {
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
        where: { planType: planType as any },
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

      // Get plan details from database
      const planDetails = await this.prisma.subscriptionPlan.findUnique({
        where: { planType: planType as any },
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
}
