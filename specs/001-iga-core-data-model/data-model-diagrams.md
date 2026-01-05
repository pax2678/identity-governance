# IGA Core Data Model - Visual Diagrams

**Feature**: IGA Core Data Model
**Branch**: `001-iga-core-data-model`
**Last Updated**: 2026-01-05

This document provides visual diagrams for the data model defined in [data-model.md](data-model.md).

---

## Entity Relationship Diagram (ERD)

### Core Entities and Relationships

```mermaid
erDiagram
    Identity ||--o{ IdentityAccountLink : "links to"
    Identity ||--o{ AccessAssignment : "requests"
    Identity ||--o{ AccessAssignment : "approves"
    Identity ||--o{ Identity : "owns (non-human)"
    Identity ||--o{ Entitlement : "owns"
    Identity ||--o{ Event : "performs"

    System ||--o{ Account : "contains"
    System ||--o{ Entitlement : "contains"

    Account ||--o{ IdentityAccountLink : "linked by"
    Account ||--o{ AccountEntitlementGrant : "has grants"

    Entitlement ||--o{ AccountEntitlementGrant : "granted via"
    Entitlement ||--o{ EntitlementHierarchy : "parent of"
    Entitlement ||--o{ EntitlementHierarchy : "child of"
    Entitlement ||--o{ RoleBundleEntitlement : "included in"

    AccountEntitlementGrant ||--o| AccessAssignment : "governed by"

    RoleBundle ||--o{ RoleBundleEntitlement : "contains"

    CertificationCampaign ||--o{ CertificationReview : "includes"

    Identity {
        uuid id PK
        string identityType "HUMAN|SERVICE|AGENT|DEVICE|EXTERNAL"
        string displayName
        string status "ACTIVE|STAGED|DISABLED|DELETED"
        string identitySource "HRIS|CMDB|Manual"
        json attributes "email, employeeId, dept, title"
        uuid ownerIdentityId FK "nullable"
        datetime createdAt
        datetime updatedAt
    }

    System {
        uuid id PK
        string name UK
        string systemType "AD|LDAP|SaaS|AWS|K8s|DB"
        string connectorFamily "ldap|scim|k8s_api|etc"
        json connectionConfig
        boolean isAuthoritative
        datetime createdAt
        datetime updatedAt
    }

    Account {
        uuid id PK
        uuid systemId FK
        string accountType "ldap_user|idp_user|etc"
        string nativeId UK "with systemId"
        string status "CREATED|ACTIVE|DISABLED|DELETED"
        datetime lastSeenAt
        json metadata
        string credentialRef "nullable"
        datetime createdAt
        datetime updatedAt
    }

    Entitlement {
        uuid id PK
        uuid systemId FK
        string entitlementType "group|role|policy_document|scope"
        string nativeId UK "with systemId"
        string displayName
        int riskScore "0-100"
        boolean isPrivileged
        uuid ownerIdentityId FK "nullable"
        json shape "type-specific attributes"
        datetime createdAt
        datetime updatedAt
    }

    IdentityAccountLink {
        uuid id PK
        uuid identityId FK
        uuid accountId FK
        string relationType "PRIMARY|ADMIN|SHARED|DELEGATED|BREAKGLASS"
        datetime startTime
        datetime endTime "nullable"
        string source "BIRTHRIGHT|REQUEST|IMPORTED|EXCEPTION"
        datetime createdAt
        datetime updatedAt
    }

    AccountEntitlementGrant {
        uuid id PK
        uuid accountId FK
        uuid entitlementId FK
        string grantType "DIRECT|GROUP_IN_GROUP|POLICY_DERIVED"
        datetime startTime
        datetime endTime "nullable"
        string state "PENDING|ACTIVE|FAILED|EXPIRED|REVOKED"
        string provisioningTaskId "nullable"
        datetime createdAt
        datetime updatedAt
    }

    AccessAssignment {
        uuid id PK
        uuid subjectId FK "Identity or Account"
        string subjectType "IDENTITY|ACCOUNT"
        uuid targetId FK "Entitlement or Account"
        string targetType "ENTITLEMENT|ACCOUNT"
        string action "BIND|GRANT|REVOKE"
        uuid requestorId FK
        string approvalState "PENDING_APPROVAL|APPROVED|REJECTED|PROVISIONED|FAILED"
        json approvers "array of decisions"
        string justification
        string ticketRef "nullable"
        datetime slaDeadline "nullable"
        boolean isTimeBound
        datetime endTime "nullable"
        json evidence
        datetime createdAt
        datetime updatedAt
    }

    EntitlementHierarchy {
        uuid parentId PK,FK
        uuid childId PK,FK
    }

    RoleBundle {
        uuid id PK
        string roleName UK
        string description
        datetime createdAt
        datetime updatedAt
    }

    RoleBundleEntitlement {
        uuid roleBundleId PK,FK
        uuid entitlementId PK,FK
    }

    CertificationCampaign {
        uuid id PK
        string campaignName
        json scope "entitlementIds, systemIds"
        json reviewers "array of identityIds"
        datetime dueDate
        string status "DRAFT|ACTIVE|COMPLETED|CANCELLED"
        datetime createdAt
        datetime updatedAt
    }

    CertificationReview {
        uuid id PK
        uuid campaignId FK
        uuid grantId FK
        uuid reviewerId FK
        string decision "CERTIFY|REVOKE, nullable"
        datetime reviewedAt "nullable"
    }

    Event {
        uuid id PK
        string eventType
        datetime timestamp
        uuid actorIdentityId FK "nullable"
        string resourceType
        uuid resourceId FK
        string action
        string outcome "SUCCESS|FAILURE|PENDING"
        json metadata
        string evidenceHash "nullable"
    }
```

---

## Identity State Machine

```mermaid
stateDiagram-v2
    [*] --> STAGED: Create identity
    STAGED --> ACTIVE: Activate
    ACTIVE --> DISABLED: Disable/Suspend
    DISABLED --> ACTIVE: Reactivate
    ACTIVE --> DELETED: Soft delete
    DISABLED --> DELETED: Soft delete
    DELETED --> [*]

    note right of STAGED
        New identity not yet activated
    end note

    note right of ACTIVE
        Identity is active and operational
    end note

    note right of DISABLED
        Temporary suspension
        (e.g., leave of absence)
    end note

    note right of DELETED
        Soft delete, retained for audit
        Cannot be reactivated
    end note
```

---

## Account State Machine

```mermaid
stateDiagram-v2
    [*] --> CREATED: Discover/Create account
    CREATED --> ACTIVE: Activate
    ACTIVE --> DISABLED: Disable
    DISABLED --> ACTIVE: Reactivate
    ACTIVE --> DELETED: Delete
    DISABLED --> DELETED: Delete
    DELETED --> [*]

    note right of CREATED
        Account exists but not yet active
    end note

    note right of ACTIVE
        Account is active in target system
    end note

    note right of DISABLED
        Account disabled (suspended)
    end note

    note right of DELETED
        Account deleted in target system
    end note
```

---

## Grant State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create grant
    PENDING --> ACTIVE: Provisioning success
    PENDING --> FAILED: Provisioning failure
    ACTIVE --> EXPIRED: Time-bound expiry
    ACTIVE --> REVOKED: Manual revocation
    EXPIRED --> [*]
    REVOKED --> [*]
    FAILED --> PENDING: Retry
    FAILED --> [*]: Give up

    note right of PENDING
        Awaiting provisioning
    end note

    note right of ACTIVE
        Successfully provisioned
    end note

    note right of FAILED
        Provisioning failed
        (can retry or abandon)
    end note

    note right of EXPIRED
        Time-bound grant expired
    end note

    note right of REVOKED
        Manually revoked
    end note
```

---

## Access Assignment State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL: Submit request
    PENDING_APPROVAL --> APPROVED: Approve
    PENDING_APPROVAL --> REJECTED: Reject
    APPROVED --> PROVISIONED: Provisioning success
    APPROVED --> FAILED: Provisioning failure
    PROVISIONED --> [*]
    REJECTED --> [*]
    FAILED --> [*]

    note right of PENDING_APPROVAL
        Awaiting approval decision
        SLA: 2 business days
    end note

    note right of APPROVED
        Approved, awaiting provisioning
    end note

    note right of REJECTED
        Request rejected by approver
    end note

    note right of PROVISIONED
        Approved and successfully provisioned
    end note

    note right of FAILED
        Provisioning failed after approval
    end note
```

---

## Certification Campaign Status

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create campaign
    DRAFT --> ACTIVE: Launch campaign
    DRAFT --> CANCELLED: Cancel
    ACTIVE --> COMPLETED: All reviews done
    ACTIVE --> CANCELLED: Cancel
    COMPLETED --> [*]
    CANCELLED --> [*]

    note right of DRAFT
        Campaign being configured
    end note

    note right of ACTIVE
        Reviews in progress
    end note

    note right of COMPLETED
        All reviews completed
    end note

    note right of CANCELLED
        Campaign cancelled
    end note
```

---

## Access Request Workflow

```mermaid
flowchart TD
    Start([User submits access request]) --> CreateAssignment[Create AccessAssignment<br/>state: PENDING_APPROVAL]
    CreateAssignment --> LoadEntitlement[Load target Entitlement]
    LoadEntitlement --> CheckPrivileged{Is privileged?<br/>riskScore >= 70}

    CheckPrivileged -->|Yes| RouteToOwnerAndCISO[Route to:<br/>- Entitlement Owner<br/>- CISO]
    CheckPrivileged -->|No| HasOwner{Has owner?}

    HasOwner -->|Yes| RouteToOwner[Route to:<br/>Entitlement Owner]
    HasOwner -->|No| RouteToDefault[Route to:<br/>Default Approver]

    RouteToOwnerAndCISO --> AwaitApproval[Await approval decision<br/>SLA: 2 business days]
    RouteToOwner --> AwaitApproval
    RouteToDefault --> AwaitApproval

    AwaitApproval --> Decision{Approval<br/>decision?}

    Decision -->|Approved| UpdateStateApproved[Update state:<br/>APPROVED]
    Decision -->|Rejected| UpdateStateRejected[Update state:<br/>REJECTED]

    UpdateStateApproved --> CreateGrant[Create AccountEntitlementGrant<br/>state: PENDING]
    CreateGrant --> Provision[Provision to target system<br/>via connector]

    Provision --> ProvisionResult{Provisioning<br/>result?}

    ProvisionResult -->|Success| UpdateStateProvisioned[Update AccessAssignment:<br/>PROVISIONED<br/>Update Grant:<br/>ACTIVE]
    ProvisionResult -->|Failure| UpdateStateFailed[Update AccessAssignment:<br/>FAILED<br/>Update Grant:<br/>FAILED]

    UpdateStateRejected --> LogEvent1[Log audit event:<br/>AccessRequestRejected]
    UpdateStateFailed --> LogEvent2[Log audit event:<br/>ProvisioningFailed]
    UpdateStateProvisioned --> LogEvent3[Log audit event:<br/>AccessProvisioned]

    LogEvent1 --> End([End])
    LogEvent2 --> End
    LogEvent3 --> End
```

---

## Grant Discovery and Reconciliation

```mermaid
flowchart TD
    Start([Discovery job starts]) --> ConnectSystem[Connect to target system<br/>via connector]
    ConnectSystem --> DiscoverGrants[Discover all grants<br/>discoverGrants()]

    DiscoverGrants --> ForEachGrant{For each<br/>discovered grant}

    ForEachGrant --> FindAccount[Find Account by<br/>systemId + nativeId]
    FindAccount --> AccountExists{Account<br/>exists?}

    AccountExists -->|Yes| FindEntitlement[Find Entitlement by<br/>systemId + nativeId]
    AccountExists -->|No| CreateOrphanedAccount[Flag: Orphaned account<br/>Create account record]

    CreateOrphanedAccount --> FindEntitlement

    FindEntitlement --> EntitlementExists{Entitlement<br/>exists?}

    EntitlementExists -->|Yes| CheckGrantExists[Check if grant exists<br/>accountId + entitlementId]
    EntitlementExists -->|No| CreateOrphanedEntitlement[Flag: Orphaned entitlement<br/>Create entitlement record]

    CreateOrphanedEntitlement --> CheckGrantExists

    CheckGrantExists --> GrantExists{Grant<br/>exists in DB?}

    GrantExists -->|Yes| UpdateLastSeen[Update grant.updatedAt<br/>Mark as reconciled]
    GrantExists -->|No| CreateOutOfBandGrant[Create grant with:<br/>grantType: DIRECT<br/>source: IMPORTED<br/>orphaned: true]

    CreateOutOfBandGrant --> EmitAlert[Emit alert:<br/>Out-of-band grant detected]

    UpdateLastSeen --> ForEachGrant
    EmitAlert --> ForEachGrant

    ForEachGrant -->|Done| FindStaleGrants[Find grants not seen<br/>updatedAt < 24h ago]

    FindStaleGrants --> HasStaleGrants{Found stale<br/>grants?}

    HasStaleGrants -->|Yes| MarkRevoked[Mark grants as:<br/>state: REVOKED<br/>orphaned: true]
    HasStaleGrants -->|No| LogSuccess[Log audit event:<br/>ReconciliationComplete]

    MarkRevoked --> EmitStaleAlert[Emit alert:<br/>Stale grants detected]
    EmitStaleAlert --> LogSuccess

    LogSuccess --> End([End])
```

---

## Effective Access Calculation (Graph Traversal)

```mermaid
graph LR
    Identity[Identity<br/>John Doe] -->|LINKS_TO<br/>relationType: PRIMARY| Account1[Account<br/>john.doe@ldap]
    Identity -->|LINKS_TO<br/>relationType: ADMIN| Account2[Account<br/>john.doe-admin@ldap]

    Account1 -->|HAS_GRANT<br/>grantType: DIRECT| Grant1[Grant<br/>state: ACTIVE]
    Account1 -->|HAS_GRANT<br/>grantType: GROUP_IN_GROUP| Grant2[Grant<br/>state: ACTIVE]
    Account2 -->|HAS_GRANT<br/>grantType: DIRECT| Grant3[Grant<br/>state: ACTIVE]

    Grant1 -->|GRANTS| Ent1[Entitlement<br/>Developers Group]
    Grant2 -->|GRANTS| Ent2[Entitlement<br/>Finance Users]
    Grant3 -->|GRANTS| Ent3[Entitlement<br/>Domain Admins]

    Ent1 -->|CHILD_OF| ParentEnt1[Entitlement<br/>All Employees]
    Ent2 -->|CHILD_OF| ParentEnt2[Entitlement<br/>Finance Department]

    ParentEnt2 -->|CHILD_OF| ParentEnt1

    style Identity fill:#e1f5ff
    style Account1 fill:#fff4e6
    style Account2 fill:#fff4e6
    style Grant1 fill:#e8f5e9
    style Grant2 fill:#e8f5e9
    style Grant3 fill:#e8f5e9
    style Ent1 fill:#f3e5f5
    style Ent2 fill:#f3e5f5
    style Ent3 fill:#ffebee
    style ParentEnt1 fill:#f3e5f5
    style ParentEnt2 fill:#f3e5f5
```

**Legend**:
- Blue: Identity
- Orange: Account
- Green: Grant (ACTIVE)
- Purple: Entitlement
- Red: Privileged Entitlement

**Cypher Query** (via Apache AGE):
```cypher
MATCH (identity:Identity {id: $identityId})
  -[:LINKS_TO]->(account:Account)
  -[:HAS_GRANT]->(grant:Grant {state: 'ACTIVE'})
  -[:GRANTS]->(entitlement:Entitlement)
  -[:CHILD_OF*0..5]->(parent:Entitlement)
RETURN DISTINCT parent, grant
```

---

## Policy Modeling: IGA-Evaluated vs Target-Evaluated

```mermaid
flowchart TD
    PolicyDecision{Where is policy<br/>evaluated?}

    PolicyDecision -->|IGA System<br/>Proactive Evaluation| IGAPolicy[Policy Entity<br/>BIRTHRIGHT or SOD]
    PolicyDecision -->|Target System<br/>Runtime Evaluation| TargetPolicy[Entitlement Entity<br/>entitlementType: policy_document]

    IGAPolicy --> IGAExamples[Examples:<br/>- All Finance → FinanceBaseRole<br/>- Cannot have PurchaseApprover + Vendor<br/>- New employee → BaselineAccess]

    IGAExamples --> IGAGrants[Produces AccountEntitlementGrant<br/>grantType: POLICY_DERIVED]

    IGAGrants --> IGAAudit[Audit in IGA:<br/>Policy evaluation events<br/>Grant creation events]

    TargetPolicy --> TargetExamples[Examples:<br/>- OPA Rego bundles<br/>- AWS IAM policies<br/>- Azure ABAC conditions<br/>- K8s RBAC policies]

    TargetExamples --> TargetGrants[Is itself granted as entitlement<br/>grantType: DIRECT]

    TargetGrants --> TargetProvisioning[Provisioned to target system<br/>via connector]

    TargetProvisioning --> TargetAudit[Audit:<br/>IGA logs provisioning<br/>Target system logs access decisions]

    style IGAPolicy fill:#e1f5ff
    style TargetPolicy fill:#fff4e6
    style IGAGrants fill:#e8f5e9
    style TargetGrants fill:#e8f5e9
```

---

## Viewing Instructions

### In GitHub/GitLab
These Mermaid diagrams will render automatically when viewing this file in:
- GitHub
- GitLab
- VS Code (with Mermaid extension)

### In VS Code
1. Install extension: "Markdown Preview Mermaid Support"
2. Open this file
3. Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac) to preview

### Online Mermaid Editor
Copy any diagram to [Mermaid Live Editor](https://mermaid.live) to:
- Edit interactively
- Export as PNG/SVG
- Share via URL

### Export as Images
Using Mermaid CLI:
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i data-model-diagrams.md -o data-model-erd.png
```

---

## References

- [data-model.md](data-model.md) - Complete data model specification
- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live)
