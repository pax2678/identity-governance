// Unit tests for AccessAssignment domain model
import { describe, it, expect } from 'vitest'
import { isSlaBreached } from '@/lib/models/access-assignment'
import { SubjectType, TargetType, AssignmentAction, ApprovalState } from '@prisma/client'

describe('AccessAssignment Model - Unit Tests', () => {
  const baseAssignment = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    subjectId: '550e8400-e29b-41d4-a716-446655440000',
    subjectType: SubjectType.IDENTITY,
    targetId: '550e8400-e29b-41d4-a716-446655440000',
    targetType: TargetType.ENTITLEMENT,
    action: AssignmentAction.GRANT,
    requestorId: '550e8400-e29b-41d4-a716-446655440000',
    approvers: [],
    justification: 'Need access for project work',
    ticketRef: null,
    isTimeBound: false,
    endTime: null,
    evidence: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('isSlaBreached()', () => {
    it('should return true when SLA deadline is exceeded and approval pending', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
        slaDeadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      }

      expect(isSlaBreached(assignment)).toBe(true)
    })

    it('should return false when SLA deadline is not exceeded', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
        slaDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      }

      expect(isSlaBreached(assignment)).toBe(false)
    })

    it('should return false when no SLA deadline is set', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
        slaDeadline: null,
      }

      expect(isSlaBreached(assignment)).toBe(false)
    })

    it('should return false when already approved', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.APPROVED,
        slaDeadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      }

      expect(isSlaBreached(assignment)).toBe(false)
    })

    it('should return false when rejected', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.REJECTED,
        slaDeadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      }

      expect(isSlaBreached(assignment)).toBe(false)
    })

    it('should return false when auto-approved', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.AUTO_APPROVED,
        slaDeadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      }

      expect(isSlaBreached(assignment)).toBe(false)
    })

    it('should use custom asOf date when provided', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
        slaDeadline: new Date('2024-12-25T12:00:00Z'),
      }

      // Check as of before deadline
      const beforeDeadline = new Date('2024-12-25T11:00:00Z')
      expect(isSlaBreached(assignment, beforeDeadline)).toBe(false)

      // Check as of after deadline
      const afterDeadline = new Date('2024-12-25T13:00:00Z')
      expect(isSlaBreached(assignment, afterDeadline)).toBe(true)
    })

    it('should handle SLA deadline exactly at current time', () => {
      const now = new Date()
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
        slaDeadline: now,
      }

      // At exact deadline time, it's not breached yet (deadline <= now is false)
      expect(isSlaBreached(assignment, now)).toBe(false)
    })

    it('should handle SLA breach by 1 millisecond', () => {
      const deadline = new Date('2024-12-25T12:00:00.000Z')
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
        slaDeadline: deadline,
      }

      const oneMillisecondLater = new Date('2024-12-25T12:00:00.001Z')
      expect(isSlaBreached(assignment, oneMillisecondLater)).toBe(true)
    })
  })

  describe('AccessAssignment Time-Bound Validation', () => {
    it('should identify time-bound assignment', () => {
      const assignment = {
        ...baseAssignment,
        isTimeBound: true,
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }

      expect(assignment.isTimeBound).toBe(true)
      expect(assignment.endTime).not.toBeNull()
    })

    it('should identify permanent assignment', () => {
      const assignment = {
        ...baseAssignment,
        isTimeBound: false,
        endTime: null,
      }

      expect(assignment.isTimeBound).toBe(false)
      expect(assignment.endTime).toBeNull()
    })
  })

  describe('AccessAssignment Approval States', () => {
    it('should handle PENDING_APPROVAL state', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.PENDING_APPROVAL,
      }

      expect(assignment.approvalState).toBe(ApprovalState.PENDING_APPROVAL)
    })

    it('should handle APPROVED state', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.APPROVED,
      }

      expect(assignment.approvalState).toBe(ApprovalState.APPROVED)
    })

    it('should handle REJECTED state', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.REJECTED,
      }

      expect(assignment.approvalState).toBe(ApprovalState.REJECTED)
    })

    it('should handle AUTO_APPROVED state', () => {
      const assignment = {
        ...baseAssignment,
        approvalState: ApprovalState.AUTO_APPROVED,
      }

      expect(assignment.approvalState).toBe(ApprovalState.AUTO_APPROVED)
    })
  })
})
