---
phase: 16-tenant-preferences-profile
plan: 02
status: COMPLETE
started: 2026-02-07
completed: 2026-02-07
commits:
  - 5791e1d: "feat(16-02): add aggregated tenant profile endpoint"
---

## What was done

### Task 1: TenantProfileDto response DTO
- Created `src/users/dto/tenant-profile.dto.ts` with 4 nested DTOs
- UserBasicDto: id, email, firstName, lastName, phone, role
- PreferencesDataDto: preferredCities, preferredBedrooms, preferredPropertyTypes, minBudget, maxBudget, petFriendly, moveInDate
- ApplicationDataDto: income, employment, employmentCompany, applicationId
- RiskDataDto: totalScore, level
- All sections except `user` are nullable for new tenants

### Task 2: Profile aggregation endpoint
- Added `getTenantProfile()` method to UsersService
- Query 1: User + TenantPreference via findUnique with include
- Query 2: Latest non-DRAFT/non-WITHDRAWN/non-REJECTED Application with riskScore include
- Extracts income from `incomeInfo.monthlySalary` JSON field
- Extracts employment from `employmentInfo.employmentType` and `employmentInfo.companyName` JSON fields
- Added `GET /users/me/profile` endpoint with `@Roles(Role.TENANT)` and `TenantProfileDto` Swagger type

## Artifacts
- `src/users/dto/tenant-profile.dto.ts` — TenantProfileDto with nested DTOs
- `src/users/users.service.ts` — getTenantProfile method with multi-source aggregation
- `src/users/users.controller.ts` — GET /users/me/profile endpoint

## Verification
- [x] TypeScript compiles (`npx tsc --noEmit`)
- [x] Endpoint protected with @Roles(Role.TENANT)
- [x] Swagger type annotation for nested schema documentation
- [x] Nullable sections for new tenants (preferences, applicationData, riskData)
