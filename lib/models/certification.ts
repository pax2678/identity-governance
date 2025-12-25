import { z } from 'zod'
import { CampaignStatus, ReviewDecision } from '@prisma/client'

// T028: Certification Domain Model with Zod Validation
// Based on data-model.md CertificationCampaign and CertificationReview entities

// Zod schema for campaign scope
export const CampaignScopeSchema = z.object({
  entitlementIds: z.array(z.string().uuid()).default([]),
  systemIds: z.array(z.string().uuid()).default([]),
  accountIds: z.array(z.string().uuid()).optional(),
  identityIds: z.array(z.string().uuid()).optional(),
}).refine(
  (scope) => {
    // At least one scope dimension must be specified
    return (
      scope.entitlementIds.length > 0 ||
      scope.systemIds.length > 0 ||
      scope.accountIds?.length ||
      scope.identityIds?.length
    )
  },
  {
    message: 'Campaign scope must specify at least one dimension (entitlements, systems, accounts, or identities)',
  }
)

// Zod schema for creating a new CertificationCampaign
export const CreateCertificationCampaignSchema = z.object({
  campaignName: z.string().min(3, 'Campaign name must be at least 3 characters'),
  scope: CampaignScopeSchema,
  reviewers: z.array(z.string().uuid()).min(1, 'At least one reviewer is required'),
  dueDate: z.date(),
  status: z.nativeEnum(CampaignStatus).default(CampaignStatus.DRAFT),
}).refine(
  (data) => {
    // Due date must be in the future
    if (data.dueDate <= new Date()) {
      return false
    }
    return true
  },
  {
    message: 'Due date must be in the future',
    path: ['dueDate'],
  }
)

// Zod schema for updating a CertificationCampaign
export const UpdateCertificationCampaignSchema = z.object({
  campaignName: z.string().min(3).optional(),
  reviewers: z.array(z.string().uuid()).min(1).optional(),
  dueDate: z.date().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
})

// Zod schema for creating a CertificationReview
export const CreateCertificationReviewSchema = z.object({
  campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  grantId: z.string().uuid('Grant ID must be a valid UUID'),
  reviewerId: z.string().uuid('Reviewer ID must be a valid UUID'),
  decision: z.nativeEnum(ReviewDecision).nullable().default(null),
  reviewedAt: z.date().nullable().default(null),
})

// Zod schema for updating a CertificationReview decision
export const UpdateCertificationReviewSchema = z.object({
  decision: z.nativeEnum(ReviewDecision),
  reviewedAt: z.date().default(() => new Date()),
})

// Type exports
export type CertificationCampaign = {
  id: string
  campaignName: string
  scope: CampaignScope
  reviewers: string[]
  dueDate: Date
  status: CampaignStatus
  createdAt: Date
  updatedAt: Date
}

export type CertificationReview = {
  id: string
  campaignId: string
  grantId: string
  reviewerId: string
  decision: ReviewDecision | null
  reviewedAt: Date | null
}

export type CampaignScope = z.infer<typeof CampaignScopeSchema>
export type CreateCertificationCampaignInput = z.infer<typeof CreateCertificationCampaignSchema>
export type UpdateCertificationCampaignInput = z.infer<typeof UpdateCertificationCampaignSchema>
export type CreateCertificationReviewInput = z.infer<typeof CreateCertificationReviewSchema>
export type UpdateCertificationReviewInput = z.infer<typeof UpdateCertificationReviewSchema>

// Campaign state machine
export const CampaignStatusTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
  [CampaignStatus.ACTIVE]: [CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
  [CampaignStatus.COMPLETED]: [], // Terminal state
  [CampaignStatus.CANCELLED]: [], // Terminal state
}

// Helper function to validate state transition
export function isValidCampaignStateTransition(
  currentState: CampaignStatus,
  nextState: CampaignStatus
): boolean {
  const allowedTransitions = CampaignStatusTransitions[currentState]
  return allowedTransitions.includes(nextState)
}

// Helper function to check if campaign is active
export function isCampaignActive(campaign: CertificationCampaign): boolean {
  return campaign.status === CampaignStatus.ACTIVE
}

// Helper function to check if campaign is overdue
export function isCampaignOverdue(campaign: CertificationCampaign, asOf?: Date): boolean {
  const now = asOf || new Date()
  return campaign.status === CampaignStatus.ACTIVE && campaign.dueDate < now
}

// Helper function to calculate campaign completion percentage
export function getCampaignCompletion(
  campaign: CertificationCampaign,
  reviews: CertificationReview[]
): { reviewed: number; total: number; percentage: number } {
  const total = reviews.length
  const reviewed = reviews.filter((r) => r.decision !== null).length
  const percentage = total > 0 ? Math.floor((reviewed / total) * 100) : 0

  return { reviewed, total, percentage }
}

// Helper function to get pending reviews for a reviewer
export function getPendingReviewsForReviewer(
  reviewerId: string,
  reviews: CertificationReview[]
): CertificationReview[] {
  return reviews.filter((r) => r.reviewerId === reviewerId && r.decision === null)
}

// Helper function to get reviews by decision
export function getReviewsByDecision(
  reviews: CertificationReview[],
  decision: ReviewDecision
): CertificationReview[] {
  return reviews.filter((r) => r.decision === decision)
}

// Helper function to check if all reviews are complete
export function areAllReviewsComplete(reviews: CertificationReview[]): boolean {
  return reviews.every((r) => r.decision !== null)
}

// Helper function to get review statistics
export function getReviewStatistics(reviews: CertificationReview[]): {
  total: number
  certified: number
  revoked: number
  pending: number
  certificationRate: number
} {
  const total = reviews.length
  const certified = reviews.filter((r) => r.decision === ReviewDecision.CERTIFY).length
  const revoked = reviews.filter((r) => r.decision === ReviewDecision.REVOKE).length
  const pending = reviews.filter((r) => r.decision === null).length
  const certificationRate = total > 0 ? Math.floor((certified / total) * 100) : 0

  return { total, certified, revoked, pending, certificationRate }
}
