# Loanalize - Math Engine (Phase 1)

Premium mortgage utility with statement match capability.

## Current Status (2026-01-30)

**Tests:** 196 passing (`npm test`)

**Typecheck:** passing (`npm run typecheck`)

**Phase 1 Status:** Complete.
- Daily accrual model exists and is tested (`lib/engine/amort_daily.ts`).
- Invariant suite exists and is deterministic (`lib/engine/__tests__/schedule_invariants.test.ts`).
- CLI prints schedules and is honest about verification sources (`scripts/engine_cli.ts`).
- Golden case verification is per-case (see notes in `lib/engine/__golden__/cases.ts`).

See [Implementation_Plan_V6.md](Implementation_Plan_V6.md) for full tracking.

---

## Phase 1: Math Engine + Tests

This phase implements the core calculation engine with rigorous testing.

### Key Principles
- **Money as BigInt**: All monetary values use integer cents (bigint) - NO FLOATS
- **Test Coverage**: Every module has unit tests + golden tests + invariants
- **Statement Match**: Two amortization models (monthly & daily) to match real statements

### Setup

```bash
npm install
```

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run test UI
npm run test:ui

# Run engine CLI (prints amortization schedule)
npm run engine:cli

# Type check
npm run typecheck
```

### Engine Modules

- `money.ts` - BigInt cents operations
- `dates.ts` - Day count conventions (Actual/365, 30/360)
- `assumptions.ts` - Assumption set schema
- `payment_apply.ts` - Payment application order
- `amort_fixed.ts` - Standard monthly amortization
- `amort_daily.ts` - Daily simple interest accrual
- `principal_curtailment.ts` - Extra payment handling
- `goal_seek.ts` - Binary search for target payoff dates
- `scenario.ts` - Scenario comparison engine
- `recast.ts` - Mortgage recast calculator
- `refi.ts` - Refinance breakeven analysis

### Testing Strategy

1. **Unit Tests**: Each module has comprehensive unit tests
2. **Golden Tests**: Behavior-locked cases (external verification captures are per-case)
3. **Property Tests**: Deterministic invariants across randomized inputs
4. **Statement Match Harness**: Selects best model to match real statements

### Definition of Done (Phase 1)

- ✅ `npm test` passes all tests
- ✅ `npm run typecheck` passes
- ✅ Golden verification claims are per-case and include captures where claimed
- ✅ Invariant tests pass (balance monotonic, sums correct)
- ✅ Statement match harness works and reports deltas
- ✅ CLI is honest about verification sources
