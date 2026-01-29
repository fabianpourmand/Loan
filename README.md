# Loanalize - Math Engine (Phase 1)

Premium mortgage utility with statement match capability.

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
2. **Golden Tests**: Known-good cases validated against external calculators
3. **Property Tests**: Invariants (balance monotonic, sum checks)
4. **Statement Match Harness**: Selects best model to match real statements

### Definition of Done (Phase 1)

- ✅ `npm test` passes all tests
- ✅ Golden test cases match expected values within $0.01
- ✅ Invariant tests pass (balance monotonic, sums correct)
- ✅ Statement match harness works and reports deltas
