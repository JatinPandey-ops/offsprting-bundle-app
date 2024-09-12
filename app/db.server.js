import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Check if globalThis already has a Prisma instance, else initialize it
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// In development, store Prisma instance in globalThis to avoid multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
