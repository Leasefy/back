---
phase: 28-flex-billing
plan: 02
status: completed
completed_at: "2026-04-04"
---

# Plan 28-02 Summary: FlexBillingModule + PSE Auto-tracking + Manual Canon

## What Was Done
- Created FlexBillingModule (exports FlexBillingService)
- FlexBillingService: registerPsePayment (auto 1% on PSE), reportManualCanon (manual reporting)
- FlexBillingController: POST /inmobiliaria/flex-billing/canon (manual reporting endpoint)
- Integrated PSE auto-tracking into CobrosService.registerPayment() with try/catch (non-blocking)
- CobrosModule imports FlexBillingModule
- FlexBillingModule registered in AppModule
- Uses rentAmount (not totalAmount) for 1% calculation
- Upsert on (consignacionId, month) prevents duplicates

## Files Created
- `src/flex-billing/flex-billing.module.ts`
- `src/flex-billing/flex-billing.service.ts`
- `src/flex-billing/flex-billing.controller.ts`
- `src/flex-billing/dto/report-canon.dto.ts`

## Files Modified
- `src/inmobiliaria/cobros/cobros.service.ts` — PSE auto-tracking injection
- `src/inmobiliaria/cobros/cobros.module.ts` — FlexBillingModule import
- `src/app.module.ts` — FlexBillingModule registration

## Verification
- `npx tsc --noEmit` ✅
