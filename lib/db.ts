import { PrismaClient } from '@prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5442/itc_dev'
      }
    }
  });
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = prismaClientSingleton();
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = prismaClientSingleton();
  }
  prisma = global.prismaGlobal;
}

export default prisma;