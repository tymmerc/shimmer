import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }]
        : [],
    });

    if (process.env.NODE_ENV === 'development') {
      (prismaInstance.$on as any)('query', (e: any) => {
        logger.debug({ query: e.query, duration: e.duration }, 'prisma.query');
      });
    }
  }

  return prismaInstance;
}

export async function closePrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
