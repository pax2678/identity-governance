import { z } from 'zod'

// T025: Entitlement Domain Model with Zod Validation
// Based on data-model.md Entitlement and EntitlementHierarchy entities

// Zod schema for entitlement shape (flexible JSON field)
// Shape varies by entitlementType per coverage-matrix.yaml
export const EntitlementShapeSchema = z.record(z.unknown()).refine(
  (shape) => {
    // Common shape fields based on entitlementType:
    // - group: { members: string[], description?: string }
    // - role: { permissions: string[], description?: string }
    // - policy_document: { document: object, format: 'opa_rego' | 'aws_iam' | 'azure_rbac' }
    // - permission: { resource: string, actions: string[] }
    return true // Type-specific validation handled in service layer
  },
  { message: 'Entitlement shape must be a valid JSON object' }
)

// Zod schema for policy_document shape (target-evaluated policies)
export const PolicyDocumentShapeSchema = z.object({
  document: z.record(z.unknown()), // OPA Rego, AWS IAM Policy, Azure RBAC definition
  format: z.enum(['opa_rego', 'aws_iam', 'azure_rbac', 'gcp_iam']),
  version: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// Zod schema for creating a new Entitlement
export const CreateEntitlementSchema = z.object({
  systemId: z.string().uuid('System ID must be a valid UUID'),
  entitlementType: z.string().min(1, 'Entitlement type is required'),
  nativeId: z.string().min(1, 'Native ID is required'),
  displayName: z.string().min(1, 'Display name is required'),
  riskScore: z.number().int().min(0).max(100).default(0),
  isPrivileged: z.boolean().default(false),
  ownerIdentityId: z.string().uuid().nullable().optional(),
  shape: EntitlementShapeSchema.default({}),
}).refine(
  (data) => {
    // FR-011: Privileged entitlements should have high risk score
    if (data.isPrivileged && data.riskScore < 50) {
      return false
    }
    return true
  },
  {
    message: 'Privileged entitlements must have risk score >= 50',
    path: ['riskScore'],
  }
)

// Zod schema for updating an Entitlement
export const UpdateEntitlementSchema = z.object({
  displayName: z.string().min(1).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  isPrivileged: z.boolean().optional(),
  ownerIdentityId: z.string().uuid().nullable().optional(),
  shape: EntitlementShapeSchema.optional(),
})

// Zod schema for EntitlementHierarchy relationship
export const CreateEntitlementHierarchySchema = z.object({
  parentId: z.string().uuid('Parent entitlement ID must be a valid UUID'),
  childId: z.string().uuid('Child entitlement ID must be a valid UUID'),
}).refine(
  (data) => {
    // Prevent self-reference
    if (data.parentId === data.childId) {
      return false
    }
    return true
  },
  {
    message: 'Entitlement cannot be its own parent',
    path: ['childId'],
  }
)

// Type exports
export type Entitlement = {
  id: string
  systemId: string
  entitlementType: string
  nativeId: string
  displayName: string
  riskScore: number
  isPrivileged: boolean
  ownerIdentityId: string | null
  shape: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type EntitlementHierarchy = {
  parentId: string
  childId: string
}

export type CreateEntitlementInput = z.infer<typeof CreateEntitlementSchema>
export type UpdateEntitlementInput = z.infer<typeof UpdateEntitlementSchema>
export type CreateEntitlementHierarchyInput = z.infer<typeof CreateEntitlementHierarchySchema>
export type PolicyDocumentShape = z.infer<typeof PolicyDocumentShapeSchema>

// Helper function to detect circular hierarchy
export function detectCircularHierarchy(
  entitlementId: string,
  hierarchyMap: Map<string, string[]> // parentId -> childIds[]
): boolean {
  const visited = new Set<string>()
  const stack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    if (stack.has(nodeId)) return true // Cycle detected
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    stack.add(nodeId)

    const children = hierarchyMap.get(nodeId) || []
    for (const childId of children) {
      if (hasCycle(childId)) return true
    }

    stack.delete(nodeId)
    return false
  }

  return hasCycle(entitlementId)
}

// Helper function to calculate entitlement risk score
// Based on FR-011: Risk scoring considers privilege level, system criticality, access breadth
export function calculateRiskScore(params: {
  isPrivileged: boolean
  systemCriticality: number // 0-100
  accessBreadth: number // Number of resources/permissions
  userCount: number // Number of accounts with this entitlement
}): number {
  const { isPrivileged, systemCriticality, accessBreadth, userCount } = params

  let score = 0

  // Base score for privileged entitlements
  if (isPrivileged) score += 50

  // System criticality contribution (0-25 points)
  score += Math.floor(systemCriticality * 0.25)

  // Access breadth contribution (0-15 points)
  const breadthScore = Math.min(accessBreadth / 10, 15)
  score += Math.floor(breadthScore)

  // User count contribution (0-10 points)
  const userScore = Math.min(userCount / 50, 10)
  score += Math.floor(userScore)

  return Math.min(score, 100)
}
