# Loanalize Implementation Plan V6 (MVP + Trust Mode)

## Status Header
**Last Updated:** 2026-01-29
**Current Focus:** Math Engine + Statement Match Harness (Phase 1)
**Overall Status:** On Track
**Owner:** TBD
**PR/Commit Links:** TBD

---

## Next Up (Top 3)
1. **P1-07** - Complete recast.ts implementation
2. **P1-08** - Complete refi.ts implementation
3. **P1-09** - Complete goal_seek.ts implementation

---

## North Star
Build Loanalize as the "premium mortgage utility" that users trust because it can MATCH their real statement.
Core loop remains: Snap & Solve -> Freedom Control Panel -> Scenarios -> Export.
New wedge: Statement Match Mode (Trust Mode).

Source: V5 concept and stack. (Expo + TS + Victory Native XL + GPT-4o Vision extraction) [Project Brief Jan 2026]

---

## MVP Feature Set (V6)

### A) Snap & Solve (Input)
- [ ] **A-01** - Photo capture (statement)
- [ ] **A-02** - PDF import (statement PDF)
- [ ] **A-03** - GPT-4o Vision extraction implementation:
  - principal balance
  - interest rate (note rate)
  - scheduled payment (P&I)
  - escrow payment (optional)
  - next due date / maturity date (if present)
- [ ] **A-04** - Confirm screen (user edits fields, selects assumptions)

#### Tracking: Snap & Solve
**Definition of Done:**
- User can capture/import statement
- GPT-4o extracts all required fields
- Confirm screen allows editing and assumption selection

**Artifacts/Files:**
- `/app/screens/CaptureScreen.tsx`
- `/app/screens/ConfirmScreen.tsx`
- `/lib/extraction/gpt_vision.ts`

**Tests/Verification:**
- Test with 5+ different statement formats
- Verify extraction accuracy >90%
- Confirm screen validation works

**Notes/Risks:**
- GPT-4o API costs
- Privacy: raw statement must be deleted immediately

---

### B) Trust Mode (New, MVP Differentiator)
Goal: reconcile Loanalize schedule to the user's statement.

**Required Inputs:**
- [ ] **B-01** - Principal balance extraction
- [ ] **B-02** - Note rate extraction
- [ ] **B-03** - Scheduled P&I payment extraction
- [ ] **B-04** - Next due date extraction
- [ ] **B-05** - Last payment date (manual if not on statement)

**Optional Inputs:**
- [ ] **B-06** - Escrow (tax/insurance) extraction
- [ ] **B-07** - PMI extraction
- [ ] **B-08** - HOA extraction

**Assumption Sets:**
- [ ] **B-09** - Standard Monthly Amortization (fixed-rate, monthly interest)
- [ ] **B-10** - Daily Accrual (simple-interest style, interest accrues daily; payment date matters)

**Advanced Assumptions (hidden behind "Assumptions"):**
- [ ] **B-11** - Day count basis: Actual/365 default, optional 30/360
- [ ] **B-12** - Payment application order: baseline standard (interest → principal → escrow → fees)

**Statement Match Output:**
- [x] **B-13** - MATCH: delta <= $0.01 (implemented in statement_match.ts)
- [x] **B-14** - CLOSE: delta <= $1.00 (implemented in statement_match.ts)
- [x] **B-15** - NO MATCH: show diagnostics (implemented in statement_match.ts)

**Trust UI:**
- [ ] **B-16** - "Assumptions" drawer always visible in results
- [ ] **B-17** - Export includes assumption set + match status

#### Tracking: Trust Mode
**Definition of Done:**
- Statement match runs against user's statement data
- MATCH/CLOSE/NO_MATCH status correctly identified
- Assumptions drawer shows active settings
- Match status appears in exports

**Artifacts/Files:**
- [x] `/lib/engine/statement_match.ts`
- [x] `/lib/engine/__tests__/statement_match.test.ts`
- `/app/components/AssumptionsDrawer.tsx` (pending)
- `/app/screens/TrustModeScreen.tsx` (pending)

**Tests/Verification:**
- [x] 10 synthetic test cases pass
- [ ] 18/20 real statement samples show MATCH within $0.01
- [ ] Match diagnostics helpful for debugging

**Notes/Risks:**
- Lender variations in interest calculation methods
- User confusion if NO_MATCH without clear explanation

---

### C) Freedom Control Panel (Core)
**Interactive Controls (60fps):**
- [ ] **C-01** - Extra monthly principal slider
- [ ] **C-02** - Lump sum principal injection
- [ ] **C-03** - Bi-weekly toggle (with disclosure: some servicers hold partials; model assumes applied as scheduled)
- [ ] **C-04** - Payoff-by-date goal seek:
  - User picks target payoff date → app computes required extra/month
  - User picks extra/month → app shows payoff date

#### Tracking: Freedom Control Panel
**Definition of Done:**
- All controls render and update at 60fps
- Goal seek converges correctly
- Bi-weekly disclosure shown

**Artifacts/Files:**
- `/app/components/ControlPanel.tsx`
- `/app/components/ExtraPrincipalSlider.tsx`
- `/lib/engine/goal_seek.ts` (pending)

**Tests/Verification:**
- Performance: measure frame rate on mid-tier device
- Goal seek: verify against manual calculations
- Bi-weekly: test payment schedule correctness

---

### D) Scenario Compare (MVP)
- [ ] **D-01** - 3 saved scenarios: Baseline, Plan A, Plan B
- [ ] **D-02** - Compare payoff date
- [ ] **D-03** - Compare total interest
- [ ] **D-04** - Compare total paid
- [ ] **D-05** - Compare cash required upfront (for lump/recast/refi)

#### Tracking: Scenario Compare
**Definition of Done:**
- User can save/name 3 scenarios
- Comparison table shows all 4 metrics
- Scenarios persist in local storage

**Artifacts/Files:**
- `/lib/engine/scenario.ts` (pending)
- `/app/components/ScenarioCompare.tsx` (pending)

**Tests/Verification:**
- Save/load scenarios from AsyncStorage
- Comparison calculations verified

---

### E) Recast Simulator (MVP)
**Inputs:**
- [ ] **E-01** - Lump sum amount
- [ ] **E-02** - Recast fee (default range w/ disclosure)
- [ ] **E-03** - Remaining term unchanged; rate unchanged

**Outputs:**
- [ ] **E-04** - New payment (P&I)
- [ ] **E-05** - Savings over remaining life
- [ ] **E-06** - Break-even vs just paying extra principal monthly

#### Tracking: Recast Simulator
**Definition of Done:**
- Recast calculations mathematically verified
- Break-even comparison accurate
- Fee disclosure shown

**Artifacts/Files:**
- `/lib/engine/recast.ts` (pending)
- `/app/screens/RecastScreen.tsx` (pending)

**Tests/Verification:**
- Verify against lender recast calculators
- Test break-even edge cases

---

### F) Refi Breakeven (MVP)
**Inputs:**
- [ ] **F-01** - New rate
- [ ] **F-02** - Term option (keep remaining term vs reset 30)
- [ ] **F-03** - Closing costs
- [ ] **F-04** - Pay costs cash vs roll into loan
- [ ] **F-05** - Expected time in home (months)

**Outputs:**
- [ ] **F-06** - True breakeven timeline (cash flow)
- [ ] **F-07** - Total savings if stay X months
- [ ] **F-08** - Warning if breakeven beyond stay horizon

#### Tracking: Refi Breakeven
**Definition of Done:**
- Cash flow breakeven correctly calculated
- Warning shown for risky refi scenarios
- Cost roll-in math verified

**Artifacts/Files:**
- `/lib/engine/refi.ts` (pending)
- `/app/screens/RefiScreen.tsx` (pending)

**Tests/Verification:**
- Compare against 3+ online refi calculators
- Test edge cases (high closing costs, short stay)

---

### G) Export/Share (MVP)
- [ ] **G-01** - Export PDF (one-page summary)
- [ ] **G-02** - Export CSV amortization schedule
- [ ] **G-03** - PDF includes scenario comparison table
- [ ] **G-04** - PDF includes assumption set
- [ ] **G-05** - PDF includes statement match status
- [ ] **G-06** - PDF includes charts snapshot

#### Tracking: Export/Share
**Definition of Done:**
- PDF exports successfully on iOS/Android
- CSV includes full amortization schedule
- All required elements present in PDF

**Artifacts/Files:**
- `/lib/engine/export.ts` (pending)
- `/lib/pdf/generator.ts` (pending)

**Tests/Verification:**
- Test PDF render on both platforms
- Verify CSV format compatible with Excel/Sheets

---

## Math Engine: Non-Negotiables (Trust)
- [x] **P0-01** - Money type: cents as bigint (implemented)
- [x] **P0-02** - Integer-safe interest calculations (implemented)
- [x] **P0-03** - Input validation for interest helpers (implemented)
- [ ] **P0-04** - Rate type: basis points or micro-rate (if needed)
- [x] **P0-05** - Rounding policy defined and tested (half-up rounding)

**Engine Modules:**
- [x] **P1-01** - `/lib/engine/money.ts` (cents bigint helpers) ✓
- [x] **P1-02** - `/lib/engine/dates.ts` (day count helpers, payment cadence) ✓
- [x] **P1-03** - `/lib/engine/assumptions.ts` (AssumptionSet schema) ✓
- [x] **P1-04** - `/lib/engine/payment_apply.ts` (application order) ✓
- [x] **P1-05** - `/lib/engine/amort_fixed.ts` (monthly amortization) ✓
- [ ] **P1-06** - `/lib/engine/amort_daily.ts` (daily accrual amortization)
- [ ] **P1-07** - `/lib/engine/recast.ts`
- [ ] **P1-08** - `/lib/engine/refi.ts`
- [ ] **P1-09** - `/lib/engine/goal_seek.ts` (binary search on extra payment)
- [ ] **P1-10** - `/lib/engine/scenario.ts` (scenario runner + compare)
- [ ] **P1-11** - `/lib/engine/export.ts` (CSV + PDF data assembly)
- [ ] **P1-12** - `/lib/engine/principal_curtailment.ts` (extra payments - may be covered in amort_fixed)
- [x] **P1-13** - `/lib/engine/statement_match.ts` (statement match harness) ✓

**Assumption Set Defaults:**
- [x] **P1-14** - Monthly amortization for baseline (STANDARD_MONTHLY implemented)
- [ ] **P1-15** - Daily accrual enabled only when it improves statement match OR user selects it

#### Tracking: Math Engine
**Definition of Done:**
- All engine modules implemented
- All modules have >90% test coverage
- Integer math verified (no float money operations)
- Rounding policy consistently applied

**Artifacts/Files:**
- All `/lib/engine/*.ts` files
- All `/lib/engine/__tests__/*.test.ts` files

**Tests/Verification:**
- [x] 159 tests passing (money, dates, assumptions, payment_apply, amort_fixed, statement_match)
- [ ] Golden test cases pass (see Verification Plan)
- [ ] Property tests pass (see Verification Plan)

**Notes/Risks:**
- Daily accrual implementation complexity
- Matching all lender variations may be impossible

---

## Verification Plan (Math Trust)

### 1) Golden Test Cases (Must)
- [ ] **V-01** - Create `/lib/engine/__golden__/cases.json`
- [ ] **V-02** - Include at least 5 test cases with:
  - inputs
  - expected first 3 periods (interest, principal, balance)
  - expected payoff totals for baseline and one extra-payment scenario
- [ ] **V-03** - Validate against 3+ independent online calculators for standard amortization
- [ ] **V-04** - Include internal statement match cases from real statements (redacted)

#### Tracking: Golden Tests
**Definition of Done:**
- All golden test cases pass
- Cases cover edge scenarios (early payoff, large extra payments, etc.)
- Sources documented for each case

**Artifacts/Files:**
- `/lib/engine/__golden__/cases.json`
- `/lib/engine/__tests__/golden.test.ts`

**Tests/Verification:**
- Compare against: bankrate.com, calculator.net, mortgagecalculator.org

---

### 2) Property Tests (Should)
**Invariants:**
- [ ] **V-05** - Balance never increases (except refi roll-in)
- [ ] **V-06** - sum(principal paid) + ending balance == starting balance
- [ ] **V-07** - total payment == principal + interest + escrow + fees (modeled)

#### Tracking: Property Tests
**Definition of Done:**
- Property tests run on generated scenarios
- Invariants hold for 100+ random inputs

**Artifacts/Files:**
- `/lib/engine/__tests__/property.test.ts`

---

### 3) Statement Match Harness (Must)
- [x] **V-08** - Given (balance, rate, scheduled P&I, due date, last paid date):
  - [x] Run monthly model
  - [ ] Run daily model
  - [x] Compute delta vs scheduled statement expectations
  - [ ] Choose best match OR require user selection
- [x] **V-09** - Expose match diagnostics for debugging

**Definition of Done:**
- [ ] **V-10** - 20 statement samples: 18/20 show MATCH within $0.01 under one assumption set

#### Tracking: Statement Match Harness
**Definition of Done:**
- Harness implemented and tested
- 18/20 real statements match within $0.01
- Diagnostics clearly indicate failure reasons

**Artifacts/Files:**
- [x] `/lib/engine/statement_match.ts` ✓
- [x] `/lib/engine/__tests__/statement_match.test.ts` ✓
- [ ] `/lib/engine/__golden__/statements/` (real redacted samples)

**Tests/Verification:**
- [x] 10 synthetic tests pass
- [ ] 18/20 real statement tests pass

---

## App Architecture (MVP)
- [ ] **ARCH-01** - Expo + TS setup
- [ ] **ARCH-02** - Local-first storage: AsyncStorage for loan + scenarios
- [ ] **ARCH-03** - Optional Supabase sync (NOT in MVP unless required)
- [ ] **ARCH-04** - AI extraction endpoint
- [ ] **ARCH-05** - Delete raw statement immediately after parsing
- [ ] **ARCH-06** - User must confirm extracted values before running math

#### Tracking: App Architecture
**Definition of Done:**
- Expo app runs on iOS and Android
- AsyncStorage persists data correctly
- Privacy: no raw statements stored

**Artifacts/Files:**
- `/app.json`
- `/app/_layout.tsx`
- `/lib/storage/`

**Tests/Verification:**
- Test data persistence across app restarts
- Verify statement deletion

---

## UI Implementation Phases (Do in Order)

### Phase 1: Math Engine + Tests
- [x] **PH1-01** - Implement engine modules (partially complete)
- [ ] **PH1-02** - Build golden tests
- [ ] **PH1-03** - Build property tests
- [x] **PH1-04** - Build statement match harness (complete)
- [ ] **PH1-05** - CLI runner script to print amort schedule (dev only)

#### Tracking: Phase 1
**Definition of Done:**
- All core engine modules implemented
- Golden + property tests green
- Statement match harness functional
- CLI runner works for debugging

**Artifacts/Files:**
- All `/lib/engine/*.ts` modules
- All test files
- `/scripts/cli_amort.ts` (pending)

**Tests/Verification:**
- Run `npm test` - all pass
- CLI runner outputs correct schedule

**Notes/Risks:**
- Daily accrual complexity may delay Phase 1

---

### Phase 2: Intake + Confirm
- [ ] **PH2-01** - Camera capture
- [ ] **PH2-02** - PDF import
- [ ] **PH2-03** - GPT extraction endpoint integration
- [ ] **PH2-04** - Confirm screen w/ assumptions selector
- [ ] **PH2-05** - Save LoanProfile locally

#### Tracking: Phase 2
**Definition of Done:**
- User can capture/import and extract statement
- Confirm screen allows editing all fields
- Data persists to AsyncStorage

**Artifacts/Files:**
- `/app/screens/CaptureScreen.tsx`
- `/app/screens/ConfirmScreen.tsx`
- `/lib/extraction/gpt_vision.ts`

**Tests/Verification:**
- Test with 10+ different statements
- Verify data persistence

---

### Phase 3: Control Panel + Chart
- [ ] **PH3-01** - Sliders/toggles implementation
- [ ] **PH3-02** - Scenario compare panel
- [ ] **PH3-03** - Victory Native XL chart w/ scrub

#### Tracking: Phase 3
**Definition of Done:**
- Controls update at 60fps
- Chart renders and scrubs smoothly
- Scenario compare shows all metrics

**Artifacts/Files:**
- `/app/components/ControlPanel.tsx`
- `/app/components/Chart.tsx`
- `/app/components/ScenarioCompare.tsx`

**Tests/Verification:**
- Profile with Xcode/Android Studio (60fps target)
- Test on mid-tier device

---

### Phase 4: Recast/Refi + Export
- [ ] **PH4-01** - Recast screen
- [ ] **PH4-02** - Refi screen
- [ ] **PH4-03** - PDF export implementation
- [ ] **PH4-04** - CSV export implementation

#### Tracking: Phase 4
**Definition of Done:**
- Recast and Refi calculators work correctly
- PDF and CSV exports functional on both platforms
- All required elements in exports

**Artifacts/Files:**
- `/app/screens/RecastScreen.tsx`
- `/app/screens/RefiScreen.tsx`
- `/lib/engine/export.ts`
- `/lib/pdf/generator.ts`

**Tests/Verification:**
- Verify exports on iOS and Android
- Test recast/refi against calculators

---

## Release Criteria
- [ ] **REL-01** - Math trust suite green (all tests pass)
- [ ] **REL-02** - Statement match badge works and never lies
- [ ] **REL-03** - 60fps slider and chart scrub on mid-tier devices
- [ ] **REL-04** - 18/20 real statements show MATCH
- [ ] **REL-05** - Export PDF/CSV tested on both platforms

---

## What makes Loanalize "unique" at MVP
- Statement Match Mode (Trust Mode)
- Assumption transparency (users can see why numbers differ)
- Goal seek + scenario compare + export in a premium UI

---

## Progress Log

### 2026-01-29
**What Changed:**
- ✅ Completed fees handling fix (payment_apply.ts) - fees now paid separately from P&I
- ✅ Implemented integer-safe interest calculations (money.ts) - BigInt fixed-point arithmetic
- ✅ Added strict input validation for interest helpers (money.ts)
- ✅ Implemented statement match harness (statement_match.ts)
- ✅ All 159 tests passing
- 📝 Added tracking structure to Implementation Plan V6

**Completed Tasks:**
- P0-01, P0-02, P0-03, P0-05
- P1-01, P1-02, P1-03, P1-04, P1-05, P1-13
- B-13, B-14, B-15
- PH1-04
- V-08, V-09

**Commits/PRs:** TBD

---

### [Future Entry Template]
**Date:** YYYY-MM-DD
**What Changed:**
**Completed Tasks:**
**Commits/PRs:**
**Blockers/Notes:**
