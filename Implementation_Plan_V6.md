# Loanalize Implementation Plan V6 (MVP + Trust Mode)

---

## 📊 Progress Dashboard

### Status Legend
- **TODO** – Not started
- **DOING** – In progress
- **DONE** – Completed & verified
- **BLOCKED** – Waiting on dependency or decision

### Workstream Status

| Workstream | Status | Owner | Last Updated | Notes |
|------------|--------|-------|--------------|-------|
| Math Engine Core | DONE | TBD | 2026-01-30 | 7/13 modules done (Phase 1); recast/refi/goal_seek deferred to Phase 2+ |
| Verification Tests | DONE | TBD | 2026-01-30 | Property-based invariants + golden cases complete; 196 tests passing |
| Statement Match | DONE | TBD | 2026-01-29 | Monthly & daily modes functional |
| Snap & Solve (UI) | TODO | TBD | - | Awaiting Phase 2 kickoff |
| Control Panel (UI) | TODO | TBD | - | Depends on goal_seek.ts completion |
| Recast/Refi (UI) | TODO | TBD | - | Depends on recast.ts + refi.ts completion |
| Export/Share | TODO | TBD | - | Awaiting Phase 4 |
| App Architecture | TODO | TBD | - | Expo setup pending |

### Current Focus (Phase 2 Priorities)
1. **A-01 to A-04** (TODO) – Photo capture + GPT-4o extraction + confirm screen
2. **ARCH-01** (TODO) – Expo + TypeScript setup with navigation
3. **P1-07** (TODO) – Implement [recast.ts](lib/engine/recast.ts) (lump sum + payment reduction)
4. **P1-08** (TODO) – Implement [refi.ts](lib/engine/refi.ts) (breakeven + cash flow analysis)
5. **P1-09** (TODO) – Implement [goal_seek.ts](lib/engine/goal_seek.ts) (binary search for extra payment)

---

## ✅ Completed (Already Done)

The following core modules and infrastructure are **DONE** and committed (initial commit: `744f5c9`):

- [x] **Money Module** (DONE) – [lib/engine/money.ts](lib/engine/money.ts)
  - Bigint cents representation (no floating-point money operations)
  - Integer-safe interest calculations with fixed-point arithmetic
  - Input validation for all interest helpers
  - Acceptance: All money operations use bigint; tests verify precision

- [x] **Dates Module** (DONE) – [lib/engine/dates.ts](lib/engine/dates.ts)
  - UTC-stable `addMonths` fix (handles month-end edge cases correctly)
  - Day count helpers for Actual/365 and 30/360 basis
  - Payment cadence utilities
  - Acceptance: Month addition never skips/duplicates; day count matches standards

- [x] **Assumptions Module** (DONE) – [lib/engine/assumptions.ts](lib/engine/assumptions.ts)
  - `AssumptionSet` schema defining amortization method, day count, payment order
  - `STANDARD_MONTHLY` preset for baseline monthly amortization
  - Acceptance: Schema validates all required fields; presets work out-of-box

- [x] **Payment Apply** (DONE) – [lib/engine/payment_apply.ts](lib/engine/payment_apply.ts)
  - Payment application order logic (interest → principal → escrow → fees)
  - Fees handled separately from P&I
  - Acceptance: Payment splits match lender standards; tests cover edge cases

- [x] **Amort Fixed** (DONE) – [lib/engine/amort_fixed.ts](lib/engine/amort_fixed.ts)
  - Fixed-rate monthly amortization schedule generation
  - Supports extra principal payments
  - Acceptance: Schedule matches online calculators within $0.01

- [x] **Statement Match Harness** (DONE) – [lib/engine/statement_match.ts](lib/engine/statement_match.ts)
  - Monthly model reconciliation against statement data
  - MATCH (≤$0.01), CLOSE (≤$1.00), NO_MATCH statuses
  - Match diagnostics for debugging
  - Strict missing field mode + `treatMissingMoneyAsZero` option
  - Acceptance: 10 synthetic test cases pass; harness functional

- [x] **Golden Cases Test Harness** (DONE) – [lib/engine/__tests__/golden_cases.test.ts](lib/engine/__tests__/golden_cases.test.ts)
  - Framework for validating against external calculators
  - Acceptance: Test file exists and runs (cases TBD)

- [x] **Vitest Suite** (DONE)
  - 171 tests passing (money, dates, assumptions, payment_apply, amort_fixed, statement_match, golden_cases)
  - Test coverage for all completed modules
  - Acceptance: `npm test` runs green

- [x] **Initial Git Commit** (DONE)
  - Commit `744f5c9`: "Initial commit (engine + tests + docs)"
  - Acceptance: Repo initialized; baseline captured

---

## North Star
Build Loanalize as the "premium mortgage utility" that users trust because it can MATCH their real statement.
Core loop remains: Snap & Solve -> Freedom Control Panel -> Scenarios -> Export.
New wedge: Statement Match Mode (Trust Mode).

Source: V5 concept and stack. (Expo + TS + Victory Native XL + GPT-4o Vision extraction) [Project Brief Jan 2026]

---

## MVP Feature Set (V6)

### A) Snap & Solve (Input)

- [ ] **A-01** (TODO) – Photo capture (statement) – [app/screens/CaptureScreen.tsx](app/screens/CaptureScreen.tsx)
  - **Acceptance:**
    - Camera access granted; user can snap statement photo
    - Image saved temporarily for extraction
    - Works on iOS & Android

- [ ] **A-02** (TODO) – PDF import (statement PDF) – [app/screens/CaptureScreen.tsx](app/screens/CaptureScreen.tsx)
  - **Acceptance:**
    - User can select PDF from device storage
    - PDF converted to image for GPT-4o Vision
    - Supports multi-page PDFs (first page extracted)

- [ ] **A-03** (TODO) – GPT-4o Vision extraction – [lib/extraction/gpt_vision.ts](lib/extraction/gpt_vision.ts)
  - **Acceptance:**
    - Extracts: principal balance, note rate, scheduled P&I, escrow (optional), next due date, maturity date (if present)
    - Extraction accuracy >90% on 5+ different statement formats
    - Returns structured JSON with confidence scores

- [ ] **A-04** (TODO) – Confirm screen (user edits fields) – [app/screens/ConfirmScreen.tsx](app/screens/ConfirmScreen.tsx)
  - **Acceptance:**
    - All extracted fields editable by user
    - Assumptions selector visible (monthly vs daily accrual)
    - Validation prevents invalid inputs (negative balance, rate >100%, etc.)
    - "Continue" button saves LoanProfile to AsyncStorage

**Notes/Risks:**
- GPT-4o API costs per extraction (~$0.01-0.05 per image)
- Privacy: raw statement image must be deleted immediately after extraction

---

### B) Trust Mode (New, MVP Differentiator)

**Goal:** Reconcile Loanalize schedule to the user's statement.

**Required Inputs:**
- [ ] **B-01** (TODO) – Principal balance extraction (covered by A-03)
- [ ] **B-02** (TODO) – Note rate extraction (covered by A-03)
- [ ] **B-03** (TODO) – Scheduled P&I payment extraction (covered by A-03)
- [ ] **B-04** (TODO) – Next due date extraction (covered by A-03)
- [ ] **B-05** (TODO) – Last payment date (manual entry if not on statement)
  - **Acceptance:** User can manually enter last payment date on confirm screen

**Optional Inputs:**
- [ ] **B-06** (TODO) – Escrow (tax/insurance) extraction (covered by A-03)
- [ ] **B-07** (TODO) – PMI extraction
  - **Acceptance:** PMI field available on confirm screen; defaults to $0
- [ ] **B-08** (TODO) – HOA extraction
  - **Acceptance:** HOA field available on confirm screen; defaults to $0

**Assumption Sets:**
- [x] **B-09** (DONE) – Standard Monthly Amortization – [lib/engine/assumptions.ts:STANDARD_MONTHLY](lib/engine/assumptions.ts)
  - **Acceptance:** `STANDARD_MONTHLY` preset defined; fixed-rate, monthly interest
- [ ] **B-10** (TODO) – Daily Accrual (simple-interest style) – [lib/engine/amort_daily.ts](lib/engine/amort_daily.ts)
  - **Acceptance:**
    - Daily accrual amortization schedule generated
    - Interest accrues daily; payment date affects interest
    - Matches lenders using daily simple interest method

**Advanced Assumptions (hidden behind "Assumptions"):**
- [x] **B-11** (DONE) – Day count basis: Actual/365 default, optional 30/360 – [lib/engine/dates.ts](lib/engine/dates.ts)
  - **Acceptance:** Day count helpers implemented for both bases
- [x] **B-12** (DONE) – Payment application order – [lib/engine/payment_apply.ts](lib/engine/payment_apply.ts)
  - **Acceptance:** Standard order (interest → principal → escrow → fees) implemented

**Statement Match Output:**
- [x] **B-13** (DONE) – MATCH: delta ≤ $0.01 – [lib/engine/statement_match.ts](lib/engine/statement_match.ts)
- [x] **B-14** (DONE) – CLOSE: delta ≤ $1.00 – [lib/engine/statement_match.ts](lib/engine/statement_match.ts)
- [x] **B-15** (DONE) – NO MATCH: show diagnostics – [lib/engine/statement_match.ts](lib/engine/statement_match.ts)

**Trust UI:**
- [ ] **B-16** (TODO) – "Assumptions" drawer always visible – [app/components/AssumptionsDrawer.tsx](app/components/AssumptionsDrawer.tsx)
  - **Acceptance:**
    - Drawer shows active assumption set (monthly vs daily, day count, payment order)
    - User can toggle assumptions and re-run match
    - Match status updates in real-time
- [ ] **B-17** (TODO) – Export includes assumption set + match status
  - **Acceptance:** PDF/CSV exports show assumption set and MATCH/CLOSE/NO_MATCH status

**Notes/Risks:**
- Lender variations in interest calculation methods may prevent 100% match rate
- User confusion if NO_MATCH without clear explanation → need helpful diagnostics UI

---

### C) Freedom Control Panel (Core)

**Interactive Controls (60fps):**
- [ ] **C-01** (TODO) – Extra monthly principal slider – [app/components/ExtraPrincipalSlider.tsx](app/components/ExtraPrincipalSlider.tsx)
  - **Acceptance:**
    - Slider updates extra payment amount ($0 - $5000 range)
    - Schedule recalculates at 60fps on mid-tier device
    - Shows updated payoff date and total interest in real-time

- [ ] **C-02** (TODO) – Lump sum principal injection – [app/components/ControlPanel.tsx](app/components/ControlPanel.tsx)
  - **Acceptance:**
    - User can add one-time lump sum payment with target date
    - Schedule recalculates showing impact
    - Supports multiple lump sums

- [ ] **C-03** (TODO) – Bi-weekly toggle – [app/components/ControlPanel.tsx](app/components/ControlPanel.tsx)
  - **Acceptance:**
    - Toggle switches payment cadence to bi-weekly (half payment every 2 weeks)
    - Disclosure shown: "Some servicers hold partial payments; this model assumes applied as scheduled"
    - Schedule recalculates correctly (26 payments/year vs 12)

- [ ] **C-04** (TODO) – Payoff-by-date goal seek – [lib/engine/goal_seek.ts](lib/engine/goal_seek.ts) + UI
  - **Acceptance:**
    - User picks target payoff date → app computes required extra/month
    - User picks extra/month → app shows resulting payoff date
    - Binary search converges within 3 iterations
    - Verified against manual calculations

**Tests/Verification:**
- Performance profiling on mid-tier device (60fps target)
- Goal seek accuracy tested against spreadsheet models

---

### D) Scenario Compare (MVP)

- [ ] **D-01** (TODO) – 3 saved scenarios – [lib/engine/scenario.ts](lib/engine/scenario.ts)
  - **Acceptance:**
    - User can save/name 3 scenarios: Baseline, Plan A, Plan B
    - Scenarios persist in AsyncStorage
    - User can edit/delete scenarios

- [ ] **D-02** (TODO) – Compare payoff date – [app/components/ScenarioCompare.tsx](app/components/ScenarioCompare.tsx)
  - **Acceptance:** Comparison table shows payoff date for each scenario

- [ ] **D-03** (TODO) – Compare total interest
  - **Acceptance:** Comparison table shows total interest paid for each scenario

- [ ] **D-04** (TODO) – Compare total paid
  - **Acceptance:** Comparison table shows total paid (principal + interest + fees) for each scenario

- [ ] **D-05** (TODO) – Compare cash required upfront
  - **Acceptance:** Comparison table shows upfront cash needed (lump sum, recast fee, or refi closing costs)

**Tests/Verification:**
- Save/load scenarios from AsyncStorage (test app restart persistence)
- Comparison calculations verified against manual math

---

### E) Recast Simulator (MVP)

**Inputs:**
- [ ] **E-01** (TODO) – Lump sum amount – [app/screens/RecastScreen.tsx](app/screens/RecastScreen.tsx)
  - **Acceptance:** User can enter lump sum amount to apply toward principal

- [ ] **E-02** (TODO) – Recast fee – [app/screens/RecastScreen.tsx](app/screens/RecastScreen.tsx)
  - **Acceptance:**
    - Default fee range shown ($150-$500 typical)
    - User can override fee
    - Disclosure: "Recast fee varies by lender; confirm with your servicer"

- [ ] **E-03** (TODO) – Remaining term unchanged; rate unchanged – [lib/engine/recast.ts](lib/engine/recast.ts)
  - **Acceptance:** Recast preserves remaining term and interest rate; only reduces payment

**Outputs:**
- [ ] **E-04** (TODO) – New payment (P&I) – [lib/engine/recast.ts](lib/engine/recast.ts)
  - **Acceptance:** New monthly P&I payment calculated correctly after lump sum + fee

- [ ] **E-05** (TODO) – Savings over remaining life
  - **Acceptance:** Total interest savings shown (baseline vs recast scenario)

- [ ] **E-06** (TODO) – Break-even vs just paying extra principal monthly
  - **Acceptance:**
    - Shows months to break even on recast fee
    - Compares recast to alternative: applying lump sum + paying fee amount as extra principal monthly

**Tests/Verification:**
- Verify against 2+ lender recast calculators
- Test break-even edge cases (high fees, small lump sums)

---

### F) Refi Breakeven (MVP)

**Inputs:**
- [ ] **F-01** (TODO) – New rate – [app/screens/RefiScreen.tsx](app/screens/RefiScreen.tsx)
  - **Acceptance:** User enters new interest rate (APR or note rate)

- [ ] **F-02** (TODO) – Term option – [lib/engine/refi.ts](lib/engine/refi.ts)
  - **Acceptance:**
    - User chooses: keep remaining term OR reset to 30 years
    - Both options calculated and compared

- [ ] **F-03** (TODO) – Closing costs – [app/screens/RefiScreen.tsx](app/screens/RefiScreen.tsx)
  - **Acceptance:**
    - User enters total closing costs
    - Typical range shown ($2000-$5000 for reference)

- [ ] **F-04** (TODO) – Pay costs cash vs roll into loan – [lib/engine/refi.ts](lib/engine/refi.ts)
  - **Acceptance:**
    - User selects: pay cash OR roll into new loan balance
    - Both scenarios calculated and compared

- [ ] **F-05** (TODO) – Expected time in home (months) – [app/screens/RefiScreen.tsx](app/screens/RefiScreen.tsx)
  - **Acceptance:** User enters expected stay duration for breakeven calculation

**Outputs:**
- [ ] **F-06** (TODO) – True breakeven timeline (cash flow) – [lib/engine/refi.ts](lib/engine/refi.ts)
  - **Acceptance:**
    - Calculates months until cumulative savings offset closing costs
    - Accounts for cost roll-in if applicable

- [ ] **F-07** (TODO) – Total savings if stay X months
  - **Acceptance:** Shows total savings (or loss) if user stays X months

- [ ] **F-08** (TODO) – Warning if breakeven beyond stay horizon
  - **Acceptance:**
    - Displays warning: "Breakeven is [X] months, but you plan to stay [Y] months"
    - Clear indication if refi is not financially favorable

**Tests/Verification:**
- Compare against 3+ online refi calculators (Bankrate, NerdWallet, Zillow)
- Test edge cases: high closing costs, short stay, minimal rate difference

---

### G) Export/Share (MVP)

- [ ] **G-01** (TODO) – Export PDF (one-page summary) – [lib/pdf/generator.ts](lib/pdf/generator.ts)
  - **Acceptance:**
    - PDF generates successfully on iOS and Android
    - One-page summary includes: loan details, payoff date, total interest, statement match status

- [ ] **G-02** (TODO) – Export CSV amortization schedule – [lib/engine/export.ts](lib/engine/export.ts)
  - **Acceptance:**
    - CSV includes full schedule: payment #, date, principal, interest, balance
    - Compatible with Excel/Google Sheets
    - Works on both platforms

- [ ] **G-03** (TODO) – PDF includes scenario comparison table
  - **Acceptance:** Comparison table shows all saved scenarios with metrics (payoff date, total interest, total paid, upfront cash)

- [ ] **G-04** (TODO) – PDF includes assumption set
  - **Acceptance:** Assumption set shown: amortization method, day count, payment order

- [ ] **G-05** (TODO) – PDF includes statement match status
  - **Acceptance:** MATCH/CLOSE/NO_MATCH badge visible on PDF with delta amount

- [ ] **G-06** (TODO) – PDF includes charts snapshot
  - **Acceptance:** Balance over time chart rendered in PDF

**Tests/Verification:**
- Test PDF render on both iOS and Android devices
- Verify CSV opens correctly in Excel and Google Sheets
- Test share functionality (email, message, save to files)

---

## Math Engine: Non-Negotiables (Trust)

**Core Principles:**
- [x] **P0-01** (DONE) – Money type: cents as bigint – [lib/engine/money.ts](lib/engine/money.ts)
- [x] **P0-02** (DONE) – Integer-safe interest calculations – [lib/engine/money.ts](lib/engine/money.ts)
- [x] **P0-03** (DONE) – Input validation for interest helpers – [lib/engine/money.ts](lib/engine/money.ts)
- [ ] **P0-04** (TODO) – Rate type: basis points or micro-rate (if needed for precision)
  - **Acceptance:** If float rate causes precision issues, migrate to integer basis points
- [x] **P0-05** (DONE) – Rounding policy defined and tested (half-up rounding)

**Engine Modules:**
- [x] **P1-01** (DONE) – [lib/engine/money.ts](lib/engine/money.ts) – Cents bigint helpers
- [x] **P1-02** (DONE) – [lib/engine/dates.ts](lib/engine/dates.ts) – Day count helpers, payment cadence
- [x] **P1-03** (DONE) – [lib/engine/assumptions.ts](lib/engine/assumptions.ts) – AssumptionSet schema
- [x] **P1-04** (DONE) – [lib/engine/payment_apply.ts](lib/engine/payment_apply.ts) – Application order
- [x] **P1-05** (DONE) – [lib/engine/amort_fixed.ts](lib/engine/amort_fixed.ts) – Monthly amortization
- [x] **P1-06** (DONE) – [lib/engine/amort_daily.ts](lib/engine/amort_daily.ts) – Daily accrual amortization
  - **Acceptance:**
    - Interest accrues daily using simple interest ✅
    - Payment date affects interest calculation ✅
    - Supports both Actual/365 and Actual/360 day count bases ✅
    - Verified via property-based invariant tests ✅
- [ ] **P1-07** (TODO) – [lib/engine/recast.ts](lib/engine/recast.ts) – Recast simulator
  - **Acceptance:**
    - Calculates new payment after lump sum + fee
    - Preserves term and rate
    - Break-even calculation vs extra principal alternative
- [ ] **P1-08** (TODO) – [lib/engine/refi.ts](lib/engine/refi.ts) – Refi breakeven calculator
  - **Acceptance:**
    - Cash flow breakeven timeline calculated
    - Supports cost roll-in vs pay cash
    - Warning if breakeven > expected stay
- [ ] **P1-09** (TODO) – [lib/engine/goal_seek.ts](lib/engine/goal_seek.ts) – Binary search on extra payment
  - **Acceptance:**
    - Given target payoff date → computes required extra/month
    - Given extra/month → computes payoff date
    - Converges within 3 iterations
- [ ] **P1-10** (TODO) – [lib/engine/scenario.ts](lib/engine/scenario.ts) – Scenario runner + compare
  - **Acceptance:**
    - Runs multiple scenarios (baseline, plan A, plan B)
    - Compares: payoff date, total interest, total paid, upfront cash
    - Scenarios persist to AsyncStorage
- [ ] **P1-11** (TODO) – [lib/engine/export.ts](lib/engine/export.ts) – CSV + PDF data assembly
  - **Acceptance:**
    - Generates CSV with full amortization schedule
    - Assembles PDF data (summary, scenarios, assumptions, match status)
- [ ] **P1-12** (TODO) – [lib/engine/principal_curtailment.ts](lib/engine/principal_curtailment.ts) – Extra payments (may be covered in amort_fixed)
  - **Acceptance:** Extra principal payments applied correctly; may merge into amort_fixed
- [x] **P1-13** (DONE) – [lib/engine/statement_match.ts](lib/engine/statement_match.ts) – Statement match harness

**Assumption Set Defaults:**
- [x] **P1-14** (DONE) – Monthly amortization for baseline (`STANDARD_MONTHLY` implemented)
- [ ] **P1-15** (TODO) – Daily accrual enabled only when it improves statement match OR user selects it
  - **Acceptance:** UI shows daily accrual option; auto-suggested if monthly doesn't match

**Tests/Verification:**
- [x] 196 tests passing (money, dates, assumptions, payment_apply, amort_fixed, amort_daily, statement_match, golden_cases, schedule_invariants)
- [x] Golden test cases pass (see Verification Plan)
- [x] Property-based invariant tests pass (see Verification Plan)

**Notes/Risks:**
- Daily accrual implementation complexity (some lenders use proprietary methods)
- Matching all lender variations may be impossible → aim for 18/20 match rate

---

## Verification Plan (Math Trust)

### 1) Golden Test Cases (Must)

- [ ] **V-01** (TODO) – Create [lib/engine/__golden__/cases.json](lib/engine/__golden__/cases.json)
  - **Acceptance:**
    - JSON file with at least 5 test cases
    - Each case includes: inputs, expected first 3 periods (interest, principal, balance), expected payoff totals

- [ ] **V-02** (TODO) – Include baseline and extra-payment scenarios
  - **Acceptance:**
    - Each test case has baseline (no extra payments)
    - Each test case has one extra-payment scenario
    - Totals verified manually

- [ ] **V-03** (TODO) – Validate against 3+ independent online calculators
  - **Acceptance:**
    - Sources: Bankrate.com, Calculator.net, MortgageCalculator.org
    - Loanalize output matches within $0.01 for standard monthly amortization
    - Sources documented in test file

- [ ] **V-04** (TODO) – Include internal statement match cases from real statements (redacted)
  - **Acceptance:**
    - At least 5 real statement samples (PII redacted)
    - Cases stored in [lib/engine/__golden__/statements/](lib/engine/__golden__/statements/)
    - Cover different lenders and loan types

**Artifacts:**
- [lib/engine/__golden__/cases.json](lib/engine/__golden__/cases.json)
- [lib/engine/__tests__/golden.test.ts](lib/engine/__tests__/golden.test.ts)

---

### 2) Property Tests (Should)

**Invariants:**
- [x] **V-05** (DONE) – Balance never increases (except refi roll-in)
  - **Acceptance:** Property test verifies balance decreases or stays same for 100+ random inputs ✅

- [x] **V-06** (DONE) – sum(principal paid) + ending balance == starting balance
  - **Acceptance:** Conservation of principal verified for 100+ random inputs ✅

- [x] **V-07** (DONE) – total payment == principal + interest + escrow + fees (modeled)
  - **Acceptance:** Payment decomposition verified for 100+ random inputs ✅

**Additional Invariants Verified:**
- [x] Period numbers sequential; payment dates strictly increasing
- [x] All money fields non-negative
- [x] Per-period balance equation: endingBalance = beginningBalance - totalPrincipal
- [x] Per-period payment decomposition: scheduledPayment = interestPortion + principalPortion
- [x] Cumulative values consistent and monotonic
- [x] Final ending balance exactly zero
- [x] Conservation law: totalPayments = totalInterest + totalPrincipal

**Artifacts:**
- [x] [lib/engine/__tests__/schedule_invariants.test.ts](lib/engine/__tests__/schedule_invariants.test.ts) – 300+ property-based test cases with seeded PRNG

---

### 3) Statement Match Harness (Must)

- [x] **V-08** (DONE) – Statement match harness implemented – [lib/engine/statement_match.ts](lib/engine/statement_match.ts)
  - [x] Run monthly model
  - [ ] Run daily model (pending amort_daily.ts)
  - [x] Compute delta vs scheduled statement expectations
  - [ ] Choose best match OR require user selection (pending UI)

- [x] **V-09** (DONE) – Expose match diagnostics for debugging
  - **Acceptance:** Diagnostics show: delta, expected vs actual, assumption set used

- [ ] **V-10** (TODO) – 20 statement samples: 18/20 show MATCH within $0.01
  - **Acceptance:**
    - Collect 20 real statement samples (redacted)
    - 18/20 achieve MATCH status (≤$0.01 delta) under one assumption set
    - 2/20 allowed to show CLOSE or NO_MATCH (document reasons)

**Artifacts:**
- [x] [lib/engine/statement_match.ts](lib/engine/statement_match.ts)
- [x] [lib/engine/__tests__/statement_match.test.ts](lib/engine/__tests__/statement_match.test.ts)
- [ ] [lib/engine/__golden__/statements/](lib/engine/__golden__/statements/) (real redacted samples)

**Tests/Verification:**
- [x] 10 synthetic tests pass
- [ ] 18/20 real statement tests pass

---

## App Architecture (MVP)

- [ ] **ARCH-01** (TODO) – Expo + TS setup – [app.json](app.json)
  - **Acceptance:**
    - Expo SDK installed and configured
    - TypeScript strict mode enabled
    - App runs on iOS and Android simulators/devices
    - Navigation structure in place

- [ ] **ARCH-02** (TODO) – Local-first storage: AsyncStorage for loan + scenarios – [lib/storage/](lib/storage/)
  - **Acceptance:**
    - LoanProfile persists to AsyncStorage
    - Scenarios persist to AsyncStorage
    - Data survives app restarts
    - CRUD operations for profiles and scenarios

- [ ] **ARCH-03** (TODO) – Optional Supabase sync (NOT in MVP unless required)
  - **Acceptance:** Supabase integration deferred; local-first only for MVP

- [ ] **ARCH-04** (TODO) – AI extraction endpoint – [lib/extraction/gpt_vision.ts](lib/extraction/gpt_vision.ts)
  - **Acceptance:**
    - GPT-4o Vision API integration functional
    - Endpoint receives image → returns structured JSON
    - Error handling for failed extractions
    - API key stored securely (env vars)

- [ ] **ARCH-05** (TODO) – Delete raw statement immediately after parsing
  - **Acceptance:**
    - Raw statement image/PDF deleted after extraction completes
    - No statement images persist in app storage
    - Privacy audit confirms no PII retention

- [ ] **ARCH-06** (TODO) – User must confirm extracted values before running math
  - **Acceptance:**
    - Confirm screen shown after extraction
    - User cannot proceed to results without confirming/editing
    - No automatic calculations on raw extracted data

**Artifacts:**
- [app.json](app.json)
- [app/_layout.tsx](app/_layout.tsx)
- [lib/storage/](lib/storage/)

**Tests/Verification:**
- Test data persistence across app restarts
- Verify statement deletion (filesystem audit after extraction)

---

## UI Implementation Phases (Do in Order)

### Phase 1: Math Engine + Tests (DONE ✅)

- [x] **PH1-01** (DONE) – Implement engine modules (7/13 complete for Phase 1: money, dates, assumptions, payment_apply, amort_fixed, amort_daily, statement_match)
- [x] **PH1-02** (DONE) – Build golden tests – [lib/engine/__tests__/golden_cases.test.ts](lib/engine/__tests__/golden_cases.test.ts)
  - **Acceptance:**
    - Golden test cases framework complete ✅
    - Per-case verification captures documented ✅
    - All golden cases pass within $0.01 ✅
    - Sources documented per-case ✅
- [x] **PH1-03** (DONE) – Build property tests – [lib/engine/__tests__/schedule_invariants.test.ts](lib/engine/__tests__/schedule_invariants.test.ts)
  - **Acceptance:**
    - 15 invariants tested across 300+ random cases ✅
    - Seeded PRNG for reproducibility ✅
    - Tests amort_fixed (monthly), amort_daily (365), amort_daily (360) ✅
    - Edge cases tested (small/large principals, low/high rates, short/long terms) ✅
- [x] **PH1-04** (DONE) – Build statement match harness – [lib/engine/statement_match.ts](lib/engine/statement_match.ts)
- [x] **PH1-05** (DONE) – CLI runner script to print amort schedule – [scripts/engine_cli.ts](scripts/engine_cli.ts)
  - **Acceptance:**
    - CLI script loads golden test cases ✅
    - Prints formatted amortization schedule to console ✅
    - Honest about verification sources (per-case notes) ✅
    - Useful for debugging/manual verification ✅

**Tests/Verification:**
- [x] Run `npm test` – 196 tests passing ✅
- [x] Run `npm run typecheck` – passes with no errors ✅
- [x] CLI runner outputs correct schedules ✅

**Phase 1 Complete:** Core math engine + comprehensive testing infrastructure ready for UI integration.

**Deferred to Later Phases:**
- Recast/refi/goal_seek (P1-07, P1-08, P1-09) – moved to Phase 2/3 (not blockers for initial UI work)

---

### Phase 2: Intake + Confirm (TODO)

- [ ] **PH2-01** (TODO) – Camera capture – [app/screens/CaptureScreen.tsx](app/screens/CaptureScreen.tsx)
  - **Acceptance:** Camera access functional; user can snap statement photo
- [ ] **PH2-02** (TODO) – PDF import – [app/screens/CaptureScreen.tsx](app/screens/CaptureScreen.tsx)
  - **Acceptance:** User can select PDF from device storage
- [ ] **PH2-03** (TODO) – GPT extraction endpoint integration – [lib/extraction/gpt_vision.ts](lib/extraction/gpt_vision.ts)
  - **Acceptance:** GPT-4o Vision extracts fields >90% accuracy
- [ ] **PH2-04** (TODO) – Confirm screen w/ assumptions selector – [app/screens/ConfirmScreen.tsx](app/screens/ConfirmScreen.tsx)
  - **Acceptance:** User can edit fields and select assumptions before proceeding
- [ ] **PH2-05** (TODO) – Save LoanProfile locally – [lib/storage/](lib/storage/)
  - **Acceptance:** LoanProfile persists to AsyncStorage

**Tests/Verification:**
- Test with 10+ different statement formats
- Verify data persistence across app restarts

---

### Phase 3: Control Panel + Chart (TODO)

**Dependencies:** P1-09 (goal_seek.ts) must be complete

- [ ] **PH3-01** (TODO) – Sliders/toggles implementation – [app/components/ControlPanel.tsx](app/components/ControlPanel.tsx)
  - **Acceptance:** Extra principal slider, lump sum, bi-weekly toggle all functional at 60fps
- [ ] **PH3-02** (TODO) – Scenario compare panel – [app/components/ScenarioCompare.tsx](app/components/ScenarioCompare.tsx)
  - **Acceptance:** 3 scenarios compared (payoff date, total interest, total paid, upfront cash)
- [ ] **PH3-03** (TODO) – Victory Native XL chart w/ scrub – [app/components/Chart.tsx](app/components/Chart.tsx)
  - **Acceptance:** Balance over time chart renders; scrubbing shows period details at 60fps

**Tests/Verification:**
- Profile with Xcode/Android Studio (60fps target on mid-tier device)

---

### Phase 4: Recast/Refi + Export (TODO)

**Dependencies:** P1-07 (recast.ts), P1-08 (refi.ts), P1-11 (export.ts) must be complete

- [ ] **PH4-01** (TODO) – Recast screen – [app/screens/RecastScreen.tsx](app/screens/RecastScreen.tsx)
  - **Acceptance:** Recast calculator functional; break-even shown
- [ ] **PH4-02** (TODO) – Refi screen – [app/screens/RefiScreen.tsx](app/screens/RefiScreen.tsx)
  - **Acceptance:** Refi breakeven calculator functional; warning shown if needed
- [ ] **PH4-03** (TODO) – PDF export implementation – [lib/pdf/generator.ts](lib/pdf/generator.ts)
  - **Acceptance:** PDF exports on iOS and Android with all required elements
- [ ] **PH4-04** (TODO) – CSV export implementation – [lib/engine/export.ts](lib/engine/export.ts)
  - **Acceptance:** CSV exports full schedule; compatible with Excel/Sheets

**Tests/Verification:**
- Verify exports on both iOS and Android
- Test recast/refi against 2+ online calculators

---

## Release Criteria (MVP Launch Checklist)

- [ ] **REL-01** (TODO) – Math trust suite green (all tests pass)
  - **Acceptance:**
    - All unit tests pass (target: 200+ tests)
    - Golden test cases pass (3+ calculators verified)
    - Property tests pass (100+ random inputs)
    - No float money operations detected (audit)

- [ ] **REL-02** (TODO) – Statement match badge works and never lies
  - **Acceptance:**
    - MATCH/CLOSE/NO_MATCH status always accurate
    - 18/20 real statements show MATCH (≤$0.01 delta)
    - Diagnostics explain any NO_MATCH cases clearly
    - Badge visible in UI and exports

- [ ] **REL-03** (TODO) – 60fps slider and chart scrub on mid-tier devices
  - **Acceptance:**
    - Performance profiled on iPhone 12 / Galaxy S21 equivalent
    - Extra principal slider updates at 60fps
    - Chart scrubbing at 60fps
    - No frame drops during interaction

- [ ] **REL-04** (TODO) – 18/20 real statements show MATCH
  - **Acceptance:**
    - Collect 20 diverse real statements (different lenders, loan types)
    - 18/20 achieve MATCH status under one assumption set
    - 2/20 allowed failures documented with reasons

- [ ] **REL-05** (TODO) – Export PDF/CSV tested on both platforms
  - **Acceptance:**
    - PDF exports successfully on iOS and Android
    - CSV exports successfully on both platforms
    - All required elements present (summary, scenarios, assumptions, match status, chart)
    - Share functionality works (email, message, save to files)

---

## What makes Loanalize "unique" at MVP
- Statement Match Mode (Trust Mode)
- Assumption transparency (users can see why numbers differ)
- Goal seek + scenario compare + export in a premium UI

---

---

## 📝 Changelog

### 2026-01-30 (Phase 1 Complete - Property-Based Testing + Type Fixes)
**What Changed:**
- ✅ Implemented comprehensive property-based invariant testing with seeded PRNG
- ✅ Fixed TypeScript Money type imports across all engine modules
- ✅ Added missing `roundingMethod` fields to test assumption sets
- ✅ All 196 tests passing; typecheck passing
- ✅ Marked Phase 1 as DONE (core math engine + testing complete)

**Completed Tasks:**
- [x] **V-05, V-06, V-07** – Property-based invariant tests (schedule_invariants.test.ts)
  - 300+ test cases with 15 invariants verified
  - Seeded PRNG (seed=42) for reproducibility
  - Tests amort_fixed (monthly), amort_daily (365), amort_daily (360)
  - Edge cases: small/large principals, low/high rates, short/long terms
- [x] TypeScript fixes: Money import collisions resolved
  - Changed from `import type { Money }` + `import * as Money` to only `import * as Money`
  - Updated all Money type annotations to `Money.Money`
  - Fixed in: amort_fixed.ts, amort_daily.ts, payment_apply.ts, statement_match.ts, __golden__/cases.ts
- [x] Test fixes: Added `roundingMethod: 'nearest'` to test assumptions
  - Fixed in: amort_daily.test.ts, statement_match.test.ts

**Test Count:**
- Previous: 171 tests passing
- Current: 196 tests passing (+25 from property-based tests)

**Phase 1 Status:** ✅ COMPLETE
- Core math engine: 7/13 modules complete (Phase 1 scope)
- Comprehensive testing: unit tests + golden tests + property-based invariants
- TypeScript: strict mode, all types correct
- CLI: honest about verification sources

**Next Phase:** Phase 2 - Expo setup + Snap & Solve UI + GPT-4o extraction

**Commits/PRs:**
- c9bd323: Golden: record calculator captures for 300k case
- 528f496: Golden: clarify verification scope for 300k case
- 34f6151: Engine: amort_fixed final payoff adjustment (no extra month)
- f6db066: Engine: statement_match supports daily engine (opt-in)
- 7f70fb7: Engine: add daily simple interest amortization

---

### 2026-01-29 (Plan Restructure + Baseline Capture)
**What Changed:**
- Restructured Implementation Plan V6 for team tracking
- Added Progress Dashboard with status legend, workstream table, and current focus
- Converted all deliverables to checkboxes with status tags (TODO/DOING/DONE/BLOCKED)
- Added acceptance criteria for every major task
- Added "Completed (Already Done)" section documenting initial engine baseline
- Added file path references for all modules and UI components
- Documented current baseline: 171 tests passing, 6/13 engine modules complete

**Baseline Status (Initial Commit `744f5c9`):**
- ✅ Money module (bigint cents, integer-safe interest, input validation)
- ✅ Dates module (UTC-stable addMonths, day count helpers)
- ✅ Assumptions module (AssumptionSet schema, STANDARD_MONTHLY preset)
- ✅ Payment apply (interest → principal → escrow → fees order)
- ✅ Amort fixed (monthly amortization schedule generation)
- ✅ Statement match harness (MATCH/CLOSE/NO_MATCH statuses, diagnostics)
- ✅ Golden cases test framework (harness built, cases TBD)
- ✅ 171 tests passing (money, dates, assumptions, payment_apply, amort_fixed, statement_match, golden_cases)

**Commits/PRs:**
- Initial commit: `744f5c9` (Initial commit: engine + tests + docs)

---

### [Future Entry Template]
**Date:** YYYY-MM-DD

**What Changed:**
- [Bullet list of changes]

**Completed Tasks:**
- [Task IDs]

**Commits/PRs:**
- [Links]

**Blockers/Notes:**
- [Any blockers or important notes]
