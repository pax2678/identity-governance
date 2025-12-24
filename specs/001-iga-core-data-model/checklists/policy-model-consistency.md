# Policy Model Consistency Checklist

**Purpose**: Validate requirements quality and consistency after removing ABAC from PolicyType enum
**Created**: 2025-12-23
**Focus**: Data model requirements completeness, clarity, and consistency
**Scope**: Policy entity, GrantType semantics, and related entitlement modeling

---

## Requirement Completeness

- [ ] CHK001 - Are all valid policy types (BIRTHRIGHT, SOD) documented with clear purpose and use cases? [Completeness, data-model.md §9]
- [ ] CHK002 - Is the removal of ABAC from PolicyType justified with rationale documented? [Traceability, Gap]
- [ ] CHK003 - Are alternative modeling approaches for ABAC (via policy_document entitlements) documented? [Completeness, Gap]
- [ ] CHK004 - Are policy definition schemas provided for all remaining PolicyType values? [Completeness, data-model.md §9]
- [ ] CHK005 - Is the relationship between Policy entity and AccountEntitlementGrant clarified after ABAC removal? [Completeness, data-model.md §6, §9]

## Requirement Clarity

- [ ] CHK006 - Is the distinction between IGA-evaluated policies (BIRTHRIGHT/SOD) and target-system-evaluated policies (policy_document) explicitly stated? [Clarity, Gap]
- [ ] CHK007 - Is the GrantType.POLICY_DERIVED comment updated to reflect it's for BIRTHRIGHT only, not ABAC? [Clarity, data-model.md §6]
- [ ] CHK008 - Are the evaluation semantics (proactive vs runtime) clearly documented for each policy mechanism? [Clarity, Gap]
- [ ] CHK009 - Is "policy_document" entitlement type definition clear about containing runtime-evaluated logic? [Clarity, data-model.md §4]
- [ ] CHK010 - Are examples provided showing how ABAC-style policies map to policy_document entitlements? [Clarity, Gap]

## Requirement Consistency

- [ ] CHK011 - Do GrantType enum values align consistently with remaining PolicyType values? [Consistency, data-model.md §6]
- [ ] CHK012 - Are policy-related comments in AccountEntitlementGrant consistent with Policy entity definition? [Consistency, data-model.md §6, §9]
- [ ] CHK013 - Is the Purpose description of Policy entity consistent with the remaining PolicyType values? [Consistency, data-model.md §9]
- [ ] CHK014 - Are OPA policy bundle references (in connector matrix) consistent with policy_document entitlement modeling? [Consistency, coverage-matrix.yaml reference]
- [ ] CHK015 - Do Birthright policy examples align with GrantType.POLICY_DERIVED semantics? [Consistency, data-model.md §9]

## Acceptance Criteria Quality

- [ ] CHK016 - Can the distinction between BIRTHRIGHT policies and policy_document entitlements be objectively verified? [Measurability]
- [ ] CHK017 - Are success criteria defined for when to use Policy entity vs Entitlement.entitlementType=policy_document? [Measurability, Gap]
- [ ] CHK018 - Can POLICY_DERIVED grants be traced back to specific BIRTHRIGHT policies? [Traceability, data-model.md §6]
- [ ] CHK019 - Are validation rules specified to prevent creating POLICY_DERIVED grants without corresponding BIRTHRIGHT policy? [Measurability, Gap]

## Scenario Coverage

- [ ] CHK020 - Are requirements defined for migrating existing ABAC policy records (if any existed)? [Coverage, Migration, Gap]
- [ ] CHK021 - Are requirements specified for hybrid scenarios (BIRTHRIGHT + policy_document in same identity)? [Coverage, Gap]
- [ ] CHK022 - Are edge cases addressed when BIRTHRIGHT policy references a policy_document entitlement? [Coverage, Edge Case, Gap]
- [ ] CHK023 - Are requirements defined for auditing policy evaluation events (BIRTHRIGHT vs runtime)? [Coverage, Gap]

## Edge Case Coverage

- [ ] CHK024 - Is behavior defined when GrantType.POLICY_DERIVED grant exists but BIRTHRIGHT policy is deleted? [Edge Case, Gap]
- [ ] CHK025 - Are requirements specified for nested policy scenarios (policy_document containing ABAC logic referencing other policies)? [Edge Case, Gap]
- [ ] CHK026 - Is fallback behavior defined when policy evaluation fails (BIRTHRIGHT evaluation errors)? [Edge Case, Exception Flow, Gap]

## Non-Functional Requirements

- [ ] CHK027 - Are performance requirements specified for BIRTHRIGHT policy evaluation frequency? [Performance, Gap]
- [ ] CHK028 - Are audit requirements defined for policy-derived grant creation/revocation? [Audit, Gap]
- [ ] CHK029 - Are security requirements specified for policy definition storage and modification? [Security, Gap]

## Dependencies & Assumptions

- [ ] CHK030 - Is the dependency on OPA connector family for policy_document provisioning documented? [Dependency, coverage-matrix.yaml reference]
- [ ] CHK031 - Is the assumption that target systems evaluate policy_document runtime logic validated? [Assumption, Gap]
- [ ] CHK032 - Are integration requirements with coverage-matrix.yaml policy_opa connector family documented? [Dependency, Gap]

## Ambiguities & Conflicts

- [ ] CHK033 - Is the term "policy" consistently used (IGA Policy entity vs policy_document entitlement)? [Ambiguity, Terminology]
- [ ] CHK034 - Are there any remaining references to "ABAC" in related documentation that conflict with removal? [Conflict, data-model.md, research.md, plan.md]
- [ ] CHK035 - Is the relationship between Policy.policyType and Entitlement.entitlementType unambiguous? [Ambiguity, data-model.md §4, §9]

## Traceability & Documentation

- [ ] CHK036 - Are all policy-related requirements traceable to functional requirements (FR-XXX)? [Traceability, data-model.md §9]
- [ ] CHK037 - Is the design decision to remove ABAC documented in research.md or similar artifact? [Traceability, Gap]
- [ ] CHK038 - Are cross-references between Policy entity and coverage-matrix.yaml policy_opa family documented? [Traceability, Gap]
- [ ] CHK039 - Is migration guidance provided for teams understanding old ABAC references? [Documentation, Gap]
- [ ] CHK040 - Are examples provided showing complete flow: BIRTHRIGHT policy → POLICY_DERIVED grant → audit trail? [Documentation, Gap]

---

**Coverage Summary**: 40 items across 10 quality dimensions
**Traceability**: 33/40 items (82.5%) include explicit references or gap markers
**Focus Areas**: Policy model consistency, ABAC removal impact, policy vs entitlement distinction

**Next Steps**:
1. Review data-model.md against checklist items
2. Address identified gaps (especially CHK002, CHK003, CHK006, CHK010)
3. Update research.md with ABAC removal rationale if missing
4. Consider adding examples to clarify policy_document vs Policy entity distinction
