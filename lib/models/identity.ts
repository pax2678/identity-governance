import { z } from 'zod'
import { IdentityType, IdentityStatus } from '@prisma/client'

// T023: Identity Domain Model with Zod Validation
// Based on data-model.md Identity Entity specification

// Zod schema for Identity attributes (flexible JSON field)
export const IdentityAttributesSchema = z.record(z.unknown()).refine(
  (attrs) => {
    // Common attributes: dept, title, email, manager, location, employeeId
    // All are optional but if present must be strings
    const stringKeys = ['dept', 'title', 'email', 'manager', 'location', 'employeeId']
    for (const key of stringKeys) {
      if (key in attrs && typeof attrs[key] !== 'string') {
        return false
      }
    }
    return true
  },
  { message: 'Identity attributes must be valid key-value pairs' }
)

// Zod schema for creating a new Identity
export const CreateIdentitySchema = z.object({
  identityType: z.nativeEnum(IdentityType),
  displayName: z.string().min(1, 'Display name is required'),
  status: z.nativeEnum(IdentityStatus).default(IdentityStatus.STAGED),
  identitySource: z.string().min(1, 'Identity source is required'),
  attributes: IdentityAttributesSchema.default({}),
  ownerIdentityId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // FR-002: Non-human identities must have an owner
    if (data.identityType !== IdentityType.HUMAN && !data.ownerIdentityId) {
      return false
    }
    return true
  },
  {
    message: 'Non-human identities must have an owner (ownerIdentityId required)',
    path: ['ownerIdentityId'],
  }
)

// Zod schema for updating an Identity
export const UpdateIdentitySchema = z.object({
  displayName: z.string().min(1).optional(),
  status: z.nativeEnum(IdentityStatus).optional(),
  attributes: IdentityAttributesSchema.optional(),
  ownerIdentityId: z.string().uuid().nullable().optional(),
}).refine(
  (data) => {
    // Cannot set ownerIdentityId to null for non-human identities
    // This validation will need context from the existing record
    return true // Runtime validation required in service layer
  }
)

// Type exports from Prisma
export type Identity = {
  id: string
  identityType: IdentityType
  displayName: string
  status: IdentityStatus
  identitySource: string
  attributes: Record<string, unknown>
  ownerIdentityId: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateIdentityInput = z.infer<typeof CreateIdentitySchema>
export type UpdateIdentityInput = z.infer<typeof UpdateIdentitySchema>

// Helper function to validate Identity ownership chain
export function validateOwnershipChain(
  identity: Identity,
  ownerMap: Map<string, string | null>
): boolean {
  // Prevent circular ownership
  const visited = new Set<string>()
  let currentId: string | null = identity.id

  while (currentId) {
    if (visited.has(currentId)) {
      return false // Circular reference detected
    }
    visited.add(currentId)
    currentId = ownerMap.get(currentId) || null
  }
  return true
}
