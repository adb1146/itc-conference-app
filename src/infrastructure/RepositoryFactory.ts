/**
 * Repository Factory
 * Creates and configures repository instances
 */

import { PrismaClient } from '@prisma/client';
import { PostgresSessionRepository } from './repositories/SessionRepository';
import { VectorRepository } from './repositories/VectorRepository';
import { InMemoryCacheRepository } from './repositories/CacheRepository';
import { ISessionRepository, IVectorRepository, ICacheRepository } from '@/domain/interfaces/IRepository';

let prismaClient: PrismaClient | null = null;
let repositories: {
  sessionRepo: ISessionRepository;
  vectorRepo: IVectorRepository;
  cacheRepo: ICacheRepository;
} | null = null;

/**
 * Create or get singleton repository instances
 */
export async function createRepositories(): Promise<{
  sessionRepo: ISessionRepository;
  vectorRepo: IVectorRepository;
  cacheRepo: ICacheRepository;
}> {
  if (repositories) {
    return repositories;
  }

  // Initialize Prisma client
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // Create repositories
  const sessionRepo = new PostgresSessionRepository(prismaClient);
  
  const vectorRepo = new VectorRepository(
    process.env.PINECONE_API_KEY,
    process.env.PINECONE_INDEX || 'itc-sessions'
  );
  
  // Test vector connection and log status
  const vectorAvailable = await vectorRepo.testConnection();
  console.log(`[RepositoryFactory] Vector DB available: ${vectorAvailable}`);
  
  const cacheRepo = new InMemoryCacheRepository();

  repositories = {
    sessionRepo,
    vectorRepo,
    cacheRepo
  };

  return repositories;
}

/**
 * Clean up resources
 */
export async function destroyRepositories(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
  
  if (repositories?.cacheRepo) {
    (repositories.cacheRepo as InMemoryCacheRepository).destroy();
  }
  
  repositories = null;
}