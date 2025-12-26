# Testing Strategy (TDD Approach)

**Status**: ✅ Vitest migration complete
**Last Updated**: 2025-12-25

## Overview

We've adopted a TDD approach using Vitest as the official Next.js recommended testing framework. All 125 tests are now passing across unit, integration, and contract test suites.

## Current Testing Setup

### ✅ Vitest Test Suite (Official Next.js Recommendation)

We're using **Vitest 3.2.4** following the official Next.js testing documentation. This is the officially recommended version for Next.js 14.

**Status**: ✅ All 125 tests passing across 9 test files

Test coverage includes:
- **Unit tests** (45 tests): Fast, isolated tests for pure functions
- **Integration tests** (50 tests): Tests with real dependencies (database)
- **Contract tests** (30 tests): Interface compliance tests for connectors

### Key Configuration

The Vitest setup follows the official Next.js [with-vitest example](https://github.com/vercel/next.js/tree/canary/examples/with-vitest):

[vitest.config.ts](vitest.config.ts):
\`\`\`typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
  },
})
\`\`\`

**Critical dependencies**:
- \`vitest@3.2.4\` (NOT 4.x - incompatible with Next.js 14)
- \`@vitest/ui@3.2.4\`
- \`@vitest/coverage-v8@3.2.4\`
- \`vite-tsconfig-paths@6.0.3\` (required for TypeScript path resolution)
- \`@vitejs/plugin-react@5.1.2\` (required for React component testing)

## Test Directory Structure

\`\`\`
tests/
├── setup/
│   ├── vitest.setup.ts          # Vitest configuration
│   └── db.setup.ts               # Database helpers for tests
├── unit/
│   └── models/
│       ├── entitlement.test.ts   # Risk scoring logic
│       ├── grant.test.ts         # State machine logic
│       └── access-assignment.test.ts  # SLA breach logic
├── integration/
│   ├── database.test.ts          # Prisma and DB connectivity
│   ├── domain-models.test.ts     # Full model validation
│   ├── connector-framework.test.ts  # Connector lifecycle
│   └── audit-service.test.ts     # Audit logging
└── contract/
    └── connector-interface.test.ts  # IConnector contract compliance
\`\`\`

## Test Coverage

|  Category | Tests | Status |
|-----------|-------|--------|
| Vitest Unit Tests | 45 | ✅ All passing |
| Vitest Integration Tests | 50 | ✅ All passing |
| Vitest Contract Tests | 30 | ✅ All passing |
| **Total** | **125** | **✅ 100% passing** |

## Writing New Tests

All new tests should be written using Vitest following these patterns:

### Unit Test Pattern
\`\`\`typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should calculate correctly', () => {
    const result = myFunction(input)
    expect(result).toBe(expectedOutput)
  })
})
\`\`\`

### Integration Test Pattern
\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db'

describe('MyFeature Integration Tests', () => {
  // Cleanup test data after each test
  afterEach(async () => {
    await db.myModel.deleteMany({
      where: { displayName: { contains: 'Test' } }
    })
  })

  // Disconnect after all tests complete
  afterAll(async () => {
    await db.$disconnect()
  })

  it('should create record in database', async () => {
    const result = await db.myModel.create({ data: testData })
    expect(result.id).toBeDefined()
  })
})
\`\`\`

### Contract Test Pattern
\`\`\`typescript
import { describe, it, expect } from 'vitest'

describe('MyInterface Contract Tests', () => {
  it('should implement required methods', () => {
    expect(implementation).toHaveProperty('requiredMethod')
    expect(typeof implementation.requiredMethod).toBe('function')
  })

  it('should return expected shape', async () => {
    const result = await implementation.requiredMethod()
    expect(Array.isArray(result)).toBe(true)
  })
})
\`\`\`

## Test Helpers

**Database Helpers** ([tests/setup/db.setup.ts](tests/setup/db.setup.ts)):
\`\`\`typescript
import { setupDatabase, teardownDatabase, cleanupTestData } from '../setup/db.setup'

beforeAll(async () => {
  await setupDatabase()
})

afterAll(async () => {
  await cleanupTestData()
  await teardownDatabase()
})
\`\`\`

**Test Data Markers**:
All test records should include a \`_test: true\` marker in their metadata/attributes for easy cleanup:
\`\`\`typescript
await db.identity.create({
  data: {
    displayName: 'Test User',
    attributes: {
      email: 'test@example.com',
      _test: true,  // Marker for cleanup
    },
  },
})
\`\`\`

## Running Tests

### Test Commands
\`\`\`bash
# Run all tests
npm run test:all

# Run by type
npm run test:unit
npm run test:integration
npm run test:contract

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui

# Run all tests (interactive)
npm test
\`\`\`

## TDD Workflow

1. **Write failing test first**:
   \`\`\`bash
   npm run test:watch
   \`\`\`

2. **Implement minimum code to pass**

3. **Refactor while keeping tests green**

4. **Run full suite before commit**:
   \`\`\`bash
   npm run test:all
   \`\`\`

## Troubleshooting

### Database Connection Errors
\`\`\`bash
# Check PostgreSQL is running
docker ps | grep iga-postgres

# Restart if needed
docker start iga-postgres
\`\`\`

### Test Data Cleanup
If test data isn't being cleaned up properly:
\`\`\`typescript
import { cleanupTestData } from '../setup/db.setup'

afterEach(async () => {
  await cleanupTestData()
})
\`\`\`

### Vitest Version Issues
**IMPORTANT**: Always use Vitest 3.2.4 for Next.js 14 compatibility. Vitest 4.x is incompatible.

If you accidentally upgrade to 4.x:
\`\`\`bash
npm install -D vitest@3.2.4 @vitest/ui@3.2.4 @vitest/coverage-v8@3.2.4
\`\`\`

## References

- [Vitest Documentation](https://vitest.dev/)
- [Next.js Testing with Vitest](https://nextjs.org/docs/app/guides/testing#vitest)
- [Official Next.js with-vitest Example](https://github.com/vercel/next.js/tree/canary/examples/with-vitest)
- Phase 2 Testing Guide: [TESTING.md](TESTING.md)
