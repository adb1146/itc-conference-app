/**
 * PostgreSQL Session Repository
 * Implements ISessionRepository using Prisma ORM
 */

import { PrismaClient } from '@prisma/client';
import { ISessionRepository, Session, SearchCriteria, SearchResult } from '@/domain/interfaces/IRepository';

export class PostgresSessionRepository implements ISessionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    return session ? this.toDomainEntity(session) : null;
  }

  async findAll(criteria?: SearchCriteria): Promise<SearchResult<Session>> {
    const where = criteria?.filters || {};
    const take = criteria?.limit || 20;
    const skip = criteria?.offset || 0;

    const [items, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        take,
        skip,
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      }),
      this.prisma.session.count({ where })
    ]);

    return {
      items: items.map(this.toDomainEntity),
      total,
      hasMore: total > skip + take
    };
  }

  async search(criteria: SearchCriteria): Promise<Session[]> {
    const where: any = {};

    // Build search conditions
    if (criteria.query) {
      where.OR = [
        { title: { contains: criteria.query, mode: 'insensitive' } },
        { description: { contains: criteria.query, mode: 'insensitive' } },
        { enrichedSummary: { contains: criteria.query, mode: 'insensitive' } }
      ];
    }

    // Add keyword filters
    if (criteria.keywords && criteria.keywords.length > 0) {
      where.AND = criteria.keywords.map(keyword => ({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          { tags: { has: keyword } }
        ]
      }));
    }

    // Apply additional filters
    if (criteria.filters) {
      Object.assign(where, criteria.filters);
    }

    const sessions = await this.prisma.session.findMany({
      where,
      take: criteria.limit || 20,
      skip: criteria.offset || 0,
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return sessions.map(this.toDomainEntity);
  }

  async findBySpeaker(speakerId: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        speakers: {
          some: {
            speakerId
          }
        }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return sessions.map(this.toDomainEntity);
  }

  async findByTrack(track: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: { track },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return sessions.map(this.toDomainEntity);
  }

  async findByTimeRange(start: Date, end: Date): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        AND: [
          { startTime: { gte: start } },
          { endTime: { lte: end } }
        ]
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return sessions.map(this.toDomainEntity);
  }

  async save(entity: Session): Promise<Session> {
    const data = this.toPrismaModel(entity);
    
    const saved = await this.prisma.session.create({
      data,
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    return this.toDomainEntity(saved);
  }

  async update(id: string, entity: Partial<Session>): Promise<Session> {
    const data = this.toPrismaModel(entity as Session);
    
    const updated = await this.prisma.session.update({
      where: { id },
      data,
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    return this.toDomainEntity(updated);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.session.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async bulkUpsert(sessions: Session[]): Promise<void> {
    const operations = sessions.map(session => {
      const data = this.toPrismaModel(session);
      return this.prisma.session.upsert({
        where: { id: session.id },
        update: data,
        create: data
      });
    });

    await this.prisma.$transaction(operations);
  }

  /**
   * Convert Prisma model to domain entity
   */
  private toDomainEntity(dbRecord: any): Session {
    return {
      id: dbRecord.id,
      title: dbRecord.title,
      description: dbRecord.description || '',
      startTime: dbRecord.startTime,
      endTime: dbRecord.endTime,
      location: dbRecord.location,
      track: dbRecord.track,
      tags: dbRecord.tags || [],
      speakers: dbRecord.speakers?.map((s: any) => ({
        id: s.speaker.id,
        name: s.speaker.name,
        role: s.speaker.title,
        company: s.speaker.company,
        bio: s.speaker.bio,
        imageUrl: s.speaker.imageUrl
      })) || []
    };
  }

  /**
   * Convert domain entity to Prisma model
   */
  private toPrismaModel(entity: Session): any {
    return {
      title: entity.title,
      description: entity.description,
      startTime: entity.startTime,
      endTime: entity.endTime,
      location: entity.location,
      track: entity.track,
      tags: entity.tags
    };
  }
}