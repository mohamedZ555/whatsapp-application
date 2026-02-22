import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

function resolveDatabaseUrl() {
  const legacyDockerDefault = 'postgresql://postgres:postgres@localhost:5432/postgres';
  const projectDockerDefault =
    'postgresql://fadaa_user:fadaa_password@localhost:5432/fadaa_whats?schema=public';

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  // Self-heal old local defaults that do not match docker-compose credentials.
  return url === legacyDockerDefault ? projectDockerDefault : url;
}

function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const databaseUrl = resolveDatabaseUrl();

if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== databaseUrl) {
  globalForPrisma.prisma?.$disconnect().catch(() => {
    // Best effort disconnect when config changes in dev HMR cycles.
  });

  globalForPrisma.prisma = createPrismaClient(databaseUrl);
  globalForPrisma.prismaUrl = databaseUrl;
}

export const prisma = globalForPrisma.prisma;

export default prisma;
