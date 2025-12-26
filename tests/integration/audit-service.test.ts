// Integration tests for audit logging service
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import { auditLogService } from '@/lib/services/audit/audit-log.service'
import { EventOutcome } from '@prisma/client'
import { db } from '@/lib/db'
import { setupDatabase, teardownDatabase, createTestIdentity } from '../setup/db.setup'

describe('Audit Service Integration Tests', () => {
  let testIdentityId: string
  const testEventIds: string[] = []

  beforeAll(async () => {
    await setupDatabase()

    // Create test identity for actor reference
    const testIdentity = await createTestIdentity({
      displayName: 'Test Actor',
      email: 'actor@test.com',
    })
    testIdentityId = testIdentity.id
  })

  afterEach(async () => {
    // Cleanup events created during tests
    if (testEventIds.length > 0) {
      await db.event.deleteMany({
        where: {
          id: { in: testEventIds },
        },
      })
      testEventIds.length = 0 // Clear array
    }
  })

  afterAll(async () => {
    // Cleanup test identity
    await db.identity.delete({ where: { id: testIdentityId } })
    await teardownDatabase()
  })

  describe('Event Logging', () => {
    it('should log a simple audit event', async () => {
      const eventId = await auditLogService.logEvent({
        eventType: 'IdentityCreated',
        actorIdentityId: testIdentityId,
        resourceType: 'Identity',
        resourceId: testIdentityId,
        action: 'CREATE',
        outcome: EventOutcome.SUCCESS,
        metadata: {
          identityType: 'HUMAN',
          displayName: 'Test User',
        },
      })

      testEventIds.push(eventId)

      expect(eventId).toBeDefined()
      expect(typeof eventId).toBe('string')

      // Verify event was created
      const event = await db.event.findUnique({ where: { id: eventId } })
      expect(event).toBeDefined()
      expect(event?.eventType).toBe('IdentityCreated')
      expect(event?.outcome).toBe(EventOutcome.SUCCESS)
    })

    it('should log event with evidence hashing', async () => {
      const evidenceData = {
        screenshot: 'base64-encoded-image',
        documentUrl: 'https://docs.example.com/approval-doc.pdf',
      }

      const eventId = await auditLogService.logEvent({
        eventType: 'AccessApproved',
        actorIdentityId: testIdentityId,
        resourceType: 'AccessAssignment',
        resourceId: testIdentityId,
        action: 'APPROVE',
        outcome: EventOutcome.SUCCESS,
        evidenceData,
      })

      testEventIds.push(eventId)

      expect(eventId).toBeDefined()

      // Verify evidence hash was created
      const event = await db.event.findUnique({ where: { id: eventId } })
      expect(event).toBeDefined()
      expect(event?.evidenceHash).toBeDefined()
      expect(typeof event?.evidenceHash).toBe('string')
      expect(event?.evidenceHash?.length).toBeGreaterThan(0)
    })

    it('should verify evidence integrity', async () => {
      const evidenceData = {
        screenshot: 'base64-encoded-image',
        documentUrl: 'https://docs.example.com/approval-doc.pdf',
        timestamp: '2024-12-25T10:00:00Z',
      }

      const eventId = await auditLogService.logEvent({
        eventType: 'AccessApproved',
        actorIdentityId: testIdentityId,
        resourceType: 'AccessAssignment',
        resourceId: testIdentityId,
        action: 'APPROVE',
        outcome: EventOutcome.SUCCESS,
        evidenceData,
      })

      testEventIds.push(eventId)

      const event = await db.event.findUnique({ where: { id: eventId } })
      expect(event?.evidenceHash).toBeDefined()

      // Verify with same data
      const isValid = auditLogService.verifyEvidence(
        evidenceData,
        event!.evidenceHash!
      )
      expect(isValid).toBe(true)

      // Verify with tampered data
      const tamperedData = { ...evidenceData, screenshot: 'modified-data' }
      const isTamperedValid = auditLogService.verifyEvidence(
        tamperedData,
        event!.evidenceHash!
      )
      expect(isTamperedValid).toBe(false)
    })
  })

  describe('Event Querying', () => {
    beforeEach(async () => {
      // Create multiple events for querying
      const event1 = await auditLogService.logEvent({
        eventType: 'IdentityCreated',
        actorIdentityId: testIdentityId,
        resourceType: 'Identity',
        resourceId: testIdentityId,
        action: 'CREATE',
        outcome: EventOutcome.SUCCESS,
      })
      testEventIds.push(event1)

      const event2 = await auditLogService.logEvent({
        eventType: 'AccessApproved',
        actorIdentityId: testIdentityId,
        resourceType: 'AccessAssignment',
        resourceId: testIdentityId,
        action: 'APPROVE',
        outcome: EventOutcome.SUCCESS,
      })
      testEventIds.push(event2)

      const event3 = await auditLogService.logEvent({
        eventType: 'AccessRejected',
        actorIdentityId: testIdentityId,
        resourceType: 'AccessAssignment',
        resourceId: testIdentityId,
        action: 'REJECT',
        outcome: EventOutcome.FAILURE,
      })
      testEventIds.push(event3)
    })

    it('should query events by type', async () => {
      const events = await auditLogService.queryEvents({
        eventType: 'IdentityCreated',
        limit: 10,
      })

      expect(events).toBeDefined()
      expect(Array.isArray(events)).toBe(true)
      expect(events.length).toBeGreaterThan(0)
      expect(events.every((e) => e.eventType === 'IdentityCreated')).toBe(true)
    })

    it('should query events by outcome', async () => {
      const events = await auditLogService.queryEvents({
        outcome: EventOutcome.SUCCESS,
        limit: 10,
      })

      expect(events).toBeDefined()
      expect(events.length).toBeGreaterThan(0)
      expect(events.every((e) => e.outcome === EventOutcome.SUCCESS)).toBe(true)
    })

    it('should query events by actor', async () => {
      const events = await auditLogService.queryEvents({
        actorIdentityId: testIdentityId,
        limit: 10,
      })

      expect(events).toBeDefined()
      expect(events.length).toBeGreaterThan(0)
      expect(events.every((e) => e.actorIdentityId === testIdentityId)).toBe(true)
    })

    it('should respect query limit', async () => {
      const events = await auditLogService.queryEvents({
        limit: 2,
      })

      expect(events.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Resource History', () => {
    it('should retrieve resource audit history', async () => {
      const history = await auditLogService.getResourceHistory(
        'Identity',
        testIdentityId,
        10
      )

      expect(history).toBeDefined()
      expect(Array.isArray(history)).toBe(true)
      expect(history.every((e) => e.resourceId === testIdentityId)).toBe(true)
      expect(history.every((e) => e.resourceType === 'Identity')).toBe(true)
    })

    it('should return empty array for resource with no history', async () => {
      const fakeResourceId = '00000000-0000-0000-0000-000000000000'

      const history = await auditLogService.getResourceHistory(
        'Identity',
        fakeResourceId,
        10
      )

      expect(history).toBeDefined()
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBe(0)
    })
  })

  describe('Event Statistics', () => {
    it('should calculate event statistics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      const endDate = new Date()

      const stats = await auditLogService.getEventStatistics(startDate, endDate)

      expect(stats).toBeDefined()
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('byOutcome')
      expect(stats).toHaveProperty('byType')

      expect(typeof stats.total).toBe('number')
      expect(stats.total).toBeGreaterThanOrEqual(0)

      expect(stats.byOutcome).toBeDefined()
      expect(typeof stats.byOutcome.SUCCESS).toBe('number')
      expect(typeof stats.byOutcome.FAILURE).toBe('number')
      expect(typeof stats.byOutcome.PENDING).toBe('number')

      expect(stats.byType).toBeDefined()
      expect(typeof stats.byType).toBe('object')
    })

    it('should return zero statistics for empty time range', async () => {
      const startDate = new Date('2000-01-01')
      const endDate = new Date('2000-01-02')

      const stats = await auditLogService.getEventStatistics(startDate, endDate)

      expect(stats.total).toBe(0)
      expect(stats.byOutcome.SUCCESS).toBe(0)
      expect(stats.byOutcome.FAILURE).toBe(0)
      expect(stats.byOutcome.PENDING).toBe(0)
    })
  })
})
