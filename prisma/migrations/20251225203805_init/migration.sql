-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('HUMAN', 'SERVICE', 'AGENT', 'DEVICE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('ACTIVE', 'STAGED', 'DISABLED', 'DELETED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('CREATED', 'ACTIVE', 'DISABLED', 'DELETED');

-- CreateEnum
CREATE TYPE "AccountRelationType" AS ENUM ('PRIMARY', 'ADMIN', 'SHARED', 'DELEGATED', 'BREAKGLASS');

-- CreateEnum
CREATE TYPE "LinkSource" AS ENUM ('BIRTHRIGHT', 'REQUEST', 'IMPORTED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('DIRECT', 'GROUP_IN_GROUP', 'POLICY_DERIVED');

-- CreateEnum
CREATE TYPE "GrantState" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('IDENTITY', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('ENTITLEMENT', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "AssignmentAction" AS ENUM ('BIND', 'GRANT', 'REVOKE');

-- CreateEnum
CREATE TYPE "ApprovalState" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROVISIONED', 'FAILED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('BIRTHRIGHT', 'SOD');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('CERTIFY', 'REVOKE');

-- CreateEnum
CREATE TYPE "EventOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING');

-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "identityType" "IdentityType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "IdentityStatus" NOT NULL,
    "identitySource" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "ownerIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systems" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "connectorFamily" TEXT NOT NULL,
    "connectionConfig" JSONB NOT NULL,
    "isAuthoritative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "accountType" TEXT NOT NULL,
    "nativeId" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL,
    "credentialRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "entitlementType" TEXT NOT NULL,
    "nativeId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "isPrivileged" BOOLEAN NOT NULL DEFAULT false,
    "ownerIdentityId" UUID,
    "shape" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_account_links" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "relationType" "AccountRelationType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "source" "LinkSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_account_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_entitlement_grants" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "grantType" "GrantType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "state" "GrantState" NOT NULL,
    "provisioningTaskId" TEXT,
    "accessAssignmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_entitlement_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_hierarchies" (
    "parentId" UUID NOT NULL,
    "childId" UUID NOT NULL,

    CONSTRAINT "entitlement_hierarchies_pkey" PRIMARY KEY ("parentId","childId")
);

-- CreateTable
CREATE TABLE "access_assignments" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "subjectType" "SubjectType" NOT NULL,
    "targetId" UUID NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "action" "AssignmentAction" NOT NULL,
    "requestorId" UUID NOT NULL,
    "approvalState" "ApprovalState" NOT NULL,
    "approvers" JSONB NOT NULL,
    "justification" TEXT NOT NULL,
    "ticketRef" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "isTimeBound" BOOLEAN NOT NULL DEFAULT false,
    "endTime" TIMESTAMP(3),
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_bundles" (
    "id" UUID NOT NULL,
    "roleName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_bundle_entitlements" (
    "roleBundleId" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,

    CONSTRAINT "role_bundle_entitlements_pkey" PRIMARY KEY ("roleBundleId","entitlementId")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "policyType" "PolicyType" NOT NULL,
    "policyDefinition" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_campaigns" (
    "id" UUID NOT NULL,
    "campaignName" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "reviewers" JSONB NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_reviews" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "grantId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "ReviewDecision",
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "certification_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "resourceType" TEXT NOT NULL,
    "resourceId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" "EventOutcome" NOT NULL,
    "metadata" JSONB NOT NULL,
    "evidenceHash" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identities_status_identityType_idx" ON "identities"("status", "identityType");

-- CreateIndex
CREATE INDEX "identities_identitySource_idx" ON "identities"("identitySource");

-- CreateIndex
CREATE UNIQUE INDEX "systems_name_key" ON "systems"("name");

-- CreateIndex
CREATE INDEX "systems_systemType_idx" ON "systems"("systemType");

-- CreateIndex
CREATE INDEX "systems_connectorFamily_idx" ON "systems"("connectorFamily");

-- CreateIndex
CREATE INDEX "accounts_systemId_accountType_idx" ON "accounts"("systemId", "accountType");

-- CreateIndex
CREATE INDEX "accounts_status_idx" ON "accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_systemId_nativeId_key" ON "accounts"("systemId", "nativeId");

-- CreateIndex
CREATE INDEX "entitlements_systemId_entitlementType_idx" ON "entitlements"("systemId", "entitlementType");

-- CreateIndex
CREATE INDEX "entitlements_isPrivileged_idx" ON "entitlements"("isPrivileged");

-- CreateIndex
CREATE INDEX "entitlements_riskScore_idx" ON "entitlements"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_systemId_nativeId_key" ON "entitlements"("systemId", "nativeId");

-- CreateIndex
CREATE INDEX "identity_account_links_identityId_idx" ON "identity_account_links"("identityId");

-- CreateIndex
CREATE INDEX "identity_account_links_accountId_idx" ON "identity_account_links"("accountId");

-- CreateIndex
CREATE INDEX "identity_account_links_relationType_idx" ON "identity_account_links"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "identity_account_links_identityId_accountId_key" ON "identity_account_links"("identityId", "accountId");

-- CreateIndex
CREATE INDEX "account_entitlement_grants_accountId_idx" ON "account_entitlement_grants"("accountId");

-- CreateIndex
CREATE INDEX "account_entitlement_grants_entitlementId_idx" ON "account_entitlement_grants"("entitlementId");

-- CreateIndex
CREATE INDEX "account_entitlement_grants_state_idx" ON "account_entitlement_grants"("state");

-- CreateIndex
CREATE INDEX "account_entitlement_grants_endTime_idx" ON "account_entitlement_grants"("endTime");

-- CreateIndex
CREATE UNIQUE INDEX "account_entitlement_grants_accountId_entitlementId_key" ON "account_entitlement_grants"("accountId", "entitlementId");

-- CreateIndex
CREATE INDEX "access_assignments_approvalState_idx" ON "access_assignments"("approvalState");

-- CreateIndex
CREATE INDEX "access_assignments_requestorId_idx" ON "access_assignments"("requestorId");

-- CreateIndex
CREATE INDEX "access_assignments_slaDeadline_idx" ON "access_assignments"("slaDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "role_bundles_roleName_key" ON "role_bundles"("roleName");

-- CreateIndex
CREATE INDEX "certification_reviews_campaignId_idx" ON "certification_reviews"("campaignId");

-- CreateIndex
CREATE INDEX "certification_reviews_reviewerId_idx" ON "certification_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "audit_events_eventType_idx" ON "audit_events"("eventType");

-- CreateIndex
CREATE INDEX "audit_events_actorIdentityId_idx" ON "audit_events"("actorIdentityId");

-- CreateIndex
CREATE INDEX "audit_events_resourceType_resourceId_idx" ON "audit_events"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_events_timestamp_idx" ON "audit_events"("timestamp");

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_account_links" ADD CONSTRAINT "identity_account_links_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_account_links" ADD CONSTRAINT "identity_account_links_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_entitlement_grants" ADD CONSTRAINT "account_entitlement_grants_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_entitlement_grants" ADD CONSTRAINT "account_entitlement_grants_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_entitlement_grants" ADD CONSTRAINT "account_entitlement_grants_accessAssignmentId_fkey" FOREIGN KEY ("accessAssignmentId") REFERENCES "access_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_hierarchies" ADD CONSTRAINT "entitlement_hierarchies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_hierarchies" ADD CONSTRAINT "entitlement_hierarchies_childId_fkey" FOREIGN KEY ("childId") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_assignments" ADD CONSTRAINT "access_assignments_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_bundle_entitlements" ADD CONSTRAINT "role_bundle_entitlements_roleBundleId_fkey" FOREIGN KEY ("roleBundleId") REFERENCES "role_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_bundle_entitlements" ADD CONSTRAINT "role_bundle_entitlements_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_reviews" ADD CONSTRAINT "certification_reviews_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "certification_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
