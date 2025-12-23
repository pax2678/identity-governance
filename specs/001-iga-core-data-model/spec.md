# Feature Specification: IGA Core Data Model

**Feature Branch**: `001-iga-core-data-model`
**Created**: 2025-12-22
**Status**: Draft
**Input**: User description: "Implement IGA core data model with Identity, Account, Entitlement primitives and governance workflows"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identity and Account Correlation (Priority: P1)

As an IGA administrator, I need to view a complete inventory of all identities and their associated accounts across target systems, so I can answer "who has access to what" questions for compliance and access reviews.

**Why this priority**: Foundation for all governance activities. Without accurate identity-to-account correlation, no other IGA function can work reliably. This is the "read-only inventory" phase that establishes visibility before any write operations.

**Independent Test**: Can be fully tested by importing identity data from an authoritative source (e.g., HRIS), discovering accounts from target systems (e.g., LDAP, AWS, SaaS), and viewing the correlated identity graph showing which accounts belong to which identities.

**Acceptance Scenarios**:

1. **Given** identity data exists in an authoritative source, **When** the system performs identity import, **Then** all active identities are created with their core attributes (type, display name, status, source, owner for non-human identities)
2. **Given** target systems are configured with connectors, **When** the system discovers accounts, **Then** all accounts are cataloged with their system, account type, native ID, and status
3. **Given** identities and accounts exist in the system, **When** an administrator views the identity graph, **Then** the correlation between identities and accounts is displayed with relationship type (primary, admin, shared, delegated, breakglass)
4. **Given** a new employee is added to HRIS, **When** identity synchronization runs, **Then** a new identity record is created and marked as active
5. **Given** an employee is terminated in HRIS, **When** identity synchronization runs, **Then** the identity status is updated to disabled and all linked accounts are flagged for review

---

### User Story 2 - Entitlement Discovery and Cataloging (Priority: P2)

As an IGA administrator, I need to discover and catalog all entitlements (groups, roles, policies, licenses) from target systems, so I can build a comprehensive access inventory and identify privileged access.

**Why this priority**: Builds on P1 by adding the "what can be granted" dimension. Required before implementing access requests or certifications. Enables risk tagging and privileged access identification.

**Independent Test**: Can be fully tested by discovering entitlements from target systems (e.g., AD groups, AWS policies, SaaS roles), normalizing them into the entitlement catalog, and viewing entitlements with their risk scores and owners.

**Acceptance Scenarios**:

1. **Given** target systems are connected, **When** entitlement discovery runs, **Then** all entitlements are cataloged with type (Group, Role, IAMPolicy, Scope, License, etc.), native ID, display name, and risk score
2. **Given** entitlements are discovered, **When** an administrator views the entitlement catalog, **Then** entitlements are filterable by system, type, risk score, and owner
3. **Given** an entitlement grants administrative privileges, **When** the system analyzes entitlement attributes, **Then** the entitlement is marked as privileged and assigned a high risk score
4. **Given** entitlements support nesting (e.g., group-in-group), **When** entitlement relationships are discovered, **Then** the hierarchy is captured and visualized in the entitlement graph
5. **Given** an entitlement owner needs to be identified, **When** an administrator assigns an owner identity, **Then** the ownership is recorded and displayed in the entitlement catalog

---

### User Story 3 - Access Grant Discovery and Tracking (Priority: P3)

As an IGA administrator, I need to discover and track which accounts have which entitlements, so I can answer "who has what access" questions and identify access creep or orphaned grants.

**Why this priority**: Completes the core inventory capability (identity ↔ account ↔ entitlement). Enables access reviews and SoD detection. Must follow P1 and P2 to ensure accurate identity and entitlement context.

**Independent Test**: Can be fully tested by discovering grants from target systems (e.g., group memberships, role assignments), linking them to accounts and entitlements, and viewing the complete access graph showing which identities have which entitlements through which accounts.

**Acceptance Scenarios**:

1. **Given** accounts and entitlements are cataloged, **When** grant discovery runs, **Then** all grants are recorded with account, entitlement, grant type (direct, group-in-group, policy-derived), and state
2. **Given** grants exist in the system, **When** an administrator views access by identity, **Then** all grants are displayed grouped by target system with effective access paths
3. **Given** grants exist in the system, **When** an administrator views access by entitlement, **Then** all accounts (and their owning identities) with that entitlement are displayed
4. **Given** a user's account is a member of nested groups, **When** effective access is calculated, **Then** both direct and inherited entitlements are shown with grant type indicating derivation
5. **Given** an account has a time-bounded grant, **When** the grant expires, **Then** the grant state is updated and the account is flagged for provisioning action

---

### User Story 4 - Access Request and Approval Workflow (Priority: P4)

As an end user or manager, I need to request access to entitlements for myself or my team members through an approval workflow, so access is granted with proper justification and oversight.

**Why this priority**: First "write" capability that modifies access. Depends on P1-P3 for accurate catalog. Introduces governance controls (approval, justification, time-bounds) before automated provisioning.

**Independent Test**: Can be fully tested by submitting an access request, routing it through approvers based on entitlement owner or policy, capturing justification and ticket reference, and recording the approval decision without actual provisioning to target systems.

**Acceptance Scenarios**:

1. **Given** an authenticated user views the entitlement catalog, **When** they request access to an entitlement, **Then** an AccessAssignment record is created with requestor, subject (identity or account), target entitlement, justification, and state set to pending approval
2. **Given** an access request is pending, **When** the system routes for approval, **Then** the request is sent to the entitlement owner or designated approvers based on entitlement risk and policy
3. **Given** an approver receives a request, **When** they approve it, **Then** the AccessAssignment state changes to approved and the approved timestamp and approver identity are recorded
4. **Given** an access request requires time-bound access, **When** the requestor specifies an expiry date, **Then** the AccessAssignment records the time-bound constraint for future enforcement
5. **Given** an access request is rejected, **When** an approver denies it, **Then** the AccessAssignment state changes to rejected, the reason is captured, and the requestor is notified

---

### User Story 5 - Access Provisioning Execution (Priority: P5)

As an IGA administrator, I need approved access requests to be provisioned to target systems automatically or via connector actions, so entitlements are granted consistently with audit evidence.

**Why this priority**: Implements the automation layer that modifies target systems. Requires all previous priorities for context (P1-P3) and governance (P4). Introduces reconciliation and drift detection.

**Independent Test**: Can be fully tested by provisioning approved grants to a test target system (e.g., add user to LDAP group), capturing evidence of the provisioning action, and verifying the grant state reflects successful provisioning.

**Acceptance Scenarios**:

1. **Given** an AccessAssignment is approved, **When** the provisioning workflow executes, **Then** a Grant record is created linking the account to the entitlement with provisioning state set to pending
2. **Given** a Grant is pending provisioning, **When** the connector provisions the access to the target system, **Then** the Grant state changes to active, provisioning evidence is recorded, and start/end timestamps are set
3. **Given** a Grant fails to provision, **When** the connector encounters an error, **Then** the Grant state changes to failed, the error message is captured, and an alert is generated for manual intervention
4. **Given** a time-bound Grant reaches its expiry, **When** the reconciliation process runs, **Then** the Grant state changes to expired and a revocation task is created
5. **Given** a Grant is revoked manually, **When** the connector deprovisions the access, **Then** the Grant state changes to revoked, the revocation evidence is recorded, and the AccessAssignment is updated

---

### User Story 6 - Access Certification Campaign (Priority: P6)

As an IGA administrator or entitlement owner, I need to periodically review and certify who has access to which entitlements, so access remains appropriate over time and orphaned grants are identified.

**Why this priority**: Implements ongoing governance and compliance. Requires full inventory (P1-P3) and grant tracking. Complements provisioning (P5) with regular attestation cycles.

**Independent Test**: Can be fully tested by launching a certification campaign for a set of entitlements, routing them to owners/managers for review, capturing certification decisions, and generating remediation tasks for revoked grants.

**Acceptance Scenarios**:

1. **Given** an administrator creates a certification campaign, **When** they select target entitlements and reviewers, **Then** a CertificationCampaign record is created with campaign name, scope (entitlements/systems), reviewers, and due date
2. **Given** a certification campaign is launched, **When** the system generates review tasks, **Then** each reviewer receives a list of grants to certify, grouped by entitlement or identity
3. **Given** a reviewer is certifying access, **When** they approve a grant, **Then** the grant is marked as certified with reviewer identity and timestamp
4. **Given** a reviewer is certifying access, **When** they revoke a grant, **Then** the grant is flagged for revocation and a provisioning task is created
5. **Given** a certification campaign completes, **When** the system aggregates results, **Then** a summary report shows certification rates, revoked grants, and outstanding reviews

---

### Edge Cases

- What happens when an identity is linked to accounts in a target system, but those accounts are later deleted in the target without notification to the IGA system? (Orphaned IdentityAccountLink)
- How does the system handle conflicting identity data from multiple authoritative sources with different update timestamps?
- What happens when a grant is discovered in a target system that has no corresponding AccessAssignment (out-of-band grant)?
- How does the system handle entitlements with circular nesting (group A contains group B contains group A)?
- What happens when a non-human identity (service account, API key) has no assigned owner and requires access certification?
- How does the system handle time-bound grants when the target system lacks native expiry support?
- What happens when an entitlement is deleted from the target system while active grants still reference it?
- How does the system correlate accounts when the native ID format changes after a system migration?

## Requirements *(mandatory)*

### Functional Requirements

**Identity Management**

- **FR-001**: System MUST store identities with type (human, service, agent, device, external), display name, status (active, staged, disabled, deleted), identity source, and custom attributes
- **FR-002**: System MUST support owner assignment for non-human identities to establish accountability
- **FR-003**: System MUST synchronize identities from authoritative sources (HRIS, CMDB) on a configurable schedule
- **FR-004**: System MUST detect and handle identity status changes (new hire, termination, role change) from authoritative sources

**Account Management**

- **FR-005**: System MUST catalog accounts with system ID, account type, native ID, status, last seen timestamp, and metadata
- **FR-006**: System MUST support correlation of multiple accounts to a single identity with relationship types (primary, admin, shared, delegated, breakglass)
- **FR-007**: System MUST track account lifecycle state changes (created, active, disabled, deleted) with audit timestamps

**Entitlement Management**

- **FR-008**: System MUST catalog entitlements with type (Group, Role, IAMPolicy, Scope, Permission Set, License, Feature Flag, Certificate Right, etc.), native ID, display name, risk score, and privileged flag
- **FR-009**: System MUST support entitlement ownership assignment to enable access reviews and approval routing
- **FR-010**: System MUST support entitlement nesting and hierarchy modeling (group-in-group, role composition, policy inheritance)
- **FR-011**: System MUST calculate and store risk scores for entitlements based on privilege level and business impact

**Grant Management**

- **FR-012**: System MUST track grants between accounts and entitlements with grant type (direct, derived, policy-based), start/end timestamps, and provisioning state
- **FR-013**: System MUST support time-bound grants with automatic expiry enforcement
- **FR-014**: System MUST detect and flag orphaned grants (grants without corresponding AccessAssignment)
- **FR-015**: System MUST calculate effective access by traversing grant hierarchies and nested entitlements

**Access Request and Approval**

- **FR-016**: System MUST allow users to request access to entitlements with justification and optional ticket reference
- **FR-017**: System MUST route access requests to appropriate approvers based on entitlement owner, risk score, and policy
- **FR-018**: System MUST capture approval decisions (approved, rejected) with approver identity, timestamp, and optional comments
- **FR-019**: System MUST support time-bound access requests with expiry date specification

**Provisioning and Reconciliation**

- **FR-020**: System MUST execute provisioning actions (grant, revoke) to target systems via connectors when AccessAssignments are approved
- **FR-021**: System MUST capture provisioning evidence (API calls, LDAP modify operations, state snapshots) for audit trail
- **FR-022**: System MUST detect provisioning failures and generate alerts for manual intervention
- **FR-023**: System MUST reconcile target system state with IGA system state on a configurable schedule to detect drift
- **FR-024**: System MUST automatically revoke expired grants when time-bound constraints are violated

**Certification and Attestation**

- **FR-025**: System MUST support creation of certification campaigns scoped by entitlements, systems, or identities
- **FR-026**: System MUST route certification tasks to entitlement owners or managers with lists of grants to review
- **FR-027**: System MUST capture certification decisions (certify, revoke) with reviewer identity and timestamp
- **FR-028**: System MUST generate remediation tasks for revoked grants during certification

**Audit and Evidence**

- **FR-029**: System MUST maintain an append-only audit log of all identity, account, entitlement, grant, and approval events
- **FR-030**: System MUST link evidence records (API responses, state snapshots, approval receipts) to AccessAssignments and Grants
- **FR-031**: System MUST support querying audit history by identity, account, entitlement, or time range

**Policy and SoD**

- **FR-032**: System MUST support definition of Segregation of Duties (SoD) policies specifying conflicting entitlement pairs
- **FR-033**: System MUST detect SoD violations when evaluating access requests or during certification
- **FR-034**: System MUST support birthright policies that automatically grant entitlements based on identity attributes (e.g., department, role)

### Key Entities

- **Identity**: Represents an actor (human, service, agent, device) with unique ID, type, display name, status, identity source, attributes (JSON), and optional owner for non-human identities. Relationships: 1..N to Accounts via IdentityAccountLink.

- **System**: Represents a target application or service with unique ID, name, system type (AD, LDAP, SaaS, AWS, K8s, DB), connector type (SCIM, LDAP, REST, Terraform), and optional authoritative flags. Relationships: 1..N to Accounts, 1..N to Entitlements.

- **Account**: Represents an identity's presence in a target system with unique ID, system ID, account type, native ID (immutable), status, last seen timestamp, metadata (JSON), and optional credential reference. Relationships: N..1 to System, 0..N to Identities via IdentityAccountLink, 0..N to Entitlements via AccountEntitlementGrant.

- **Entitlement**: Represents a grantable capability with unique ID, system ID, entitlement type, native ID, display name, risk score, privileged flag, owner identity ID, and entitlement shape (JSON). Relationships: N..1 to System, 0..N to Accounts via AccountEntitlementGrant, 0..N to other Entitlements (hierarchy).

- **IdentityAccountLink (Binding)**: Represents ownership/usage of an account by an identity with identity ID, account ID, relation type (primary, admin, shared, delegated, breakglass), start/end timestamps, and source (birthright, request, imported, exception). Relationships: N..1 to Identity, N..1 to Account.

- **AccountEntitlementGrant (Grant)**: Represents an account's possession of an entitlement with account ID, entitlement ID, grant type (direct, group-in-group, policy-derived), start/end timestamps, and provisioning state (pending, active, failed, expired, revoked). Relationships: N..1 to Account, N..1 to Entitlement.

- **AccessAssignment**: Represents a governance wrapper for access requests/approvals with unique ID, subject (identity or account ID), target (entitlement or account ID), action (bind, grant, revoke), requestor identity ID, approval state (pending, approved, rejected), approvers list, justification, ticket reference, SLA, time-bound flag, and evidence array. Relationships: References Identity, Account, Entitlement; 1..N to Evidence.

- **RoleBundle**: (Optional) Represents a business role mapping to a set of entitlements with unique ID, role name, description, and entitlement IDs. Relationships: 0..N to Entitlements.

- **Policy**: (Optional) Represents birthright rules, SoD constraints, or ABAC conditions with unique ID, policy type (birthright, SoD, ABAC), policy definition (JSON), and enabled flag. Relationships: May reference Entitlements or Identity attributes.

- **CertificationCampaign**: (Optional) Represents an attestation campaign with unique ID, campaign name, scope (entitlement/system IDs), reviewers, due date, and status. Relationships: 0..N to Grants (to be certified).

- **Event**: (Optional) Represents an audit log entry with unique ID, event type, timestamp, actor identity ID, resource references (identity/account/entitlement IDs), action, and outcome. Relationships: May reference any entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Inventory and Visibility**

- **SC-001**: Administrators can answer "who has access to what" queries in under 5 seconds for any identity, account, or entitlement
- **SC-002**: System discovers and correlates 95% of accounts from connected target systems within 24 hours of initial connector configuration
- **SC-003**: Identity synchronization from authoritative sources completes within 15 minutes and detects status changes with less than 1 hour lag

**Access Governance**

- **SC-004**: Access requests are routed to appropriate approvers within 1 minute of submission and approvers can complete review in under 3 minutes
- **SC-005**: 90% of access requests receive approval or rejection decisions within 2 business days (SLA tracking)
- **SC-006**: Provisioning actions complete within 5 minutes for 95% of approved requests (excluding manual connectors)
- **SC-007**: Time-bound grants are revoked within 1 hour of expiry with 99% reliability

**Certification and Compliance**

- **SC-008**: Certification campaigns reach 90% completion rate within the campaign due date
- **SC-009**: Reviewers can certify or revoke access for 50 grants in under 10 minutes using bulk actions
- **SC-010**: SoD violations are detected within 1 minute of grant creation or access request submission

**Audit and Evidence**

- **SC-011**: 100% of access changes (grants, revocations, approvals) are logged in the audit trail with evidence links
- **SC-012**: Audit queries return results within 10 seconds for searches spanning 90 days of history
- **SC-013**: Provisioning evidence is retained for all grants with cryptographic hash verification of evidence integrity

**System Scalability**

- **SC-014**: System supports at least 10,000 identities, 50,000 accounts, and 100,000 grants with query performance under 5 seconds
- **SC-015**: Reconciliation cycles complete for 10 target systems within 1 hour without impacting user-facing query performance
- **SC-016**: System handles 50 concurrent access requests and 20 concurrent certification reviews without degradation

**Data Quality**

- **SC-017**: Identity-to-account correlation accuracy exceeds 95% based on matching rules and manual validation samples
- **SC-018**: Orphaned grants (no AccessAssignment) are identified and flagged within 24 hours of discovery
- **SC-019**: Duplicate identity detection identifies potential duplicates based on fuzzy name/email matching with 90% precision

## Assumptions

1. **Authoritative Source Integration**: Assumes at least one authoritative source (HRIS or CMDB) provides reliable identity data with unique employee IDs
2. **Target System Connectivity**: Assumes target systems expose APIs or protocols (LDAP, REST, SCIM) for account and entitlement discovery
3. **Connector Availability**: Assumes connectors can be implemented or exist for top 3 target system types (LDAP/AD, SaaS via SCIM, cloud IAM)
4. **Identity Correlation**: Assumes email address or employee ID can be used as primary correlation key between identities and accounts
5. **Approval Routing**: Assumes entitlement owners can be identified and mapped to identity records for approval workflows
6. **Time-Zone Handling**: Assumes all timestamps are stored in UTC and converted to user local time zones for display
7. **Data Retention**: Assumes audit events and evidence are retained for minimum 90 days (compliance requirements may extend this)
8. **Non-Human Identity Ownership**: Assumes all service accounts and non-human identities have a designated human owner for governance
9. **Provisioning Idempotency**: Assumes connectors handle idempotent grant/revoke operations (no error if already granted/revoked)
10. **Evidence Storage**: Assumes evidence artifacts (API responses, state snapshots) are stored separately from core entities with reference links
