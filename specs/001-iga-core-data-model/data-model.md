# Data Model: IGA Core Data Model

**Feature**: IGA Core Data Model
**Branch**: `001-iga-core-data-model`
**Date**: 2025-12-23
**Phase**: Phase 1 (Design & Contracts)

## Purpose

This document defines the database schema, entity relationships, validation rules, and state machines for the IGA core data model. Extracted from [spec.md](spec.md) Key Entities section (lines 194-216) and functional requirements (lines 132-193).

**Technology**: PostgreSQL 16+ with Apache AGE extension, Prisma ORM

---

## Schema Overview

### Database Structure

```
PostgreSQL Database: identity_governance
├── Schema: public (core entities)
│   ├── identities
│   ├── systems
│   ├── accounts
│   ├── entitlements
│   ├── identity_account_links (bindings)
│   ├── account_entitlement_grants (grants)
│   ├── access_assignments
│   ├── role_bundles (optional)
│   ├── policies (optional)
│   └── certification_campaigns (optional)
└── Schema: audit (append-only events)
    └── events
```

---

## Core Entities

### 1. Identity

**Purpose**: Represents an actor (human, service account, agent, device) in the organization.

**Source**: spec.md:196

**Prisma Schema**:
```prisma
model Identity {
  id                String   @id @default(uuid()) @db.Uuid
  identityType      IdentityType
  displayName       String
  status            IdentityStatus
  identitySource    String            // e.g., "HRIS", "CMDB", "Manual"
  attributes        Json              // Flexible attributes (dept, title, email, etc.)
  ownerIdentityId   String?   @db.Uuid // For non-human identities (FR-002)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  owner             Identity? @relation("IdentityOwnership", fields: [ownerIdentityId], references: [id])
  ownedIdentities   Identity[] @relation("IdentityOwnership")
  accountLinks      IdentityAccountLink[]
  requestedAccess   AccessAssignment[] @relation("Requestor")
  approvals         AccessAssignment[] @relation("Approver")
  auditEvents       Event[] @relation("Actor")

  @@index([status, identityType])
  @@index([identitySource])
  @@map("identities")
}

enum IdentityType {
  HUMAN
  SERVICE
  AGENT
  DEVICE
  EXTERNAL
}

enum IdentityStatus {
  ACTIVE
  STAGED    // New identity not yet activated
  DISABLED  // Temporary suspension
  DELETED   // Soft delete, retained for audit
}
```

**Validation Rules** (FR-001, FR-002):
- `displayName` must be non-empty string (Zod: `.min(1)`)
- `identityType = HUMAN` → `ownerIdentityId` MUST be NULL
- `identityType != HUMAN` → `ownerIdentityId` SHOULD be set (warning if null)
- `attributes` JSON must be valid and may contain:
  - `email`: string (email format)
  - `employeeId`: string (unique for HRIS-sourced identities)
  - `department`: string
  - `title`: string

**State Transitions** (FR-004):
```
┌──────┐  activate   ┌────────┐  disable   ┌──────────┐
│STAGED├────────────→│ACTIVE  ├───────────→│DISABLED  │
└──────┘             └────┬───┘            └─────┬────┘
                          │  delete              │ delete
                          │                      │
                          └──────────────────────┘
                                    ↓
                              ┌──────────┐
                              │DELETED   │
                              └──────────┘
```

**Mover Workflow** (Constitution Principle IV requirement):
- **Trigger**: `attributes.department` or `attributes.title` change detected via HRIS sync
- **Action**: Emit `IdentityRoleChanged` event → trigger access recertification campaign for identity's grants

---

### 2. System

**Purpose**: Represents a target application or service where accounts exist.

**Source**: spec.md:198

**Prisma Schema**:
```prisma
model System {
  id                String   @id @default(uuid()) @db.Uuid
  name              String   @unique
  systemType        String            // e.g., "AD", "LDAP", "SaaS", "AWS", "K8s", "DB"
  connectorFamily   String            // From coverage-matrix.yaml: "ldap", "scim", "k8s_api", etc.
  connectionConfig  Json              // Connector-specific config (host, port, base_dn, etc.)
  isAuthoritative   Boolean  @default(false) // True if system is HRIS/CMDB
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  accounts          Account[]
  entitlements      Entitlement[]

  @@index([systemType])
  @@index([connectorFamily])
  @@map("systems")
}
```

**Validation Rules**:
- `name` must be unique across all systems
- `connectorFamily` must match valid family from coverage-matrix.yaml (`ldap`, `scim`, `idp_admin`, `k8s_api`, `sql`, `iac_opentofu`, `policy_opa`, `rebac_fga`, `secrets_openbao`, `pki_ca`, `workload_spire`, `evidence_only`)
- `connectionConfig` JSON schema varies by `connectorFamily`:
  - `ldap`: `{ host, port, baseDN, bindDN }`
  - `scim`: `{ baseUrl, clientId }`
  - `k8s_api`: `{ apiServer, namespace? }`

---

### 3. Account

**Purpose**: Represents an identity's presence in a target system.

**Source**: spec.md:200

**Prisma Schema**:
```prisma
model Account {
  id                String   @id @default(uuid()) @db.Uuid
  systemId          String   @db.Uuid
  accountType       String            // From coverage-matrix.yaml: "ldap_user", "idp_user", etc.
  nativeId          String            // Immutable ID from target system (e.g., DN, UUID)
  status            AccountStatus
  lastSeenAt        DateTime          // Last discovery timestamp (FR-007)
  metadata          Json              // System-specific attributes
  credentialRef     String?           // Optional reference to stored credentials
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  system            System @relation(fields: [systemId], references: [id], onDelete: Cascade)
  identityLinks     IdentityAccountLink[]
  grants            AccountEntitlementGrant[]

  @@unique([systemId, nativeId])  // Unique constraint: one account per native ID per system
  @@index([systemId, accountType])
  @@index([status])
  @@map("accounts")
}

enum AccountStatus {
  CREATED   // Account exists but not yet active
  ACTIVE    // Account is active in target system
  DISABLED  // Account disabled (suspended)
  DELETED   // Account deleted in target system
}
```

**Validation Rules** (FR-005, FR-007):
- `nativeId` must be immutable after creation (enforce via application logic)
- `lastSeenAt` updated on every discovery run (FR-023 reconciliation)
- `status` transitions tracked via audit events (FR-007)

**State Transitions**:
```
┌─────────┐  activate   ┌────────┐  disable   ┌──────────┐
│CREATED  ├────────────→│ACTIVE  ├───────────→│DISABLED  │
└─────────┘             └────┬───┘            └─────┬────┘
                             │  delete               │ delete
                             └───────────────────────┘
                                       ↓
                                 ┌──────────┐
                                 │DELETED   │
                                 └──────────┘
```

---

### 4. Entitlement

**Purpose**: Represents a grantable capability (group, role, policy, license, etc.).

**Source**: spec.md:202

**Prisma Schema**:
```prisma
model Entitlement {
  id                String   @id @default(uuid()) @db.Uuid
  systemId          String   @db.Uuid
  entitlementType   String            // From coverage-matrix.yaml: "group", "role", "policy_document", etc.
  nativeId          String            // Native ID from target system
  displayName       String
  riskScore         Int      @default(0) // 0-100, calculated via FR-011
  isPrivileged      Boolean  @default(false)
  ownerIdentityId   String?  @db.Uuid   // Owner for approval routing (FR-009)
  shape             Json              // Entitlement-specific attributes (path, permissions, etc.)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  system            System @relation(fields: [systemId], references: [id], onDelete: Cascade)
  owner             Identity? @relation(fields: [ownerIdentityId], references: [id])
  grants            AccountEntitlementGrant[]
  parentEntitlements   EntitlementHierarchy[] @relation("ParentEntitlement")
  childEntitlements    EntitlementHierarchy[] @relation("ChildEntitlement")
  roleBundleEntitlements RoleBundleEntitlement[]

  @@unique([systemId, nativeId])
  @@index([systemId, entitlementType])
  @@index([isPrivileged])
  @@index([riskScore])
  @@map("entitlements")
}
```

**Validation Rules** (FR-008, FR-009, FR-011):
- `riskScore` range: 0-100 (Zod: `.min(0).max(100)`)
- `isPrivileged = true` if riskScore >= 70 (calculated via risk scoring algorithm)
- `entitlementType` must match valid type from coverage-matrix.yaml entitlement_types
- `shape` JSON schema varies by `entitlementType`:
  - `group`: `{ path: string, isNested: boolean }`
  - `role`: `{ scope: string, permissions: string[] }`
  - `policy_document`: `{ policyArn: string, policyDoc: object }`
  - `scope`: `{ audience: string, claims: string[] }`

**Nesting/Hierarchy** (FR-010):
```prisma
model EntitlementHierarchy {
  parentId  String @db.Uuid
  childId   String @db.Uuid

  parent    Entitlement @relation("ParentEntitlement", fields: [parentId], references: [id], onDelete: Cascade)
  child     Entitlement @relation("ChildEntitlement", fields: [childId], references: [id], onDelete: Cascade)

  @@id([parentId, childId])
  @@map("entitlement_hierarchies")
}
```

---

### 5. IdentityAccountLink (Binding)

**Purpose**: Represents ownership/usage of an account by an identity.

**Source**: spec.md:204

**Prisma Schema**:
```prisma
model IdentityAccountLink {
  id                String   @id @default(uuid()) @db.Uuid
  identityId        String   @db.Uuid
  accountId         String   @db.Uuid
  relationType      AccountRelationType
  startTime         DateTime @default(now())
  endTime           DateTime?         // Null = no expiry
  source            LinkSource        // How link was established
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  identity          Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  account           Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([identityId, accountId]) // One link per identity-account pair
  @@index([identityId])
  @@index([accountId])
  @@index([relationType])
  @@map("identity_account_links")
}

enum AccountRelationType {
  PRIMARY      // Main account for identity
  ADMIN        // Administrative/elevated account
  SHARED       // Shared account (e.g., service account used by multiple identities)
  DELEGATED    // Delegated access (temporary)
  BREAKGLASS   // Emergency access account
}

enum LinkSource {
  BIRTHRIGHT   // Auto-assigned via birthright policy
  REQUEST      // Created via access request workflow
  IMPORTED     // Discovered from target system
  EXCEPTION    // Manual exception grant
}
```

**Validation Rules** (FR-006):
- `relationType = PRIMARY` should exist exactly once per identity-system pair (warning if violated)
- `relationType = SHARED` → multiple identities can link to same account
- Time-bound links: `endTime != null` triggers expiry enforcement job

**Edge Case Handling**:
- **Orphaned Links** (spec.md:120): Account deleted in target without IGA notification
  - Detection: Reconciliation job finds account with `status = DELETED` but link still `ACTIVE`
  - Remediation: Update link state to `ORPHANED`, emit alert, flag for manual review

---

### 6. AccountEntitlementGrant (Grant)

**Purpose**: Represents an account's possession of an entitlement.

**Source**: spec.md:206

**Prisma Schema**:
```prisma
model AccountEntitlementGrant {
  id                String   @id @default(uuid()) @db.Uuid
  accountId         String   @db.Uuid
  entitlementId     String   @db.Uuid
  grantType         GrantType
  startTime         DateTime @default(now())
  endTime           DateTime?         // Null = no expiry (FR-013)
  state             GrantState
  provisioningTaskId String?          // Reference to async provisioning task
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  account           Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
  entitlement       Entitlement @relation(fields: [entitlementId], references: [id], onDelete: Restrict) // Prevent entitlement deletion if grants exist
  accessAssignment  AccessAssignment? @relation("AccessAssignmentGrant")

  @@unique([accountId, entitlementId]) // One grant per account-entitlement pair
  @@index([accountId])
  @@index([entitlementId])
  @@index([state])
  @@index([endTime]) // For expiry enforcement queries
  @@map("account_entitlement_grants")
}

enum GrantType {
  DIRECT            // Direct grant (account directly assigned entitlement)
  GROUP_IN_GROUP    // Derived via nested group membership
  POLICY_DERIVED    // Derived via policy evaluation (ABAC)
}

enum GrantState {
  PENDING           // Awaiting provisioning (FR-020)
  ACTIVE            // Successfully provisioned (FR-021)
  FAILED            // Provisioning failed (FR-022)
  EXPIRED           // Time-bound grant expired (FR-024)
  REVOKED           // Manually revoked (FR-024)
}
```

**Validation Rules** (FR-012, FR-013, FR-014):
- `grantType = DIRECT` → must have corresponding `AccessAssignment` (unless `source = IMPORTED` for out-of-band grants)
- `grantType != DIRECT` → no `AccessAssignment` required (derived grants)
- Time-bound grants: `endTime != null` requires automatic revocation when `NOW() > endTime` (SC-007: within 1 hour)

**State Transitions** (FR-020-024):
```
┌─────────┐  provision success  ┌────────┐  expire/revoke  ┌──────────┐
│PENDING  ├────────────────────→│ACTIVE  ├────────────────→│EXPIRED   │
└────┬────┘                      └────────┘                 │REVOKED   │
     │                                                       └──────────┘
     │ provision failure
     ↓
┌─────────┐
│FAILED   │
└─────────┘
```

**Edge Cases**:
- **Out-of-Band Grants** (spec.md:122): Grant discovered in target system without AccessAssignment
  - Handling: Create grant with `grantType = DIRECT`, flag as `orphaned = true`, emit alert
  - Remediation: Admin reviews and either creates retroactive AccessAssignment or revokes grant
- **Entitlement Deletion** (spec.md:126): Entitlement deleted while grants exist
  - Prevention: `onDelete: Restrict` prevents entitlement deletion
  - Workflow: Admin must revoke all grants before deleting entitlement

---

### 7. AccessAssignment

**Purpose**: Governance wrapper for access requests/approvals.

**Source**: spec.md:208

**Prisma Schema**:
```prisma
model AccessAssignment {
  id                String   @id @default(uuid()) @db.Uuid
  subjectId         String   @db.Uuid   // Identity or Account ID
  subjectType       SubjectType
  targetId          String   @db.Uuid   // Entitlement or Account ID
  targetType        TargetType
  action            AssignmentAction
  requestorId       String   @db.Uuid
  approvalState     ApprovalState
  approvers         Json              // Array of { identityId, decision, timestamp }
  justification     String
  ticketRef         String?           // Optional ITSM ticket reference
  slaDeadline       DateTime?         // Approval SLA deadline (SC-005)
  isTimeBound       Boolean  @default(false)
  endTime           DateTime?         // Expiry for time-bound access (FR-019)
  evidence          Json     @default("[]") // Array of evidence objects
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  requestor         Identity @relation("Requestor", fields: [requestorId], references: [id])
  grants            AccountEntitlementGrant[] @relation("AccessAssignmentGrant")

  @@index([approvalState])
  @@index([requestorId])
  @@index([slaDeadline])
  @@map("access_assignments")
}

enum SubjectType {
  IDENTITY
  ACCOUNT
}

enum TargetType {
  ENTITLEMENT
  ACCOUNT
}

enum AssignmentAction {
  BIND    // Link identity to account
  GRANT   // Grant entitlement to account
  REVOKE  // Revoke entitlement from account
}

enum ApprovalState {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PROVISIONED  // Approved and provisioning completed
  FAILED       // Provisioning failed after approval
}
```

**Validation Rules** (FR-016, FR-017, FR-018, FR-019):
- `action = BIND` → `subjectType = IDENTITY`, `targetType = ACCOUNT`
- `action = GRANT|REVOKE` → `subjectType = IDENTITY|ACCOUNT`, `targetType = ENTITLEMENT`
- `approvers` JSON array must contain at least one approval decision for state transition to `APPROVED`
- `slaDeadline = createdAt + 2 business days` (SC-005 requirement)
- `isTimeBound = true` → `endTime` MUST be set

**Approval Routing Logic** (FR-017):
1. Load target entitlement
2. If `entitlement.isPrivileged = true` → route to entitlement owner + CISO
3. Else if `entitlement.ownerIdentityId` is set → route to owner
4. Else → route to default approver (configured per system)

**State Transitions** (FR-016-020):
```
┌────────────────┐  approve  ┌─────────┐  provision  ┌──────────────┐
│PENDING_APPROVAL├──────────→│APPROVED ├────────────→│PROVISIONED   │
└────────┬───────┘            └────┬────┘             └──────────────┘
         │ reject                  │ provision fail
         ↓                         ↓
    ┌─────────┐              ┌─────────┐
    │REJECTED │              │FAILED   │
    └─────────┘              └─────────┘
```

---

### 8. RoleBundle (Optional)

**Purpose**: Represents a business role mapping to a set of entitlements.

**Source**: spec.md:210

**Prisma Schema**:
```prisma
model RoleBundle {
  id                String   @id @default(uuid()) @db.Uuid
  roleName          String   @unique
  description       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  entitlements      RoleBundleEntitlement[]

  @@map("role_bundles")
}

model RoleBundleEntitlement {
  roleBundleId      String @db.Uuid
  entitlementId     String @db.Uuid

  roleBundle        RoleBundle @relation(fields: [roleBundleId], references: [id], onDelete: Cascade)
  entitlement       Entitlement @relation(fields: [entitlementId], references: [id], onDelete: Cascade)

  @@id([roleBundleId, entitlementId])
  @@map("role_bundle_entitlements")
}
```

**Usage**: Role bundles group entitlements for bulk assignment (e.g., "Finance Analyst" role → 5 entitlements). Access requests can target role bundles instead of individual entitlements.

---

### 9. Policy (Optional)

**Purpose**: Represents birthright rules, SoD constraints, or ABAC conditions.

**Source**: spec.md:212

**Prisma Schema**:
```prisma
model Policy {
  id                String   @id @default(uuid()) @db.Uuid
  policyType        PolicyType
  policyDefinition  Json              // Type-specific policy logic
  isEnabled         Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("policies")
}

enum PolicyType {
  BIRTHRIGHT  // Auto-grant entitlements based on identity attributes (FR-034)
  SOD         // Segregation of Duties conflict rules (FR-032, FR-033)
  ABAC        // Attribute-Based Access Control conditions
}
```

**Policy Definition Schemas**:

**Birthright Policy**:
```json
{
  "condition": "identity.attributes.department == 'Finance'",
  "grants": [
    { "entitlementId": "uuid", "grantType": "DIRECT" }
  ]
}
```

**SoD Policy** (FR-032):
```json
{
  "conflictingPairs": [
    {
      "entitlement1Id": "uuid-purchasing-approver",
      "entitlement2Id": "uuid-invoice-creator",
      "severity": "HIGH"
    }
  ]
}
```

**SoD Violation Detection** (FR-033):
- Query: Find identities with grants to both entitlements in conflicting pair
- Trigger: On grant creation (pre-provisioning check) and during certification campaigns

---

### 10. CertificationCampaign (Optional)

**Purpose**: Represents an attestation campaign for periodic access review.

**Source**: spec.md:214

**Prisma Schema**:
```prisma
model CertificationCampaign {
  id                String   @id @default(uuid()) @db.Uuid
  campaignName      String
  scope             Json              // { entitlementIds: [], systemIds: [] }
  reviewers         Json              // Array of identityIds
  dueDate           DateTime
  status            CampaignStatus
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  reviews           CertificationReview[]

  @@map("certification_campaigns")
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

model CertificationReview {
  id                String   @id @default(uuid()) @db.Uuid
  campaignId        String   @db.Uuid
  grantId           String   @db.Uuid
  reviewerId        String   @db.Uuid
  decision          ReviewDecision?
  reviewedAt        DateTime?

  campaign          CertificationCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId])
  @@index([reviewerId])
  @@map("certification_reviews")
}

enum ReviewDecision {
  CERTIFY   // Approve continued access
  REVOKE    // Revoke access
}
```

**Workflow** (FR-025-028):
1. Admin creates campaign with scope (entitlements/systems) and reviewers
2. System generates `CertificationReview` records for all in-scope grants
3. Reviewers receive review tasks, make decisions (CERTIFY/REVOKE)
4. Revoked grants trigger provisioning tasks to deprovision access
5. Campaign completion report shows certification rate and revoked count (SC-008)

---

## Audit Schema

### Event (Audit Log)

**Purpose**: Append-only audit log for all access changes.

**Source**: spec.md:216, FR-029, FR-030, FR-031

**Prisma Schema**:
```prisma
model Event {
  id                String   @id @default(uuid()) @db.Uuid
  eventType         String            // e.g., "IdentityCreated", "GrantProvisioned", "AccessApproved"
  timestamp         DateTime @default(now())
  actorIdentityId   String?  @db.Uuid   // Who performed the action
  resourceType      String            // "Identity", "Account", "Grant", etc.
  resourceId        String   @db.Uuid
  action            String            // "CREATE", "UPDATE", "DELETE", "APPROVE", "PROVISION"
  outcome           EventOutcome
  metadata          Json              // Event-specific details
  evidenceHash      String?           // Cryptographic hash of linked evidence (SC-013)

  // Relations
  actor             Identity? @relation("Actor", fields: [actorIdentityId], references: [id])

  @@index([eventType])
  @@index([actorIdentityId])
  @@index([resourceType, resourceId])
  @@index([timestamp]) // For time-range queries (FR-031)
  @@map(name: "events", schema: "audit")
}

enum EventOutcome {
  SUCCESS
  FAILURE
  PENDING
}
```

**Validation Rules** (FR-029, FR-030):
- All entity mutations (Identity, Account, Entitlement, Grant, AccessAssignment) MUST emit corresponding event
- `evidenceHash` computed via SHA-256 of evidence JSON (SC-013 integrity verification)
- Events NEVER updated or deleted (enforced via PostgreSQL trigger)

**Table Partitioning**:
```sql
-- Monthly partitions for efficient archival (90-day retention per Assumption 7)
CREATE TABLE audit.events_2025_01 PARTITION OF audit.events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit.events_2025_02 PARTITION OF audit.events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- etc.
```

---

## Graph Queries (Apache AGE)

### Effective Access Calculation (FR-015)

**Query**: Find all effective grants for an identity (including transitive grants via nested groups)

**Cypher (via AGE)**:
```cypher
MATCH (identity:Identity {id: $identityId})
  -[:LINKS_TO]->(account:Account)
  -[:HAS_GRANT]->(grant:Grant)
  -[:GRANTS]->(entitlement:Entitlement)
  -[:CHILD_OF*0..5]->(parent:Entitlement)
RETURN DISTINCT parent, grant
```

**Explanation**: Traverse from identity → accounts → grants → entitlements → parent entitlements (up to 5 levels for nested groups)

### SoD Violation Detection (FR-033)

**Query**: Find identities with conflicting entitlement pairs

**Cypher (via AGE)**:
```cypher
MATCH (identity:Identity)-[:LINKS_TO]->(account:Account)-[:HAS_GRANT]->(grant1:Grant)-[:GRANTS]->(ent1:Entitlement)
MATCH (identity)-[:LINKS_TO]->(account2:Account)-[:HAS_GRANT]->(grant2:Grant)-[:GRANTS]->(ent2:Entitlement)
WHERE ent1.id = $conflictingEntitlement1Id
  AND ent2.id = $conflictingEntitlement2Id
  AND grant1.state = 'ACTIVE'
  AND grant2.state = 'ACTIVE'
RETURN DISTINCT identity
```

### Access Path Query ("Why does identity X have entitlement Y?")

**Query**: Trace access path from identity to entitlement

**Cypher (via AGE)**:
```cypher
MATCH path = (identity:Identity {id: $identityId})
  -[:LINKS_TO]->(:Account)
  -[:HAS_GRANT]->(:Grant)
  -[:GRANTS]->(:Entitlement)
  -[:CHILD_OF*0..5]->(:Entitlement {id: $entitlementId})
RETURN path
```

**Result**: Returns full graph path showing: Identity → Account → Grant → Entitlement chain (including nested groups)

---

## Materialized Views (Performance Optimization)

### identity_effective_access (cached effective access view)

**Purpose**: Pre-compute effective access for fast "who has what" queries (SC-001: < 5s)

**PostgreSQL View**:
```sql
CREATE MATERIALIZED VIEW identity_effective_access AS
SELECT
  i.id AS identity_id,
  i.display_name,
  a.id AS account_id,
  a.native_id AS account_native_id,
  s.name AS system_name,
  e.id AS entitlement_id,
  e.display_name AS entitlement_name,
  e.entitlement_type,
  g.grant_type,
  g.state AS grant_state
FROM identities i
JOIN identity_account_links ial ON i.id = ial.identity_id
JOIN accounts a ON ial.account_id = a.id
JOIN systems s ON a.system_id = s.id
JOIN account_entitlement_grants g ON a.id = g.account_id
JOIN entitlements e ON g.entitlement_id = e.id
WHERE g.state = 'ACTIVE';

CREATE INDEX idx_identity_effective_access_identity ON identity_effective_access(identity_id);
CREATE INDEX idx_identity_effective_access_entitlement ON identity_effective_access(entitlement_id);

-- Refresh on schedule (e.g., every 5 minutes)
REFRESH MATERIALIZED VIEW CONCURRENTLY identity_effective_access;
```

**Query Usage**:
```sql
-- Get all access for identity
SELECT * FROM identity_effective_access WHERE identity_id = $identityId;

-- Get all identities with specific entitlement
SELECT * FROM identity_effective_access WHERE entitlement_id = $entitlementId;
```

---

## Migration Strategy

### Phase 1 (P1-P3): Core Entities Only
- `identities`, `systems`, `accounts`, `entitlements`
- `identity_account_links`, `account_entitlement_grants`
- `audit.events`

### Phase 2 (P4): Add Governance
- `access_assignments`
- `policies` (birthright + SoD)

### Phase 3 (P5): Add Provisioning
- Add `provisioning_task_id` to `account_entitlement_grants`
- Add `provisioningTaskId` index

### Phase 4 (P6): Add Certification
- `certification_campaigns`, `certification_reviews`
- `role_bundles`, `role_bundle_entitlements`

---

## Next Steps

- [x] Data model defined (entities, relationships, state machines)
- [ ] Generate OpenAPI contracts for API Routes (Phase 1)
- [ ] Generate quickstart.md (Phase 1)
- [ ] Update agent context with Prisma schema (Phase 1)
