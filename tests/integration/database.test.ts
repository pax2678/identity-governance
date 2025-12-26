// Integration tests for database connectivity and Prisma setup
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { setupDatabase, teardownDatabase } from '../setup/db.setup'

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await setupDatabase()
  })

  afterAll(async () => {
    await teardownDatabase()
  })

  describe('Database Connection', () => {
    it('should connect to database and execute raw query', async () => {
      const result = await db.$queryRaw<Array<{ current_time: Date }>>`
        SELECT NOW() as current_time
      `

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('current_time')
    })

    it('should have all required schema tables', async () => {
      const tables = await db.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `

      expect(tables).toBeDefined()
      expect(tables.length).toBeGreaterThanOrEqual(11)

      const tableNames = tables.map((t) => t.tablename)

      // Verify core IGA tables exist
      expect(tableNames).toContain('identities')
      expect(tableNames).toContain('accounts')
      expect(tableNames).toContain('entitlements')
      expect(tableNames).toContain('identity_account_links')
      expect(tableNames).toContain('account_entitlement_grants')
      expect(tableNames).toContain('access_assignments')
      expect(tableNames).toContain('systems')
      expect(tableNames).toContain('certification_campaigns')
      expect(tableNames).toContain('certification_reviews')
      expect(tableNames).toContain('audit_events')
    })
  })

  describe('Identity CRUD Operations', () => {
    let createdIdentityId: string

    it('should create an identity record', async () => {
      const identity = await db.identity.create({
        data: {
          identityType: 'HUMAN',
          displayName: 'Test User',
          status: 'ACTIVE',
          identitySource: 'TEST',
          attributes: {
            email: 'test@example.com',
            dept: 'Engineering',
            _test: true, // Marker for cleanup
          },
        },
      })

      expect(identity).toBeDefined()
      expect(identity.id).toBeDefined()
      expect(identity.displayName).toBe('Test User')
      expect(identity.identityType).toBe('HUMAN')
      expect(identity.status).toBe('ACTIVE')

      createdIdentityId = identity.id
    })

    it('should query identity by id', async () => {
      expect(createdIdentityId).toBeDefined()

      const foundIdentity = await db.identity.findUnique({
        where: { id: createdIdentityId },
      })

      expect(foundIdentity).toBeDefined()
      expect(foundIdentity?.id).toBe(createdIdentityId)
      expect(foundIdentity?.displayName).toBe('Test User')
    })

    it('should update identity record', async () => {
      expect(createdIdentityId).toBeDefined()

      const updatedIdentity = await db.identity.update({
        where: { id: createdIdentityId },
        data: { displayName: 'Updated Test User' },
      })

      expect(updatedIdentity).toBeDefined()
      expect(updatedIdentity.displayName).toBe('Updated Test User')
    })

    it('should delete identity record', async () => {
      expect(createdIdentityId).toBeDefined()

      await db.identity.delete({
        where: { id: createdIdentityId },
      })

      const deletedIdentity = await db.identity.findUnique({
        where: { id: createdIdentityId },
      })

      expect(deletedIdentity).toBeNull()
    })
  })

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key constraints on identity_account_links', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000'

      await expect(
        db.identityAccountLink.create({
          data: {
            identityId: fakeUuid,
            accountId: fakeUuid,
            relationType: 'DIRECT',
            source: 'DISCOVERED',
            startTime: new Date(),
          },
        })
      ).rejects.toThrow()
    })
  })
})
