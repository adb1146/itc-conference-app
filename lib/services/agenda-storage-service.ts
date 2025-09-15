/**
 * Agenda Storage Service
 * Handles secure storage, retrieval, and versioning of personalized agendas
 */

import prisma from '@/lib/db';
import { SmartAgenda, ScheduleItem } from '@/lib/tools/schedule/types';
import { EnrichedUserProfile } from '@/lib/agents/user-profile-researcher';

export interface StoredAgenda {
  id: string;
  userId: string;
  title: string;
  description?: string;
  agendaData: SmartAgenda;
  metadata?: AgendaMetadata;
  isActive: boolean;
  version: number;
  generatedBy: 'ai_agent' | 'manual' | 'imported';
  researchProfile?: EnrichedUserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgendaMetadata {
  totalSessions: number;
  favoriteSessions: number;
  researchConfidence?: number;
  dataCompleteness?: number;
  generationReason?: string;
  lastModifiedBy?: string;
}

export interface AgendaUpdateOptions {
  createVersion?: boolean;
  changeDescription?: string;
  changedBy?: 'user' | 'ai_agent' | 'system';
}

/**
 * Save a new personalized agenda for a user
 */
export async function savePersonalizedAgenda(
  userId: string,
  agenda: SmartAgenda,
  metadata?: {
    researchProfile?: EnrichedUserProfile;
    generatedBy?: 'ai_agent' | 'manual' | 'imported';
    title?: string;
    description?: string;
  }
): Promise<StoredAgenda> {
  // Deactivate any existing active agendas for this user
  await prisma.personalizedAgenda.updateMany({
    where: {
      userId,
      isActive: true
    },
    data: {
      isActive: false
    }
  });

  // Count favorites in the agenda
  const favoriteSessions = countFavoriteSessions(agenda);
  const totalSessions = countTotalSessions(agenda);

  // Create the new agenda
  const personalizedAgenda = await prisma.personalizedAgenda.create({
    data: {
      userId,
      title: metadata?.title || 'My Conference Schedule',
      description: metadata?.description,
      agendaData: agenda as any, // Store the complete agenda structure
      metadata: {
        totalSessions,
        favoriteSessions,
        researchConfidence: metadata?.researchProfile?.metadata.researchConfidence,
        dataCompleteness: metadata?.researchProfile?.metadata.dataCompleteness,
        generationReason: 'AI-generated based on profile research'
      },
      generatedBy: metadata?.generatedBy || 'ai_agent',
      researchProfile: metadata?.researchProfile as any,
      isActive: true,
      version: 1
    }
  });

  // Create individual session records for better querying
  await createAgendaSessions(personalizedAgenda.id, agenda);

  // Create initial version record
  await prisma.agendaVersion.create({
    data: {
      agendaId: personalizedAgenda.id,
      version: 1,
      agendaData: agenda as any,
      changeDescription: 'Initial agenda creation',
      changedBy: metadata?.generatedBy || 'ai_agent'
    }
  });

  return transformToStoredAgenda(personalizedAgenda);
}

/**
 * Get the active agenda for a user
 */
export async function getActiveAgenda(userId: string): Promise<StoredAgenda | null> {
  const agenda = await prisma.personalizedAgenda.findFirst({
    where: {
      userId,
      isActive: true
    },
    include: {
      sessions: {
        include: {
          session: true
        }
      },
      versions: {
        orderBy: {
          version: 'desc'
        },
        take: 1
      }
    }
  });

  if (!agenda) return null;

  return transformToStoredAgenda(agenda);
}

/**
 * Check if user has any existing agendas
 */
export async function hasExistingAgenda(userId: string): Promise<boolean> {
  const count = await prisma.personalizedAgenda.count({
    where: { userId }
  });

  return count > 0;
}

/**
 * Update an existing agenda
 */
export async function updatePersonalizedAgenda(
  agendaId: string,
  updatedAgenda: SmartAgenda,
  options: AgendaUpdateOptions = {}
): Promise<StoredAgenda> {
  const currentAgenda = await prisma.personalizedAgenda.findUnique({
    where: { id: agendaId }
  });

  if (!currentAgenda) {
    throw new Error('Agenda not found');
  }

  const newVersion = currentAgenda.version + 1;

  // Update the agenda
  const updated = await prisma.personalizedAgenda.update({
    where: { id: agendaId },
    data: {
      agendaData: updatedAgenda as any,
      version: newVersion,
      metadata: {
        ...(currentAgenda.metadata as any),
        totalSessions: countTotalSessions(updatedAgenda),
        favoriteSessions: countFavoriteSessions(updatedAgenda),
        lastModifiedBy: options.changedBy || 'user'
      }
    }
  });

  // Create version record if requested
  if (options.createVersion) {
    await prisma.agendaVersion.create({
      data: {
        agendaId,
        version: newVersion,
        agendaData: updatedAgenda as any,
        changeDescription: options.changeDescription || 'Agenda updated',
        changedBy: options.changedBy || 'user'
      }
    });
  }

  // Update session records
  await prisma.agendaSession.deleteMany({
    where: { agendaId }
  });
  await createAgendaSessions(agendaId, updatedAgenda);

  return transformToStoredAgenda(updated);
}

/**
 * Get agenda versions for rollback
 */
export async function getAgendaVersions(agendaId: string) {
  return await prisma.agendaVersion.findMany({
    where: { agendaId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      changeDescription: true,
      changedBy: true,
      createdAt: true
    }
  });
}

/**
 * Rollback to a specific version
 */
export async function rollbackToVersion(
  agendaId: string,
  versionId: string
): Promise<StoredAgenda> {
  const version = await prisma.agendaVersion.findUnique({
    where: { id: versionId }
  });

  if (!version || version.agendaId !== agendaId) {
    throw new Error('Version not found or does not belong to this agenda');
  }

  return updatePersonalizedAgenda(
    agendaId,
    version.agendaData as SmartAgenda,
    {
      createVersion: true,
      changeDescription: `Rolled back to version ${version.version}`,
      changedBy: 'user'
    }
  );
}

/**
 * Helper: Create individual session records
 */
async function createAgendaSessions(agendaId: string, agenda: SmartAgenda) {
  const sessionRecords = [];

  for (const [dayKey, daySchedule] of Object.entries(agenda.days)) {
    const dayNumber = parseInt(dayKey.replace('day', ''));

    for (const item of daySchedule.sessions) {
      if (item.type === 'session' && item.sessionId) {
        sessionRecords.push({
          agendaId,
          sessionId: item.sessionId,
          dayNumber,
          priority: item.priority || 50,
          isLocked: item.isLocked || false,
          isFavorite: item.isFavorite || false,
          addedReason: item.reason,
          conflictResolved: item.conflictInfo?.resolved || false,
          alternativeFor: item.conflictInfo?.alternativeFor
        });
      }
    }
  }

  if (sessionRecords.length > 0) {
    await prisma.agendaSession.createMany({
      data: sessionRecords
    });
  }
}

/**
 * Helper: Count total sessions in agenda
 */
function countTotalSessions(agenda: SmartAgenda): number {
  let count = 0;
  for (const daySchedule of Object.values(agenda.days)) {
    count += daySchedule.sessions.filter(s => s.type === 'session').length;
  }
  return count;
}

/**
 * Helper: Count favorite sessions in agenda
 */
function countFavoriteSessions(agenda: SmartAgenda): number {
  let count = 0;
  for (const daySchedule of Object.values(agenda.days)) {
    count += daySchedule.sessions.filter(s => s.type === 'session' && s.isFavorite).length;
  }
  return count;
}

/**
 * Helper: Transform Prisma model to StoredAgenda interface
 */
function transformToStoredAgenda(prismaAgenda: any): StoredAgenda {
  return {
    id: prismaAgenda.id,
    userId: prismaAgenda.userId,
    title: prismaAgenda.title,
    description: prismaAgenda.description,
    agendaData: prismaAgenda.agendaData as SmartAgenda,
    metadata: prismaAgenda.metadata as AgendaMetadata,
    isActive: prismaAgenda.isActive,
    version: prismaAgenda.version,
    generatedBy: prismaAgenda.generatedBy,
    researchProfile: prismaAgenda.researchProfile as EnrichedUserProfile,
    createdAt: prismaAgenda.createdAt,
    updatedAt: prismaAgenda.updatedAt
  };
}

/**
 * Delete an agenda (soft delete by deactivating)
 */
export async function deleteAgenda(agendaId: string, userId: string): Promise<void> {
  await prisma.personalizedAgenda.updateMany({
    where: {
      id: agendaId,
      userId // Ensure user owns this agenda
    },
    data: {
      isActive: false
    }
  });
}

/**
 * Get all agendas for a user (including inactive)
 */
export async function getUserAgendas(userId: string): Promise<StoredAgenda[]> {
  const agendas = await prisma.personalizedAgenda.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return agendas.map(transformToStoredAgenda);
}