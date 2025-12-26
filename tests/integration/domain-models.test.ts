// Integration tests for domain models and Zod validation
import { describe, it, expect } from 'vitest'
import {
  CreateIdentitySchema,
  CreateIdentityInput,
} from '@/lib/models/identity'
import {
  CreateAccountSchema,
  CreateIdentityAccountLinkSchema,
} from '@/lib/models/account'
import {
  CreateEntitlementSchema,
  calculateRiskScore,
} from '@/lib/models/entitlement'
import { CreateGrantSchema, isGrantActive } from '@/lib/models/grant'
import {
  CreateAccessAssignmentSchema,
  isSlaBreached,
} from '@/lib/models/access-assignment'
import {
  GrantState,
  SubjectType,
  TargetType,
  AssignmentAction,
  ApprovalState,
} from '@prisma/client'

describe('Domain Model Integration Tests', () => {
  describe('Identity Model', () => {
    it('should validate a valid human identity', () => {
      const validIdentity: CreateIdentityInput = {
        identityType: 'HUMAN',
        displayName: 'John Doe',
        status: 'ACTIVE',
        identitySource: 'HRIS',
        attributes: {
          email: 'john.doe@example.com',
          dept: 'Engineering',
        },
      }

      const result = CreateIdentitySchema.safeParse(validIdentity)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayName).toBe('John Doe')
        expect(result.data.identityType).toBe('HUMAN')
      }
    })

    it('should reject non-human identity without owner', () => {
      const invalidIdentity = {
        identityType: 'SERVICE',
        displayName: 'API Service',
        status: 'ACTIVE',
        identitySource: 'Manual',
      }

      const result = CreateIdentitySchema.safeParse(invalidIdentity)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Non-human identities must have an owner'
        )
      }
    })

    it('should accept non-human identity with owner', () => {
      const validServiceIdentity = {
        identityType: 'SERVICE',
        displayName: 'API Service',
        status: 'ACTIVE',
        identitySource: 'Manual',
        ownerIdentityId: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = CreateIdentitySchema.safeParse(validServiceIdentity)

      expect(result.success).toBe(true)
    })
  })

  describe('Account Model', () => {
    it('should validate a valid account', () => {
      const validAccount = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        accountType: 'ldap_user',
        nativeId: 'cn=john,dc=example,dc=com',
        status: 'ACTIVE',
        lastSeenAt: new Date(),
        metadata: {
          dn: 'cn=john,dc=example,dc=com',
        },
      }

      const result = CreateAccountSchema.safeParse(validAccount)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accountType).toBe('ldap_user')
        expect(result.data.status).toBe('ACTIVE')
      }
    })

    it('should validate identity-account link with time bounds', () => {
      const startTime = new Date('2024-01-01T00:00:00Z')
      const endTime = new Date('2024-01-08T00:00:00Z') // 7 days later

      const validLink = {
        identityId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        relationType: 'PRIMARY',
        source: 'BIRTHRIGHT',
        startTime,
        endTime,
      }

      const result = CreateIdentityAccountLinkSchema.safeParse(validLink)

      expect(result.success).toBe(true)
    })

    it('should reject link where end time is before start time', () => {
      const startTime = new Date()
      const endTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago

      const invalidLink = {
        identityId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        relationType: 'PRIMARY',
        source: 'BIRTHRIGHT',
        startTime,
        endTime,
      }

      const result = CreateIdentityAccountLinkSchema.safeParse(invalidLink)

      expect(result.success).toBe(false)
    })
  })

  describe('Entitlement Risk Scoring', () => {
    it('should calculate risk score correctly', () => {
      const riskScore = calculateRiskScore({
        isPrivileged: true,
        systemCriticality: 80,
        accessBreadth: 50,
        userCount: 10,
      })

      // Expected: 50 (privileged) + 20 (criticality) + 5 (breadth) + 0 (users) = 75
      expect(riskScore).toBe(75)
    })

    it('should cap risk score at 100', () => {
      const riskScore = calculateRiskScore({
        isPrivileged: true,
        systemCriticality: 100,
        accessBreadth: 200,
        userCount: 1000,
      })

      expect(riskScore).toBeLessThanOrEqual(100)
    })

    it('should reject privileged entitlement with low risk score', () => {
      const invalidEntitlement = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementType: 'role',
        nativeId: 'admin-role',
        displayName: 'Administrator',
        isPrivileged: true,
        riskScore: 25, // Too low for privileged
      }

      const result = CreateEntitlementSchema.safeParse(invalidEntitlement)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Privileged entitlements must have risk score >= 50'
        )
      }
    })

    it('should accept privileged entitlement with adequate risk score', () => {
      const validEntitlement = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementType: 'role',
        nativeId: 'admin-role',
        displayName: 'Administrator',
        isPrivileged: true,
        riskScore: 75,
      }

      const result = CreateEntitlementSchema.safeParse(validEntitlement)

      expect(result.success).toBe(true)
    })
  })

  describe('Grant State Machine', () => {
    it('should identify active grant correctly', () => {
      const activeGrant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementId: '550e8400-e29b-41d4-a716-446655440000',
        grantType: 'DIRECT' as const,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        state: GrantState.ACTIVE,
        provisioningTaskId: null,
        accessAssignmentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const isActive = isGrantActive(activeGrant)

      expect(isActive).toBe(true)
    })

    it('should identify expired grant correctly', () => {
      const expiredGrant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementId: '550e8400-e29b-41d4-a716-446655440000',
        grantType: 'DIRECT' as const,
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        state: GrantState.ACTIVE,
        provisioningTaskId: null,
        accessAssignmentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const isActive = isGrantActive(expiredGrant)

      expect(isActive).toBe(false)
    })

    it('should identify grant not yet started', () => {
      const futureGrant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementId: '550e8400-e29b-41d4-a716-446655440000',
        grantType: 'DIRECT' as const,
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        state: GrantState.ACTIVE,
        provisioningTaskId: null,
        accessAssignmentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const isActive = isGrantActive(futureGrant)

      expect(isActive).toBe(false)
    })
  })

  describe('Access Assignment SLA Tracking', () => {
    it('should detect SLA breach', () => {
      const breachedAssignment = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        subjectType: SubjectType.IDENTITY,
        targetId: '550e8400-e29b-41d4-a716-446655440000',
        targetType: TargetType.ENTITLEMENT,
        action: AssignmentAction.GRANT,
        requestorId: '550e8400-e29b-41d4-a716-446655440000',
        approvalState: ApprovalState.PENDING_APPROVAL,
        approvers: [],
        justification: 'Need access for project work',
        ticketRef: null,
        slaDeadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (breached)
        isTimeBound: false,
        endTime: null,
        evidence: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const breached = isSlaBreached(breachedAssignment)

      expect(breached).toBe(true)
    })

    it('should not report breach when SLA is not exceeded', () => {
      const onTimeAssignment = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        subjectType: SubjectType.IDENTITY,
        targetId: '550e8400-e29b-41d4-a716-446655440000',
        targetType: TargetType.ENTITLEMENT,
        action: AssignmentAction.GRANT,
        requestorId: '550e8400-e29b-41d4-a716-446655440000',
        approvalState: ApprovalState.PENDING_APPROVAL,
        approvers: [],
        justification: 'Need access for project work',
        ticketRef: null,
        slaDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isTimeBound: false,
        endTime: null,
        evidence: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const breached = isSlaBreached(onTimeAssignment)

      expect(breached).toBe(false)
    })

    it('should not report breach when already approved', () => {
      const approvedAssignment = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        subjectType: SubjectType.IDENTITY,
        targetId: '550e8400-e29b-41d4-a716-446655440000',
        targetType: TargetType.ENTITLEMENT,
        action: AssignmentAction.GRANT,
        requestorId: '550e8400-e29b-41d4-a716-446655440000',
        approvalState: ApprovalState.APPROVED,
        approvers: [],
        justification: 'Need access for project work',
        ticketRef: null,
        slaDeadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        isTimeBound: false,
        endTime: null,
        evidence: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const breached = isSlaBreached(approvedAssignment)

      expect(breached).toBe(false)
    })
  })
})
