// T033: Audit Log Service
// Centralized audit logging service for all IGA events
// Per FR-031: Immutable audit log for compliance

import { db } from '@/lib/db'
import { EventOutcome, Prisma } from '@prisma/client'
import crypto from 'crypto'

/**
 * Audit event data structure
 */
export interface AuditEventData {
  eventType: string
  actorIdentityId?: string
  resourceType: string
  resourceId: string
  action: string
  outcome: EventOutcome
  metadata?: Record<string, unknown>
  evidenceData?: unknown
}

/**
 * Audit query filters
 */
export interface AuditQueryFilters {
  eventType?: string
  actorIdentityId?: string
  resourceType?: string
  resourceId?: string
  outcome?: EventOutcome
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Audit Log Service
 * Provides immutable audit logging with cryptographic hashing
 */
export class AuditLogService {
  /**
   * Log an audit event (FR-031)
   * @param eventData - Event data to log
   * @returns Created event ID
   */
  async logEvent(eventData: AuditEventData): Promise<string> {
    const { evidenceData, actorIdentityId, metadata, ...coreData } = eventData

    // Generate cryptographic hash of evidence if provided (SC-013)
    const evidenceHash = evidenceData
      ? this.generateEvidenceHash(evidenceData)
      : null

    const event = await db.event.create({
      data: {
        ...coreData,
        actorIdentityId: actorIdentityId || null,
        metadata: (metadata || {}) as Prisma.JsonObject,
        evidenceHash,
        timestamp: new Date(),
      },
    })

    return event.id
  }

  /**
   * Log multiple events in batch
   * @param events - Array of event data
   * @returns Array of created event IDs
   */
  async logEventsBatch(events: AuditEventData[]): Promise<string[]> {
    const eventsData = events.map((eventData) => {
      const { evidenceData, actorIdentityId, metadata, ...coreData } = eventData
      const evidenceHash = evidenceData
        ? this.generateEvidenceHash(evidenceData)
        : null

      return {
        ...coreData,
        actorIdentityId: actorIdentityId || null,
        metadata: (metadata || {}) as Prisma.JsonObject,
        evidenceHash,
        timestamp: new Date(),
      }
    })

    const result = await db.event.createMany({
      data: eventsData,
    })

    // Note: createMany doesn't return IDs, so we return empty array
    // For individual IDs, use logEvent in a loop
    return []
  }

  /**
   * Query audit events (FR-031)
   * @param filters - Query filters
   * @returns Array of matching events
   */
  async queryEvents(filters: AuditQueryFilters) {
    const {
      eventType,
      actorIdentityId,
      resourceType,
      resourceId,
      outcome,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = filters

    const where: any = {}

    if (eventType) where.eventType = eventType
    if (actorIdentityId) where.actorIdentityId = actorIdentityId
    if (resourceType) where.resourceType = resourceType
    if (resourceId) where.resourceId = resourceId
    if (outcome) where.outcome = outcome

    // Time range filter (FR-031: time-range queries)
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    return db.event.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            identityType: true,
          },
        },
      },
    })
  }

  /**
   * Get events for a specific resource
   * @param resourceType - Resource type (e.g., "Identity", "Account")
   * @param resourceId - Resource ID
   * @param limit - Maximum number of events to return
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ) {
    return db.event.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            identityType: true,
          },
        },
      },
    })
  }

  /**
   * Get events by actor (who did what)
   * @param actorIdentityId - Actor identity ID
   * @param limit - Maximum number of events
   */
  async getActorActivity(actorIdentityId: string, limit: number = 50) {
    return db.event.findMany({
      where: {
        actorIdentityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get event statistics for a time period
   * @param startDate - Start of time period
   * @param endDate - End of time period
   */
  async getEventStatistics(startDate: Date, endDate: Date) {
    const events = await db.event.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        eventType: true,
        outcome: true,
      },
    })

    // Aggregate statistics
    const stats = {
      total: events.length,
      byType: {} as Record<string, number>,
      byOutcome: {
        SUCCESS: 0,
        FAILURE: 0,
        PENDING: 0,
      },
    }

    for (const event of events) {
      // Count by type
      stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1

      // Count by outcome
      stats.byOutcome[event.outcome]++
    }

    return stats
  }

  /**
   * Generate cryptographic hash of evidence (SC-013)
   * @param data - Evidence data to hash
   * @returns SHA-256 hash as hex string
   */
  private generateEvidenceHash(data: unknown): string {
    const dataString = JSON.stringify(data)
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Verify evidence integrity
   * @param data - Evidence data
   * @param expectedHash - Expected hash value
   * @returns true if hash matches
   */
  verifyEvidence(data: unknown, expectedHash: string): boolean {
    const actualHash = this.generateEvidenceHash(data)
    return actualHash === expectedHash
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService()
