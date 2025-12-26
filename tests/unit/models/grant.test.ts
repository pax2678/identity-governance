// Unit tests for Grant domain model
import { describe, it, expect } from 'vitest'
import {
  isGrantActive,
  isValidStateTransition,
  GrantStateTransitions,
} from '@/lib/models/grant'
import { GrantState } from '@prisma/client'

describe('Grant Model - Unit Tests', () => {
  describe('isGrantActive()', () => {
    const baseGrant = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      entitlementId: '550e8400-e29b-41d4-a716-446655440000',
      grantType: 'DIRECT' as const,
      provisioningTaskId: null,
      accessAssignmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return true for active grant within time bounds', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.ACTIVE,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }

      expect(isGrantActive(grant)).toBe(true)
    })

    it('should return false for grant not yet started', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.ACTIVE,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }

      expect(isGrantActive(grant)).toBe(false)
    })

    it('should return false for expired grant', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.ACTIVE,
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      }

      expect(isGrantActive(grant)).toBe(false)
    })

    it('should return false for PENDING grant', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.PENDING,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      expect(isGrantActive(grant)).toBe(false)
    })

    it('should return false for REVOKED grant', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.REVOKED,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      expect(isGrantActive(grant)).toBe(false)
    })

    it('should return false for EXPIRED state', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.EXPIRED,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      expect(isGrantActive(grant)).toBe(false)
    })

    it('should return false for FAILED grant', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.FAILED,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      expect(isGrantActive(grant)).toBe(false)
    })

    it('should handle grant without endTime (permanent grant)', () => {
      const grant = {
        ...baseGrant,
        state: GrantState.ACTIVE,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: null,
      }

      expect(isGrantActive(grant)).toBe(true)
    })

    it('should return true for grant starting exactly now', () => {
      const now = new Date()
      const grant = {
        ...baseGrant,
        state: GrantState.ACTIVE,
        startTime: now,
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      }

      expect(isGrantActive(grant)).toBe(true)
    })
  })

  describe('Grant State Transitions', () => {
    it('should allow PENDING → ACTIVE transition', () => {
      expect(isValidStateTransition(GrantState.PENDING, GrantState.ACTIVE)).toBe(true)
    })

    it('should allow PENDING → FAILED transition', () => {
      expect(isValidStateTransition(GrantState.PENDING, GrantState.FAILED)).toBe(true)
    })

    it('should not allow PENDING → EXPIRED transition', () => {
      expect(isValidStateTransition(GrantState.PENDING, GrantState.EXPIRED)).toBe(false)
    })

    it('should allow ACTIVE → EXPIRED transition', () => {
      expect(isValidStateTransition(GrantState.ACTIVE, GrantState.EXPIRED)).toBe(true)
    })

    it('should allow ACTIVE → REVOKED transition', () => {
      expect(isValidStateTransition(GrantState.ACTIVE, GrantState.REVOKED)).toBe(true)
    })

    it('should not allow ACTIVE → PENDING transition', () => {
      expect(isValidStateTransition(GrantState.ACTIVE, GrantState.PENDING)).toBe(false)
    })

    it('should allow FAILED → PENDING transition (retry)', () => {
      expect(isValidStateTransition(GrantState.FAILED, GrantState.PENDING)).toBe(true)
    })

    it('should allow FAILED → REVOKED transition', () => {
      expect(isValidStateTransition(GrantState.FAILED, GrantState.REVOKED)).toBe(true)
    })

    it('should allow EXPIRED → REVOKED transition', () => {
      expect(isValidStateTransition(GrantState.EXPIRED, GrantState.REVOKED)).toBe(true)
    })

    it('should not allow transitions FROM REVOKED state', () => {
      expect(isValidStateTransition(GrantState.REVOKED, GrantState.ACTIVE)).toBe(false)
      expect(isValidStateTransition(GrantState.REVOKED, GrantState.PENDING)).toBe(false)
      expect(isValidStateTransition(GrantState.REVOKED, GrantState.EXPIRED)).toBe(false)
      expect(isValidStateTransition(GrantState.REVOKED, GrantState.FAILED)).toBe(false)
    })

    it('should have defined transitions for all states', () => {
      const allStates = Object.values(GrantState)

      allStates.forEach((state) => {
        expect(GrantStateTransitions).toHaveProperty(state)
        expect(Array.isArray(GrantStateTransitions[state])).toBe(true)
      })
    })
  })
})
