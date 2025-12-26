// Unit tests for Entitlement domain model
import { describe, it, expect } from 'vitest'
import { calculateRiskScore, CreateEntitlementSchema } from '@/lib/models/entitlement'

describe('Entitlement Model - Unit Tests', () => {
  describe('calculateRiskScore()', () => {
    it('should return 50 for privileged flag alone', () => {
      const score = calculateRiskScore({
        isPrivileged: true,
        systemCriticality: 0,
        accessBreadth: 0,
        userCount: 0,
      })

      expect(score).toBe(50)
    })

    it('should return 0 for non-privileged with no other factors', () => {
      const score = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 0,
        accessBreadth: 0,
        userCount: 0,
      })

      expect(score).toBe(0)
    })

    it('should add 25% of system criticality to score', () => {
      const score = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 100,
        accessBreadth: 0,
        userCount: 0,
      })

      // 0 (not privileged) + 25 (100 * 0.25) = 25
      expect(score).toBe(25)
    })

    it('should add access breadth score (capped at 15)', () => {
      const score1 = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 0,
        accessBreadth: 50, // 50/10 = 5
        userCount: 0,
      })

      expect(score1).toBe(5)

      const score2 = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 0,
        accessBreadth: 200, // 200/10 = 20, capped at 15
        userCount: 0,
      })

      expect(score2).toBe(15)
    })

    it('should add user count score (capped at 10)', () => {
      const score1 = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 0,
        accessBreadth: 0,
        userCount: 50, // 50/50 = 1
      })

      expect(score1).toBe(1)

      const score2 = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 0,
        accessBreadth: 0,
        userCount: 1000, // 1000/50 = 20, capped at 10
      })

      expect(score2).toBe(10)
    })

    it('should calculate combined score correctly', () => {
      const score = calculateRiskScore({
        isPrivileged: true, // 50
        systemCriticality: 80, // 20 (80 * 0.25)
        accessBreadth: 50, // 5 (50 / 10)
        userCount: 10, // 0 (10 / 50 = 0.2, floored to 0)
      })

      // 50 + 20 + 5 + 0 = 75
      expect(score).toBe(75)
    })

    it('should cap total score at 100', () => {
      const score = calculateRiskScore({
        isPrivileged: true, // 50
        systemCriticality: 100, // 25
        accessBreadth: 200, // 15 (capped)
        userCount: 1000, // 10 (capped)
      })

      // 50 + 25 + 15 + 10 = 100
      expect(score).toBe(100)
    })

    it('should handle edge case with all maximum values', () => {
      const score = calculateRiskScore({
        isPrivileged: true,
        systemCriticality: 1000,
        accessBreadth: 10000,
        userCount: 100000,
      })

      expect(score).toBeLessThanOrEqual(100)
      expect(score).toBe(100)
    })

    it('should floor fractional scores', () => {
      const score = calculateRiskScore({
        isPrivileged: false,
        systemCriticality: 33, // 33 * 0.25 = 8.25, floored to 8
        accessBreadth: 15, // 15 / 10 = 1.5, floored to 1
        userCount: 25, // 25 / 50 = 0.5, floored to 0
      })

      // 0 + 8 + 1 + 0 = 9
      expect(score).toBe(9)
    })
  })

  describe('CreateEntitlementSchema', () => {
    it('should validate entitlement with all required fields', () => {
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

    it('should reject privileged entitlement with riskScore < 50', () => {
      const invalidEntitlement = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementType: 'role',
        nativeId: 'admin-role',
        displayName: 'Administrator',
        isPrivileged: true,
        riskScore: 40,
      }

      const result = CreateEntitlementSchema.safeParse(invalidEntitlement)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('risk score >= 50')
      }
    })

    it('should accept privileged entitlement with riskScore = 50', () => {
      const validEntitlement = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementType: 'role',
        nativeId: 'admin-role',
        displayName: 'Administrator',
        isPrivileged: true,
        riskScore: 50,
      }

      const result = CreateEntitlementSchema.safeParse(validEntitlement)

      expect(result.success).toBe(true)
    })

    it('should accept non-privileged entitlement with any riskScore', () => {
      const validEntitlement = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementType: 'group',
        nativeId: 'readers',
        displayName: 'Read-Only Users',
        isPrivileged: false,
        riskScore: 10,
      }

      const result = CreateEntitlementSchema.safeParse(validEntitlement)

      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for systemId', () => {
      const invalidEntitlement = {
        systemId: 'not-a-uuid',
        entitlementType: 'role',
        nativeId: 'admin-role',
        displayName: 'Administrator',
        isPrivileged: false,
        riskScore: 50,
      }

      const result = CreateEntitlementSchema.safeParse(invalidEntitlement)

      expect(result.success).toBe(false)
    })

    it('should require displayName', () => {
      const invalidEntitlement = {
        systemId: '550e8400-e29b-41d4-a716-446655440000',
        entitlementType: 'role',
        nativeId: 'admin-role',
        isPrivileged: false,
        riskScore: 50,
      }

      const result = CreateEntitlementSchema.safeParse(invalidEntitlement)

      expect(result.success).toBe(false)
    })
  })
})
