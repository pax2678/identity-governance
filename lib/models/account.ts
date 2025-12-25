import { z } from 'zod'
import { AccountStatus, AccountRelationType, LinkSource } from '@prisma/client'

// T024: Account Domain Model with Zod Validation
// Based on data-model.md Account and IdentityAccountLink entities

// Zod schema for Account metadata (flexible JSON field)
export const AccountMetadataSchema = z.record(z.unknown())

// Zod schema for creating a new Account
export const CreateAccountSchema = z.object({
  systemId: z.string().uuid('System ID must be a valid UUID'),
  accountType: z.string().min(1, 'Account type is required'),
  nativeId: z.string().min(1, 'Native ID is required'),
  status: z.nativeEnum(AccountStatus).default(AccountStatus.CREATED),
  lastSeenAt: z.date().default(() => new Date()),
  metadata: AccountMetadataSchema.default({}),
  credentialRef: z.string().optional(),
})

// Zod schema for updating an Account
export const UpdateAccountSchema = z.object({
  status: z.nativeEnum(AccountStatus).optional(),
  lastSeenAt: z.date().optional(),
  metadata: AccountMetadataSchema.optional(),
  credentialRef: z.string().nullable().optional(),
})

// Zod schema for creating an IdentityAccountLink
export const CreateIdentityAccountLinkSchema = z.object({
  identityId: z.string().uuid('Identity ID must be a valid UUID'),
  accountId: z.string().uuid('Account ID must be a valid UUID'),
  relationType: z.nativeEnum(AccountRelationType),
  startTime: z.date().default(() => new Date()),
  endTime: z.date().nullable().optional(),
  source: z.nativeEnum(LinkSource),
}).refine(
  (data) => {
    // FR-015: Validate time bounds (endTime must be after startTime)
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

// Zod schema for updating an IdentityAccountLink
export const UpdateIdentityAccountLinkSchema = z.object({
  relationType: z.nativeEnum(AccountRelationType).optional(),
  endTime: z.date().nullable().optional(),
}).refine(
  (data) => {
    // Runtime validation needed for startTime comparison
    return true
  }
)

// Type exports
export type Account = {
  id: string
  systemId: string
  accountType: string
  nativeId: string
  status: AccountStatus
  lastSeenAt: Date
  metadata: Record<string, unknown>
  credentialRef: string | null
  createdAt: Date
  updatedAt: Date
}

export type IdentityAccountLink = {
  id: string
  identityId: string
  accountId: string
  relationType: AccountRelationType
  startTime: Date
  endTime: Date | null
  source: LinkSource
  createdAt: Date
  updatedAt: Date
}

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>
export type CreateIdentityAccountLinkInput = z.infer<typeof CreateIdentityAccountLinkSchema>
export type UpdateIdentityAccountLinkInput = z.infer<typeof UpdateIdentityAccountLinkSchema>

// Helper function to check if account link is active
export function isAccountLinkActive(link: IdentityAccountLink, asOf?: Date): boolean {
  const now = asOf || new Date()
  const isStarted = link.startTime <= now
  const notExpired = !link.endTime || link.endTime > now
  return isStarted && notExpired
}

// Helper function to validate account uniqueness per system
export function validateAccountUniqueness(
  systemId: string,
  nativeId: string,
  existingAccounts: Account[]
): boolean {
  return !existingAccounts.some(
    (acc) => acc.systemId === systemId && acc.nativeId === nativeId
  )
}
