import { PrismaClient } from '@prisma/client';

// Function to create a new PrismaClient instance
const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Check if globalThis already has a Prisma instance, otherwise create one
const prisma = globalThis.prismaGlobal || prismaClientSingleton();

// In development, store the Prisma instance in globalThis to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
