export class Subscription {
  id: string;
  userId: string;
  planType: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'PAST_DUE';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  minutesAllocated: number;
  minutesUsed: number;
  minutesRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

export const PLAN_DETAILS = {
  BASIC: {
    name: 'Basic Plan',
    price: 399,
    priceId: 'price_1SbCviD60jTqpzFUD4WuxbQN',
    minutes: 500,
    features: [
      'Average of 2-5 easy to follow trade alerts',
      'Average of 2-5 easy to follow trade',
      'Average of 2-5 easy to follow trade alerts per week',
      'Average of 2-5 easy to follow trade alerts',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 899,
    priceId: 'price_1SbCv9D60jTqpzFUYuH2aykt',
    minutes: 1000,
    features: [
      'Average of 2-5 easy to follow trade alerts',
      'Average of 2-5 easy to follow trade',
      'Average of 2-5 easy to follow trade alerts per week',
      'Average of 2-5 easy to follow',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 1299,
    priceId: 'price_1SbCwLD60jTqpzFUGZBNsqi0',
    minutes: 2000,
    features: [
      'Average of 2-5 easy to follow trade alerts',
      'Average of 2-5 easy to follow trade alerts',
      'Average of 2-5 easy to follow',
      'Average of 2-5 easy to follow trade alerts',
    ],
  },
};
