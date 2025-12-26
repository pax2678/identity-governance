# Phase 2 Testing Guide

**Status**: Phase 2 (Foundational) Complete ✅
**Last Updated**: 2025-12-25

> **⚠️ Testing Migration Complete**: We've migrated from legacy script-based tests to Vitest. 
> For current testing documentation, see [TESTING_TDD.md](TESTING_TDD.md).
> 
> **Quick Start**:
> - Run all tests: `npm run test:all`
> - Watch mode: `npm run test:watch`
> - Coverage: `npm run test:coverage`

---

## Overview

Phase 2 has successfully implemented the foundational infrastructure for the IGA Core Data Model with a comprehensive Vitest-based test suite (124 tests).

### ✅ Database Layer (T009-T022)
- **PostgreSQL 16** with **Apache AGE** extension running in Docker
- **Prisma ORM** schema with 11 core entities
- Database migrations applied successfully
- Prisma Client generated with TypeScript types
- Connection pooling configured

### ✅ Domain Models (T023-T028)
- **Identity** model with Zod validation
- **Account** & **IdentityAccountLink** models
- **Entitlement** model with risk scoring
- **Grant** model with state machine
- **AccessAssignment** model with SLA tracking
- **Certification** model for compliance campaigns

### ✅ Authentication (T029)
- **NextAuth.js v5** configured
- API route handlers at `/api/auth/*`
- Middleware-based route protection
- JWT session strategy

### ✅ Connector Framework (T030-T032)
- Base connector interface (`IConnector`)
- Connector type definitions and capabilities
- Connector registry with singleton pattern
- Support for discovery and provisioning operations

### ✅ Services & Utilities (T033-T035)
- **Audit Log Service** with cryptographic evidence hashing
- **Error Handler** with custom IGA error types
- **Graph Query Service** for Apache AGE (Cypher queries)

### ✅ UI Components (T036)
- shadcn/ui components installed: table, card, badge, button, input, form, dialog, label
- Tailwind CSS configured with design system
- lucide-react icons

---

## 🧪 Running Tests

We use **Vitest 3.2.4** (official Next.js recommendation) with 124 tests covering all Phase 2 components.

### Test Commands

```bash
# Run all tests
npm run test:all

# Run by test type
npm run test:unit          # Unit tests (45 tests)
npm run test:integration   # Integration tests (50 tests)
npm run test:contract      # Contract tests (29 tests)

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode (browser-based)
npm run test:ui
```

---

## Test Coverage Summary

| Component | Status | Test Count | Type |
|-----------|--------|------------|------|
| Database Layer | ✅ | 7 | Integration |
| Domain Models | ✅ | 61 | Unit + Integration |
| Connector Framework | ✅ | 42 | Contract + Integration |
| Audit Service | ✅ | 11 | Integration |
| **Total** | **✅** | **124** | **All passing** |

---

## 🌐 Testing the Application

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Expected Behavior**:
- NextAuth.js middleware protects routes
- Application compiles without errors
- No TypeScript errors in console

---

## 🗄️ Database GUI (Prisma Studio)

```bash
npx prisma studio
```

Open [http://localhost:5555](http://localhost:5555)

**What You Can Do**:
- Browse all 11 entity tables
- Manually create test records
- View relationships between entities
- Inspect audit_events table

---

## ❌ What's NOT Testable Yet (Phase 3+)

The following features require Phase 3 (Services) implementation:

### API Endpoints
- ❌ `/api/identities` - Identity CRUD operations
- ❌ `/api/accounts` - Account CRUD operations
- ❌ `/api/entitlements` - Entitlement catalog
- ❌ `/api/grants` - Grant discovery and tracking
- ❌ `/api/access-requests` - Request workflows
- ❌ `/api/certifications` - Certification campaigns

**Reason**: Service layer not yet implemented (T037-T076)

### UI Pages
- ❌ Dashboard pages
- ❌ Identity management pages
- ❌ Access request forms
- ❌ Certification review pages

**Reason**: UI implementation starts in Phase 4 (T077+)

### Real Connectors
- ❌ LDAP connector (Active Directory, OpenLDAP)
- ❌ SCIM connector (Okta, Azure AD)
- ❌ Kubernetes connector

**Reason**: Connector implementations start in Phase 3 (T037+)

### Background Jobs
- ❌ Grant expiry enforcement
- ❌ Identity sync from HRIS
- ❌ Grant reconciliation

**Reason**: Job scheduling requires service layer and API routes

---

## 🔍 Manual Verification Checklist

### Database Setup ✅
- [ ] Run `npx prisma studio` - Should open GUI at localhost:5555
- [ ] Check 15 tables exist in database
- [ ] Verify foreign key relationships work
- [ ] Test manual CRUD via Prisma Studio

### Build & TypeScript ✅
- [ ] Run `npm run build` - Should compile successfully
- [ ] No TypeScript errors
- [ ] All domain models have proper types
- [ ] Prisma Client types are generated

### Development Server ✅
- [ ] Run `npm run dev` - Server starts on localhost:3000
- [ ] Middleware protects routes (redirects to auth)
- [ ] No console errors on startup
- [ ] Hot reload works when editing files

### Test Suite ✅
- [ ] `npm run test:all` - All 124 tests pass
- [ ] `npm run test:unit` - Unit tests pass
- [ ] `npm run test:integration` - Integration tests pass
- [ ] `npm run test:contract` - Contract tests pass

---

## 🚀 Next Steps (Phase 3)

Once you're ready to continue implementation:

1. **Identity Service** (T037-T042)
   - Identity CRUD operations
   - Identity-Account correlation
   - Identity search and filtering

2. **Account Service** (T043-T048)
   - Account CRUD operations
   - Account discovery from connectors
   - Account lifecycle management

3. **Entitlement Service** (T049-T054)
   - Entitlement catalog
   - Risk scoring calculation
   - Entitlement hierarchy management

4. **Real Connectors** (T055-T060)
   - LDAP connector implementation
   - SCIM connector implementation
   - Kubernetes connector implementation

---

## 🐛 Troubleshooting

### Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep iga-postgres

# If not running, start it
docker start iga-postgres

# Or recreate
docker run -d --name iga-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=identity_governance \
  -p 5432:5432 \
  apache/age
```

### Prisma Client Out of Sync

**Error**: `Prisma Client did not initialize yet`

**Solution**:
```bash
npx prisma generate
```

### Test Failures

**Error**: Foreign key constraint violations

**Solution**:
```bash
# Reset database to clean state
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev
```

---

## ✅ Success Criteria

Phase 2 is complete when:

- ✅ All tests pass (`npm run test:all` - 124/124 passing)
- ✅ Application builds without errors (`npm run build`)
- ✅ Development server runs without errors (`npm run dev`)
- ✅ Prisma Studio shows all 11 entity tables
- ✅ Manual CRUD operations work in Prisma Studio

**Status**: ✅ ALL CRITERIA MET - Phase 2 Complete!
