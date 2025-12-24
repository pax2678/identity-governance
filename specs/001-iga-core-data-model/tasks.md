# Tasks: IGA Core Data Model

**Input**: Design documents from `/specs/001-iga-core-data-model/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are NOT included in this task list as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router project structure:
- **API Routes**: `app/api/`
- **UI Components**: `app/(dashboard)/`, `app/(portal)/`, `components/ui/`
- **Business Logic**: `lib/services/`, `lib/connectors/`
- **Models**: `lib/models/`
- **Database**: `prisma/schema.prisma`, `lib/db/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per research.md technology decisions

- [ ] T001 Initialize Next.js 14+ project with App Router and TypeScript 5.x in project root
- [ ] T002 [P] Install core dependencies: NextAuth.js, Prisma ORM, PostgreSQL client, shadcn/ui, Tailwind CSS per research.md
- [ ] T003 [P] Configure ESLint and Prettier for TypeScript code style
- [ ] T004 [P] Initialize Prisma with PostgreSQL connection in prisma/schema.prisma
- [ ] T005 [P] Setup Tailwind CSS v3 with globals.css and tailwind.config.ts per research.md Decision #8
- [ ] T006 [P] Configure Next.js middleware for authentication in middleware.ts
- [ ] T007 [P] Initialize shadcn/ui components directory with `npx shadcn-ui@latest init` per research.md
- [ ] T008 Create project directory structure: app/, lib/, components/, prisma/ per plan.md lines 166-318

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Define Prisma schema for Identity entity in prisma/schema.prisma per data-model.md lines 73-106
- [ ] T010 [P] Define Prisma schema for System entity in prisma/schema.prisma per data-model.md lines 108-137
- [ ] T011 [P] Define Prisma schema for Account entity in prisma/schema.prisma per data-model.md lines 139-186
- [ ] T012 [P] Define Prisma schema for Entitlement entity in prisma/schema.prisma per data-model.md lines 216-250
- [ ] T013 [P] Define Prisma schema for IdentityAccountLink entity in prisma/schema.prisma per data-model.md lines 279-315
- [ ] T014 [P] Define Prisma schema for AccountEntitlementGrant entity in prisma/schema.prisma per data-model.md lines 317-386
- [ ] T015 [P] Define Prisma schema for EntitlementHierarchy join table in prisma/schema.prisma per data-model.md lines 264-274
- [ ] T016 [P] Define Prisma schema for AccessAssignment entity in prisma/schema.prisma per data-model.md lines 488-564
- [ ] T017 [P] Define Prisma schema for RoleBundle entity (optional) in prisma/schema.prisma per data-model.md lines 594-625
- [ ] T018 [P] Define Prisma schema for Policy entity (optional) in prisma/schema.prisma per data-model.md lines 631-653
- [ ] T019 [P] Define Prisma schema for CertificationCampaign entity (optional) in prisma/schema.prisma per data-model.md lines 687-728
- [ ] T020 Run Prisma migration to create database tables: `npx prisma migrate dev --name init`
- [ ] T021 Generate Prisma Client types: `npx prisma generate`
- [ ] T022 Create database client singleton in lib/db/client.ts with connection pooling
- [ ] T023 [P] Create TypeScript domain models for Identity in lib/models/identity.ts with Zod validation
- [ ] T024 [P] Create TypeScript domain models for Account in lib/models/account.ts with Zod validation
- [ ] T025 [P] Create TypeScript domain models for Entitlement in lib/models/entitlement.ts with Zod validation
- [ ] T026 [P] Create TypeScript domain models for Grant in lib/models/grant.ts with Zod validation
- [ ] T027 [P] Create TypeScript domain models for AccessAssignment in lib/models/access-assignment.ts with Zod validation
- [ ] T028 [P] Create TypeScript domain models for Certification in lib/models/certification.ts with Zod validation
- [ ] T029 Setup NextAuth.js configuration in lib/auth/auth.config.ts per research.md
- [ ] T030 [P] Create base connector interface in lib/connectors/base/connector.interface.ts per research.md Decision #5
- [ ] T031 [P] Create connector types (DiscoverAccountsRequest, DiscoverEntitlementsRequest, etc.) in lib/connectors/base/connector.types.ts per data-model.md
- [ ] T032 [P] Create connector registry and factory in lib/connectors/registry.ts per research.md
- [ ] T033 [P] Create audit log service skeleton in lib/services/audit/audit-log.service.ts for append-only event logging per FR-029
- [ ] T034 [P] Setup API error handling middleware in lib/utils/error-handler.ts
- [ ] T035 [P] Create graph query helpers in lib/utils/graph-query.ts for PostgreSQL with Apache AGE per research.md Decision #2
- [ ] T036 Install shadcn/ui components: table, card, badge, button, input, form, dialog per research.md lines 276-292

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Identity and Account Correlation (Priority: P1) 🎯 MVP

**Goal**: View complete inventory of all identities and associated accounts across target systems to answer "who has access to what" for compliance

**Independent Test**: Import identity data from HRIS, discover accounts from LDAP/AWS/SaaS, view correlated identity graph showing which accounts belong to which identities

### Implementation for User Story 1

- [ ] T037 [P] [US1] Implement IdentityService for CRUD operations in lib/services/identity-registry/identity.service.ts per FR-001, FR-002
- [ ] T038 [P] [US1] Implement AccountService for CRUD operations in lib/services/identity-registry/account.service.ts per FR-005, FR-007
- [ ] T039 [US1] Implement CorrelationService for identity-account linking in lib/services/identity-registry/correlation.service.ts per FR-006
- [ ] T040 [US1] Implement identity synchronization logic from HRIS in lib/services/identity-registry/identity.service.ts per FR-003, FR-004
- [ ] T041 [P] [US1] Create GET /api/identities endpoint in app/api/identities/route.ts per contracts/identity-registry-api.yaml
- [ ] T042 [P] [US1] Create POST /api/identities endpoint in app/api/identities/route.ts for manual identity creation
- [ ] T043 [P] [US1] Create GET /api/identities/:id endpoint in app/api/identities/[id]/route.ts
- [ ] T044 [P] [US1] Create PATCH /api/identities/:id endpoint in app/api/identities/[id]/route.ts
- [ ] T045 [P] [US1] Create GET /api/identities/:id/accounts endpoint in app/api/identities/[id]/accounts/route.ts per contracts
- [ ] T046 [P] [US1] Create GET /api/accounts endpoint in app/api/accounts/route.ts per contracts/identity-registry-api.yaml
- [ ] T047 [P] [US1] Create POST /api/accounts endpoint in app/api/accounts/route.ts
- [ ] T048 [P] [US1] Create GET /api/accounts/:id endpoint in app/api/accounts/[id]/route.ts
- [ ] T049 [P] [US1] Create GET /api/accounts/:id/grants endpoint in app/api/accounts/[id]/grants/route.ts
- [ ] T050 [US1] Implement LDAP connector for account discovery in lib/connectors/ldap/ldap.connector.ts per research.md and coverage-matrix.yaml
- [ ] T051 [US1] Implement identity correlation algorithm (email/employee ID matching) in lib/services/identity-registry/correlation.service.ts per Assumption 4
- [ ] T052 [P] [US1] Create identity list page UI in app/(dashboard)/identities/page.tsx using shadcn Table
- [ ] T053 [P] [US1] Create identity detail page UI in app/(dashboard)/identities/[id]/page.tsx with access graph visualization
- [ ] T054 [P] [US1] Create IdentityTable component in app/(dashboard)/identities/components/identity-table.tsx per plan.md line 209
- [ ] T055 [P] [US1] Create IdentityFilters component in app/(dashboard)/identities/components/identity-filters.tsx per plan.md line 210
- [ ] T056 [US1] Implement identity sync scheduled job in app/api/cron/sync-identities/route.ts per FR-003 and research.md Decision #6
- [ ] T057 [US1] Add validation and error handling for identity and account operations
- [ ] T058 [US1] Add audit logging for identity lifecycle events (create, status change) per FR-029

**Checkpoint**: At this point, User Story 1 should be fully functional - can view identities, accounts, and their correlations

---

## Phase 4: User Story 2 - Entitlement Discovery and Cataloging (Priority: P2)

**Goal**: Discover and catalog all entitlements (groups, roles, policies, licenses) from target systems to build comprehensive access inventory and identify privileged access

**Independent Test**: Discover entitlements from AD groups/AWS policies/SaaS roles, normalize into entitlement catalog, view entitlements with risk scores and owners

### Implementation for User Story 2

- [ ] T059 [P] [US2] Implement EntitlementService for CRUD operations in lib/services/entitlement-catalog/entitlement.service.ts per FR-008, FR-009
- [ ] T060 [US2] Implement risk scoring algorithm in lib/services/entitlement-catalog/entitlement.service.ts per FR-011
- [ ] T061 [US2] Implement entitlement hierarchy traversal logic in lib/services/entitlement-catalog/entitlement.service.ts per FR-010
- [ ] T062 [P] [US2] Create GET /api/entitlements endpoint in app/api/entitlements/route.ts per contracts/identity-registry-api.yaml
- [ ] T063 [P] [US2] Create POST /api/entitlements endpoint in app/api/entitlements/route.ts
- [ ] T064 [P] [US2] Create GET /api/entitlements/:id endpoint in app/api/entitlements/[id]/route.ts
- [ ] T065 [P] [US2] Create PATCH /api/entitlements/:id endpoint in app/api/entitlements/[id]/route.ts for owner assignment
- [ ] T066 [US2] Extend LDAP connector with discoverEntitlements method in lib/connectors/ldap/ldap.connector.ts
- [ ] T067 [P] [US2] Implement SCIM connector for entitlement discovery in lib/connectors/scim/scim.connector.ts per research.md
- [ ] T068 [P] [US2] Create entitlement catalog page UI in app/(dashboard)/entitlements/page.tsx
- [ ] T069 [P] [US2] Create EntitlementTable component with filtering by system/type/risk in app/(dashboard)/entitlements/components/entitlement-table.tsx
- [ ] T070 [P] [US2] Create EntitlementFilters component in app/(dashboard)/entitlements/components/entitlement-filters.tsx
- [ ] T071 [US2] Create entitlement hierarchy visualization component in app/(dashboard)/entitlements/components/entitlement-graph.tsx
- [ ] T072 [US2] Implement entitlement discovery trigger endpoint in app/api/connectors/discovery/route.ts per contracts
- [ ] T073 [US2] Add validation and error handling for entitlement operations
- [ ] T074 [US2] Add audit logging for entitlement discovery events per FR-029

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - can view identities, accounts, and entitlements

---

## Phase 5: User Story 3 - Access Grant Discovery and Tracking (Priority: P3)

**Goal**: Discover and track which accounts have which entitlements to answer "who has what access" and identify access creep or orphaned grants

**Independent Test**: Discover grants from target systems (group memberships, role assignments), link to accounts and entitlements, view complete access graph

### Implementation for User Story 3

- [ ] T075 [P] [US3] Implement GrantService for grant CRUD operations in lib/services/access-graph/grant.service.ts per FR-012, FR-013
- [ ] T076 [US3] Implement effective access calculation with grant hierarchy traversal in lib/services/access-graph/grant.service.ts per FR-015
- [ ] T077 [US3] Implement orphaned grant detection in lib/services/access-graph/grant.service.ts per FR-014
- [ ] T078 [P] [US3] Create GET /api/grants endpoint for access graph queries in app/api/grants/route.ts per contracts
- [ ] T079 [P] [US3] Create GET /api/grants/:id endpoint in app/api/grants/[id]/route.ts
- [ ] T080 [P] [US3] Create PATCH /api/grants/:id endpoint in app/api/grants/[id]/route.ts for state updates
- [ ] T081 [US3] Extend LDAP connector with discoverGrants method (group memberships) in lib/connectors/ldap/ldap.connector.ts
- [ ] T082 [US3] Extend SCIM connector with discoverGrants method in lib/connectors/scim/scim.connector.ts
- [ ] T083 [P] [US3] Implement Kubernetes RBAC connector for grant discovery in lib/connectors/k8s/k8s.connector.ts per research.md
- [ ] T084 [P] [US3] Create access graph visualization page in app/(dashboard)/access-graph/page.tsx
- [ ] T085 [P] [US3] Create AccessGraphView component showing identity → account → entitlement paths in app/(dashboard)/access-graph/components/access-graph-view.tsx
- [ ] T086 [P] [US3] Create GrantsTable component with grouping by target system in app/(dashboard)/access-graph/components/grants-table.tsx
- [ ] T087 [US3] Implement grant expiry enforcement scheduled job in app/api/cron/enforce-expiry/route.ts per FR-024 and research.md Decision #6
- [ ] T088 [US3] Implement reconciliation scheduled job in app/api/cron/reconcile-grants/route.ts per FR-023 and research.md
- [ ] T089 [US3] Add validation for time-bound grant constraints per FR-013
- [ ] T090 [US3] Add audit logging for grant lifecycle events per FR-029

**Checkpoint**: All core inventory capabilities complete - identities, accounts, entitlements, and grants are fully tracked

---

## Phase 6: User Story 4 - Access Request and Approval Workflow (Priority: P4)

**Goal**: Request access to entitlements through approval workflow so access is granted with proper justification and oversight

**Independent Test**: Submit access request, route through approvers based on entitlement owner/policy, capture justification and ticket reference, record approval decision

### Implementation for User Story 4

- [ ] T091 [P] [US4] Implement AccessRequestService for request creation in lib/services/governance/access-request.service.ts per FR-016, FR-017, FR-018
- [ ] T092 [US4] Implement approval routing logic based on entitlement owner and risk in lib/services/governance/access-request.service.ts per FR-017
- [ ] T093 [US4] Implement SoD policy detection service in lib/services/governance/sod-policy.service.ts per FR-032, FR-033
- [ ] T094 [P] [US4] Create POST /api/access-requests endpoint in app/api/access-requests/route.ts per contracts/governance-api.yaml
- [ ] T095 [P] [US4] Create GET /api/access-requests/:id endpoint in app/api/access-requests/[id]/route.ts
- [ ] T096 [P] [US4] Create POST /api/access-requests/:id/approve endpoint in app/api/access-requests/[id]/approve/route.ts
- [ ] T097 [P] [US4] Create POST /api/access-requests/:id/reject endpoint in app/api/access-requests/[id]/reject/route.ts
- [ ] T098 [P] [US4] Create access request form page in app/(portal)/request/page.tsx for end users
- [ ] T099 [P] [US4] Create RequestWizard component (multi-step form) in app/(portal)/components/request-wizard.tsx per plan.md line 229
- [ ] T100 [P] [US4] Create pending approvals page in app/(dashboard)/access-requests/page.tsx for approvers
- [ ] T101 [P] [US4] Create request detail page in app/(dashboard)/access-requests/[id]/page.tsx
- [ ] T102 [P] [US4] Create RequestForm component with Zod validation in app/(dashboard)/access-requests/components/request-form.tsx per plan.md line 215
- [ ] T103 [P] [US4] Create ApprovalDialog component in app/(dashboard)/access-requests/components/approval-dialog.tsx per plan.md line 216
- [ ] T104 [US4] Implement SLA tracking for access requests per SC-005
- [ ] T105 [US4] Implement time-bound access request handling per FR-019
- [ ] T106 [US4] Add validation for access request justification and ticket reference
- [ ] T107 [US4] Add audit logging for access request and approval events per FR-029

**Checkpoint**: Access request workflow functional - users can request, approvers can approve/reject, no actual provisioning yet

---

## Phase 7: User Story 5 - Access Provisioning Execution (Priority: P5)

**Goal**: Provision approved access requests to target systems automatically or via connector actions with audit evidence

**Independent Test**: Provision approved grants to test LDAP group, capture provisioning evidence, verify grant state reflects successful provisioning

### Implementation for User Story 5

- [ ] T108 [P] [US5] Implement ProvisionerService for grant/revoke orchestration in lib/services/provisioning/provisioner.service.ts per FR-020, FR-021
- [ ] T109 [US5] Implement provisioning error handling and retry logic in lib/services/provisioning/provisioner.service.ts per FR-022
- [ ] T110 [US5] Implement provisioning evidence capture in lib/services/provisioning/provisioner.service.ts per FR-021
- [ ] T111 [P] [US5] Create GET /api/provisioning/tasks endpoint in app/api/provisioning/tasks/route.ts
- [ ] T112 [P] [US5] Create GET /api/provisioning/tasks/:id endpoint in app/api/provisioning/tasks/[id]/route.ts
- [ ] T113 [P] [US5] Create POST /api/provisioning/tasks/:id/retry endpoint in app/api/provisioning/tasks/[id]/retry/route.ts
- [ ] T114 [US5] Extend LDAP connector with grantEntitlement method (add user to group) in lib/connectors/ldap/ldap.connector.ts
- [ ] T115 [US5] Extend LDAP connector with revokeEntitlement method (remove user from group) in lib/connectors/ldap/ldap.connector.ts
- [ ] T116 [US5] Extend SCIM connector with grantEntitlement method in lib/connectors/scim/scim.connector.ts
- [ ] T117 [US5] Extend SCIM connector with revokeEntitlement method in lib/connectors/scim/scim.connector.ts
- [ ] T118 [US5] Implement connector task status polling with getTaskStatus in lib/connectors/base/connector.interface.ts
- [ ] T119 [P] [US5] Create provisioning tasks page in app/(dashboard)/provisioning/page.tsx
- [ ] T120 [P] [US5] Create ProvisioningTasksTable component in app/(dashboard)/provisioning/components/tasks-table.tsx
- [ ] T121 [US5] Implement provisioning workflow trigger when AccessAssignment is approved
- [ ] T122 [US5] Implement grant state transitions (pending → active → expired/revoked) per data-model.md
- [ ] T123 [US5] Add validation for provisioning evidence integrity per SC-013
- [ ] T124 [US5] Add audit logging for provisioning actions per FR-029

**Checkpoint**: Full provisioning capability - approved requests automatically provision to target systems with evidence

---

## Phase 8: User Story 6 - Access Certification Campaign (Priority: P6)

**Goal**: Periodically review and certify who has access to which entitlements so access remains appropriate and orphaned grants are identified

**Independent Test**: Launch certification campaign for entitlements, route to owners/managers for review, capture certification decisions, generate remediation tasks

### Implementation for User Story 6

- [ ] T125 [P] [US6] Implement CertificationService for campaign management in lib/services/governance/certification.service.ts per FR-025, FR-026
- [ ] T126 [US6] Implement certification review logic and remediation task generation in lib/services/governance/certification.service.ts per FR-027, FR-028
- [ ] T127 [P] [US6] Create GET /api/certifications/campaigns endpoint in app/api/certifications/campaigns/route.ts
- [ ] T128 [P] [US6] Create POST /api/certifications/campaigns endpoint in app/api/certifications/campaigns/route.ts
- [ ] T129 [P] [US6] Create GET /api/certifications/campaigns/:id endpoint in app/api/certifications/campaigns/[id]/route.ts
- [ ] T130 [P] [US6] Create GET /api/certifications/campaigns/:id/reviews endpoint in app/api/certifications/campaigns/[id]/reviews/route.ts
- [ ] T131 [P] [US6] Create POST /api/certifications/campaigns/:id/reviews endpoint for bulk certify/revoke in app/api/certifications/campaigns/[id]/reviews/route.ts
- [ ] T132 [P] [US6] Create certification campaigns list page in app/(dashboard)/certifications/page.tsx per plan.md line 218
- [ ] T133 [P] [US6] Create campaign review UI in app/(dashboard)/certifications/[id]/page.tsx per plan.md line 219
- [ ] T134 [P] [US6] Create ReviewTable component with bulk actions in app/(dashboard)/certifications/components/review-table.tsx per plan.md line 221
- [ ] T135 [P] [US6] Create CampaignProgress component in app/(dashboard)/certifications/components/campaign-progress.tsx per plan.md line 222
- [ ] T136 [US6] Implement certification campaign completion and summary report generation
- [ ] T137 [US6] Add validation for campaign scope and due date
- [ ] T138 [US6] Add audit logging for certification decisions per FR-029

**Checkpoint**: Full certification capability - can launch campaigns, reviewers certify/revoke access, remediation tasks created

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T139 [P] Add policy_document entitlement type support per data-model.md lines 260-353 and research.md Decision #9
- [ ] T140 [P] Implement birthright policy evaluator in lib/policy/birthright-rules.ts per research.md Decision #3
- [ ] T141 [P] Add SoD policy definitions in lib/policy/sod-rules.ts
- [ ] T142 [P] Create audit events query endpoint in app/api/audit/events/route.ts per FR-031 and contracts
- [ ] T143 [P] Implement PostgreSQL with Apache AGE graph queries in lib/utils/graph-query.ts per research.md Decision #2
- [ ] T144 [P] Add OpenBao integration preparation for credential storage in lib/secrets/ per research.md Decision #7
- [ ] T145 [P] Optimize query performance for SC-001 requirement (< 5s response time)
- [ ] T146 [P] Add dashboard home page with access overview in app/(dashboard)/page.tsx per plan.md line 204
- [ ] T147 [P] Create my-access page for end users in app/(portal)/my-access/page.tsx per plan.md line 225
- [ ] T148 [P] Create AccessCard component in app/(portal)/components/access-card.tsx per plan.md line 228
- [ ] T149 [P] Add comprehensive error handling and user-friendly error messages
- [ ] T150 [P] Performance optimization: add database indexes for frequently queried columns
- [ ] T151 [P] Security hardening: validate all API inputs with Zod schemas
- [ ] T152 [P] Add rate limiting to API endpoints
- [ ] T153 Run quickstart.md validation to ensure developer onboarding works
- [ ] T154 Documentation review and updates in specs/001-iga-core-data-model/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent from US1 but builds on inventory concept
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Requires US1 and US2 data to be meaningful (identity, account, entitlement catalog)
- **User Story 4 (P4)**: Depends on US1, US2, US3 for accurate catalog before governance workflows
- **User Story 5 (P5)**: Depends on US4 for approval workflow before provisioning
- **User Story 6 (P6)**: Depends on US1, US2, US3 for complete inventory; complements US5 with ongoing compliance

### Within Each User Story

- Services before API endpoints
- API endpoints before UI components
- Connector base interface before connector implementations
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
  - T009-T019: All Prisma schema definitions can be done in parallel
  - T023-T028: All TypeScript domain models can be done in parallel
  - T030-T036: Infrastructure setup tasks can be done in parallel
- Once Foundational phase completes, US1 and US2 can start in parallel
- Within each story, tasks marked [P] can run in parallel:
  - Multiple API endpoints for the same story
  - Multiple UI components for the same story
  - Multiple connector implementations
- Different user stories can be worked on in parallel by different team members (respecting dependencies)

---

## Parallel Example: User Story 1

```bash
# Launch service implementations together:
Task: "Implement IdentityService in lib/services/identity-registry/identity.service.ts"
Task: "Implement AccountService in lib/services/identity-registry/account.service.ts"

# Launch API endpoints together after services complete:
Task: "Create GET /api/identities endpoint in app/api/identities/route.ts"
Task: "Create POST /api/identities endpoint in app/api/identities/route.ts"
Task: "Create GET /api/identities/:id endpoint in app/api/identities/[id]/route.ts"
Task: "Create PATCH /api/identities/:id endpoint in app/api/identities/[id]/route.ts"
Task: "Create GET /api/accounts endpoint in app/api/accounts/route.ts"

# Launch UI components together after API endpoints complete:
Task: "Create identity list page UI in app/(dashboard)/identities/page.tsx"
Task: "Create identity detail page UI in app/(dashboard)/identities/[id]/page.tsx"
Task: "Create IdentityTable component in app/(dashboard)/identities/components/identity-table.tsx"
Task: "Create IdentityFilters component in app/(dashboard)/identities/components/identity-filters.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch API endpoints together after EntitlementService completes:
Task: "Create GET /api/entitlements endpoint in app/api/entitlements/route.ts"
Task: "Create POST /api/entitlements endpoint in app/api/entitlements/route.ts"
Task: "Create GET /api/entitlements/:id endpoint in app/api/entitlements/[id]/route.ts"
Task: "Create PATCH /api/entitlements/:id endpoint in app/api/entitlements/[id]/route.ts"

# Launch connector implementations together:
Task: "Implement SCIM connector in lib/connectors/scim/scim.connector.ts"
Task: "Extend LDAP connector with discoverEntitlements method"

# Launch UI components together:
Task: "Create entitlement catalog page UI in app/(dashboard)/entitlements/page.tsx"
Task: "Create EntitlementTable component in app/(dashboard)/entitlements/components/entitlement-table.tsx"
Task: "Create EntitlementFilters component in app/(dashboard)/entitlements/components/entitlement-filters.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T037-T058)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Can import identities from HRIS?
   - Can discover accounts from LDAP?
   - Can view identity-account correlation graph?
5. Deploy/demo if ready

### Incremental Delivery

1. **Foundation**: Complete Setup + Foundational → Database and infrastructure ready
2. **MVP (US1)**: Add User Story 1 → Test independently → Deploy/Demo (Identity and account inventory)
3. **Entitlements (US2)**: Add User Story 2 → Test independently → Deploy/Demo (Complete access catalog)
4. **Access Graph (US3)**: Add User Story 3 → Test independently → Deploy/Demo (Who has what access)
5. **Governance (US4)**: Add User Story 4 → Test independently → Deploy/Demo (Access request workflow)
6. **Automation (US5)**: Add User Story 5 → Test independently → Deploy/Demo (Provisioning to target systems)
7. **Compliance (US6)**: Add User Story 6 → Test independently → Deploy/Demo (Certification campaigns)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together (T001-T036)
2. **Week 2-3**: Once Foundational is done:
   - Developer A: User Story 1 (Identity/Account correlation)
   - Developer B: User Story 2 (Entitlement catalog)
3. **Week 4**:
   - Developer A: User Story 3 (Access grant tracking)
4. **Week 5-6**:
   - Developer A: User Story 4 (Access requests)
   - Developer B: User Story 5 (Provisioning)
5. **Week 7**:
   - Developer A or B: User Story 6 (Certification)
6. **Week 8**: Polish phase together
7. Stories complete and integrate independently

---

## Task Count Summary

**Total Tasks**: 154

**By Phase**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 28 tasks (CRITICAL BLOCKING)
- Phase 3 (US1 - Identity/Account): 22 tasks
- Phase 4 (US2 - Entitlements): 16 tasks
- Phase 5 (US3 - Grants): 16 tasks
- Phase 6 (US4 - Access Requests): 17 tasks
- Phase 7 (US5 - Provisioning): 17 tasks
- Phase 8 (US6 - Certification): 14 tasks
- Phase 9 (Polish): 16 tasks

**Parallel Opportunities**: 89 tasks marked [P] can run in parallel (within their phase constraints)

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 = 58 tasks (Identity and Account correlation only)

**Independent Test Criteria**:
- US1: Import identities, discover accounts, view correlation graph
- US2: Discover entitlements, view catalog with risk scores
- US3: Discover grants, view access graph with effective access paths
- US4: Submit request, route to approvers, capture approval decision
- US5: Provision to LDAP, capture evidence, verify grant state
- US6: Launch campaign, certify access, generate remediation tasks

---

## Notes

- [P] tasks = different files, no dependencies within their phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests were NOT included as they were not requested in the feature specification
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Technology stack: Next.js 14+, TypeScript 5.x, Prisma ORM, PostgreSQL 16 with Apache AGE, shadcn/ui, Tailwind CSS per research.md
- All file paths follow Next.js App Router convention per plan.md
