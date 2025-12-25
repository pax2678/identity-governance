import { z } from 'zod'
import { SubjectType, TargetType, AssignmentAction, ApprovalState } from '@prisma/client'

// T027: AccessAssignment Domain Model with Zod Validation
// Based on data-model.md AccessAssignment entity

// Zod schema for approver decision record
export const ApproverDecisionSchema = z.object({
  identityId: z.string().uuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  timestamp: z.date(),
  comment: z.string().optional(),
})

// Zod schema for evidence object
export const EvidenceSchema = z.object({
  type: z.enum(['DOCUMENT', 'SCREENSHOT', 'LOG', 'TICKET', 'CERTIFICATION']),
  url: z.string().url().optional(),
  description: z.string(),
  uploadedAt: z.date(),
  uploadedBy: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
})

// Zod schema for creating a new AccessAssignment
export const CreateAccessAssignmentSchema = z.object({
  subjectId: z.string().uuid('Subject ID must be a valid UUID'),
  subjectType: z.nativeEnum(SubjectType),
  targetId: z.string().uuid('Target ID must be a valid UUID'),
  targetType: z.nativeEnum(TargetType),
  action: z.nativeEnum(AssignmentAction),
  requestorId: z.string().uuid('Requestor ID must be a valid UUID'),
  approvalState: z.nativeEnum(ApprovalState).default(ApprovalState.PENDING_APPROVAL),
  approvers: z.array(ApproverDecisionSchema).default([]),
  justification: z.string().min(10, 'Justification must be at least 10 characters'),
  ticketRef: z.string().optional(),
  slaDeadline: z.date().optional(),
  isTimeBound: z.boolean().default(false),
  endTime: z.date().nullable().optional(),
  evidence: z.array(EvidenceSchema).default([]),
}).refine(
  (data) => {
    // FR-019: Time-bound access must have endTime
    if (data.isTimeBound && !data.endTime) {
      return false
    }
    return true
  },
  {
    message: 'Time-bound access must specify an end time',
    path: ['endTime'],
  }
).refine(
  (data) => {
    // SC-005: SLA deadline should be in the future
    if (data.slaDeadline && data.slaDeadline <= new Date()) {
      return false
    }
    return true
  },
  {
    message: 'SLA deadline must be in the future',
    path: ['slaDeadline'],
  }
)

// Zod schema for updating an AccessAssignment
export const UpdateAccessAssignmentSchema = z.object({
  approvalState: z.nativeEnum(ApprovalState).optional(),
  approvers: z.array(ApproverDecisionSchema).optional(),
  endTime: z.date().nullable().optional(),
  evidence: z.array(EvidenceSchema).optional(),
})

// Zod schema for adding an approval decision
export const AddApprovalDecisionSchema = z.object({
  identityId: z.string().uuid('Approver identity ID must be a valid UUID'),
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
})

// Type exports
export type AccessAssignment = {
  id: string
  subjectId: string
  subjectType: SubjectType
  targetId: string
  targetType: TargetType
  action: AssignmentAction
  requestorId: string
  approvalState: ApprovalState
  approvers: ApproverDecision[]
  justification: string
  ticketRef: string | null
  slaDeadline: Date | null
  isTimeBound: boolean
  endTime: Date | null
  evidence: Evidence[]
  createdAt: Date
  updatedAt: Date
}

export type ApproverDecision = z.infer<typeof ApproverDecisionSchema>
export type Evidence = z.infer<typeof EvidenceSchema>
export type CreateAccessAssignmentInput = z.infer<typeof CreateAccessAssignmentSchema>
export type UpdateAccessAssignmentInput = z.infer<typeof UpdateAccessAssignmentSchema>
export type AddApprovalDecisionInput = z.infer<typeof AddApprovalDecisionSchema>

// Approval state machine for FR-016, FR-017, FR-018
export const ApprovalStateTransitions: Record<ApprovalState, ApprovalState[]> = {
  [ApprovalState.PENDING_APPROVAL]: [ApprovalState.APPROVED, ApprovalState.REJECTED],
  [ApprovalState.APPROVED]: [ApprovalState.PROVISIONED, ApprovalState.FAILED],
  [ApprovalState.REJECTED]: [], // Terminal state
  [ApprovalState.PROVISIONED]: [], // Terminal state (success)
  [ApprovalState.FAILED]: [ApprovalState.APPROVED], // Allow retry
}

// Helper function to validate state transition
export function isValidApprovalStateTransition(
  currentState: ApprovalState,
  nextState: ApprovalState
): boolean {
  const allowedTransitions = ApprovalStateTransitions[currentState]
  return allowedTransitions.includes(nextState)
}

// Helper function to check if approval is pending
export function isApprovalPending(assignment: AccessAssignment): boolean {
  return assignment.approvalState === ApprovalState.PENDING_APPROVAL
}

// Helper function to check if SLA is breached (SC-005)
export function isSlaBreached(assignment: AccessAssignment, asOf?: Date): boolean {
  const now = asOf || new Date()
  if (!assignment.slaDeadline) return false
  if (assignment.approvalState !== ApprovalState.PENDING_APPROVAL) return false
  return assignment.slaDeadline < now
}

// Helper function to get all approved assignments
export function isApproved(assignment: AccessAssignment): boolean {
  return assignment.approvalState === ApprovalState.APPROVED ||
         assignment.approvalState === ApprovalState.PROVISIONED
}

// Helper function to check if all required approvers have approved
export function hasAllApprovalsRequired(
  assignment: AccessAssignment,
  requiredApproverIds: string[]
): boolean {
  const approvedIds = assignment.approvers
    .filter((a) => a.decision === 'APPROVED')
    .map((a) => a.identityId)

  return requiredApproverIds.every((id) => approvedIds.includes(id))
}

// Helper function to calculate approval progress
export function getApprovalProgress(
  assignment: AccessAssignment,
  requiredApproverIds: string[]
): { approved: number; total: number; percentage: number } {
  const approvedCount = assignment.approvers.filter((a) => a.decision === 'APPROVED').length
  const total = requiredApproverIds.length
  const percentage = total > 0 ? Math.floor((approvedCount / total) * 100) : 0

  return { approved: approvedCount, total, percentage }
}
