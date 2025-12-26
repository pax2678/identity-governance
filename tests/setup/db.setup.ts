// Database setup for integration tests
import { db } from '@/lib/db'

/**
 * Setup database connection before all tests
 */
export async function setupDatabase() {
  // Verify database connection
  try {
    await db.$connect()
  } catch (error) {
    console.error('Failed to connect to test database:', error)
    throw error
  }
}

/**
 * Cleanup database connection after all tests
 */
export async function teardownDatabase() {
  await db.$disconnect()
}

/**
 * Clean up test data created during tests
 * Use this in afterEach or afterAll hooks
 */
export async function cleanupTestData() {
  // Delete test records in reverse dependency order
  // to avoid foreign key constraint violations

  // Note: Only delete records created during tests
  // Consider using a test-specific identifier or schema

  await db.event.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.certificationReview.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.certificationCampaign.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.accessAssignment.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.accountEntitlementGrant.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.identityAccountLink.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.entitlement.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.account.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.identity.deleteMany({
    where: {
      attributes: {
        path: ['_test'],
        equals: true,
      },
    },
  })

  await db.system.deleteMany({
    where: {
      metadata: {
        path: ['_test'],
        equals: true,
      },
    },
  })
}

/**
 * Create test identity with _test marker
 * This allows us to clean up test data easily
 */
export async function createTestIdentity(data?: {
  displayName?: string
  email?: string
}) {
  return await db.identity.create({
    data: {
      identityType: 'HUMAN',
      displayName: data?.displayName || 'Test User',
      status: 'ACTIVE',
      identitySource: 'TEST',
      attributes: {
        email: data?.email || 'test@example.com',
        _test: true, // Marker for test cleanup
      },
    },
  })
}

/**
 * Create test system with _test marker
 */
export async function createTestSystem(data?: {
  name?: string
  systemType?: string
}) {
  return await db.system.create({
    data: {
      name: data?.name || 'Test System',
      systemType: data?.systemType || 'test',
      connectorFamily: 'ldap',
      connectionConfig: { host: 'localhost' },
      metadata: {
        _test: true, // Marker for test cleanup
      },
    },
  })
}
