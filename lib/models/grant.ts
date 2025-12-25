import { z } from 'zod'
import { GrantType, GrantState } from '@prisma/client'

// T026: AccountEntitlementGrant Domain Model with Zod Validation
// Based on data-model.md AccountEntitlementGrant entity

// Zod schema for creating a new Grant
export const CreateGrantSchema = z.object({
  accountId: z.string().uuid('Account ID must be a valid UUID'),
  entitlementId: z.string().uuid('Entitlement ID must be a valid UUID'),
  grantType: z.nativeEnum(GrantType),
  startTime: z.date().default(() => new Date()),
  endTime: z.date().nullable().optional(),
  state: z.nativeEnum(GrantState).default(GrantState.PENDING),
  provisioningTaskId: z.string().optional(),
  accessAssignmentId: z.string().uuid().nullable().optional(),
}).refine(
  (data) => {
    // FR-013: Time-bound grants must have endTime
    if (data.endTime && data.endTime <= data.startTime) {
      return false
    }
    return true
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
)

// Zod schema for updating a Grant
export const UpdateGrantSchema = z.object({
  endTime: z.date().nullable().optional(),
  state: z.nativeEnum(GrantState).optional(),
  provisioningTaskId: z.string().optional(),
}).refine(
  (data) => {
    // State transition validation
    // PENDING -> ACTIVE | FAILED
    // ACTIVE -> EXPIRED | REVOKED
    // FAILED -> PENDING (retry)
    return true // Runtime validation in service layer
  }
)

// Type exports
export type AccountEntitlementGrant = {
  id: string
  accountId: string
  entitlementId: string
  grantType: GrantType
  startTime: Date
  endTime: Date | null
  state: GrantState
  provisioningTaskId: string | null
  accessAssignmentId: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateGrantInput = z.infer<typeof CreateGrantSchema>
export type UpdateGrantInput = z.infer<typeof UpdateGrantSchema>

// Grant state machine for FR-020, FR-021, FR-022, FR-024
export const GrantStateTransitions: Record<GrantState, GrantState[]> = {
  [GrantState.PENDING]: [GrantState.ACTIVE, GrantState.FAILED],
  [GrantState.ACTIVE]: [GrantState.EXPIRED, GrantState.REVOKED],
  [GrantState.FAILED]: [GrantState.PENDING, GrantState.REVOKED], // Allow retry
  [GrantState.EXPIRED]: [GrantState.REVOKED],
  [GrantState.REVOKED]: [], // Terminal state
}

// Helper function to validate state transition
export function isValidStateTransition(
  currentState: GrantState,
  nextState: GrantState
): boolean {
  const allowedTransitions = GrantStateTransitions[currentState]
  return allowedTransitions.includes(nextState)
}

// Helper function to check if grant is active
export function isGrantActive(grant: AccountEntitlementGrant, asOf?: Date): boolean {
  const now = asOf || new Date()

  // Must be in ACTIVE state
  if (grant.state !== GrantState.ACTIVE) return false

  // Must be within time bounds
  const isStarted = grant.startTime <= now
  const notExpired = !grant.endTime || grant.endTime > now

  return isStarted && notExpired
}

// Helper function to check if grant is expired (FR-024)
export function isGrantExpired(grant: AccountEntitlementGrant, asOf?: Date): boolean {
  const now = asOf || new Date()

  // Check time-based expiry
  if (grant.endTime && grant.endTime <= now) return true

  // Check state-based expiry
  if (grant.state === GrantState.EXPIRED) return true

  return false
}

// Helper function to get grants expiring soon (for FR-014 notifications)
export function getExpiringGrants(
  grants: AccountEntitlementGrant[],
  daysAhead: number = 7
): AccountEntitlementGrant[] {
  const now = new Date()
  const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  return grants.filter((grant) => {
    if (!grant.endTime) return false
    if (grant.state !== GrantState.ACTIVE) return false
    return grant.endTime > now && grant.endTime <= threshold
  })
}

// Helper function to calculate grant duration
export function getGrantDuration(grant: AccountEntitlementGrant): number | null {
  if (!grant.endTime) return null // Permanent grant
  return grant.endTime.getTime() - grant.startTime.getTime()
}

// Helper function for provisioning task reference
export function hasProvisioningTask(grant: AccountEntitlementGrant): boolean {
  return grant.provisioningTaskId !== null
}
