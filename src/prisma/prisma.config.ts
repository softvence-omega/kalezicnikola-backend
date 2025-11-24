import { PrismaConfig } from '@prisma/client/runtime';

const config: PrismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

export default config;
