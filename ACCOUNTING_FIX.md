# Payment Application Accounting Fix

## Problem Identified

The original `applyPayment()` function had an accounting inconsistency:

1. **`remaining`** was tracked from `scheduledPayment` (P&I only)
2. **`totalPayment`** included all components (scheduled + extra + escrow + PMI + HOA + fees)
3. **`breakdown.remaining`** was set from P&I remaining, not total remaining
4. This caused `breakdown.remaining` to misrepresent "unapplied money"

### Example of the Bug

```typescript
// Input:
scheduledPayment: $2,000 (P&I)
extraPrincipal: $500
escrow: $400
// totalPayment = $2,900

// Old logic:
remaining = $2,000 (only tracked P&I)
// After P&I waterfall: remaining = $0
breakdown.remaining = $0 ✗ WRONG!

// But we never actually applied the $500 extra or $400 escrow to remaining
// So remaining should be: $2,900 - $2,000 - $500 - $400 = $0 ✓ CORRECT
```

## Solution Implemented

### 1. Track P&I Separately

- Renamed `remaining` → `piRemaining` to clarify it's P&I only
- `piRemaining` tracks waterfall through: fees → interest → principal
- Only uses `scheduledPayment` (P&I only)

### 2. Calculate True Remaining

```typescript
// After applying all portions:
const appliedTotal = feesPortion + interestPortion + principalPortion
                   + extraPrincipalPortion + escrowPortion
                   + pmiPortion + hoaPortion;

breakdown.remaining = totalPayment - appliedTotal;
```

This ensures: **`totalPayment = appliedTotal + remaining`** (always true)

### 3. Partial Payment Handling

In partial payments (scheduledPayment < accruedInterest):

- **Extra principal is NOT applied** (since P&I wasn't satisfied)
- **Escrow/PMI/HOA are NOT applied** (portions = 0)
- **Balance remains unchanged**
- **Remaining calculated correctly**: `totalPayment - interestPortion`

Example:
```typescript
scheduledPayment: $1,000
accruedInterest: $1,625
extraPrincipal: $500

// Applied:
interestPortion: $1,000
principalPortion: $0
extraPrincipalPortion: $0  // NOT applied!

// Result:
totalPayment: $1,500
remaining: $500  // Unapplied money
isPartialPayment: true
```

### 4. Optional Components (Escrow/PMI/HOA)

Components are only applied if BOTH conditions are met:
1. Assumption enables it (e.g., `assumptions.includeEscrow === true`)
2. Amount is provided and > 0

If either condition fails, portion = 0 and that money contributes to `remaining`.

## Tests Added

Added 6 new accounting consistency tests:

1. ✅ **Full payment, no optionals** → `remaining == 0`
2. ✅ **Full payment with extra principal** → `remaining == 0`, balance reduced correctly
3. ✅ **Full payment with escrow/PMI/HOA** → `remaining == 0`, all portions applied
4. ✅ **Partial payment with extra principal** → `extraPrincipalPortion == 0`, correct remaining
5. ✅ **Optional components not applied** → portions = 0, remaining accounts for unused money
6. ✅ **Invariant test** → `totalPayment = appliedTotal + remaining` (always holds)

## Test Results

```bash
npm test
```

**Result:** ✅ 140/140 tests passing (6 new tests added)

```bash
npm run engine:cli
```

**Result:** ✅ 4/4 golden tests passing (100%)

## Semantic Meaning of `remaining`

### After Fix:
**`breakdown.remaining`** represents "unapplied money across the entire payment"

- **`remaining == 0`**: Payment fully applied (normal case)
- **`remaining > 0`**: Unapplied money exists because:
  - Partial payment (interest not fully covered)
  - Optional components provided but not enabled in assumptions
  - Payment exceeds what's needed (rare, but mathematically possible)

### Why This Matters (Trust-Critical)

1. **Reconciliation**: Users can verify `totalPayment = appliedTotal + remaining`
2. **Transparency**: Shows exactly what happened to every cent
3. **Partial Payments**: Correctly handles servicer behavior (no extra principal applied)
4. **Statement Matching**: Essential for the core "Trust Mode" feature

## Files Changed

1. **[lib/engine/payment_apply.ts](lib/engine/payment_apply.ts)**
   - Renamed `remaining` → `piRemaining` for P&I waterfall
   - Calculate `breakdown.remaining` from `totalPayment - appliedTotal`
   - Don't apply extra principal in partial payments
   - Don't apply escrow/PMI/HOA in partial payments

2. **[lib/engine/__tests__/payment_apply.test.ts](lib/engine/__tests__/payment_apply.test.ts)**
   - Added 6 new accounting consistency tests
   - All existing tests still pass (backward compatible)

## Commands Run

```bash
# Run payment_apply tests
npm test -- payment_apply.test.ts
# Result: ✅ 27/27 tests passing

# Run full test suite
npm test
# Result: ✅ 140/140 tests passing

# Run golden test CLI
npm run engine:cli
# Result: ✅ 4/4 golden tests passing

# Type check
npm run typecheck
# Result: ✅ No type errors
```

## Backward Compatibility

✅ **No breaking changes to interfaces**
- `PaymentComponents` unchanged
- `PaymentBreakdown` unchanged
- `applyPayment()` signature unchanged

All existing code continues to work. The fix only corrects the internal accounting logic.

## Summary

The payment application accounting is now **trust-critical accurate**:
- ✅ `totalPayment = appliedTotal + remaining` (always)
- ✅ Partial payments handled correctly (no extra principal applied)
- ✅ Optional components only applied when assumptions enable them
- ✅ Every cent accounted for transparently
- ✅ Ready for statement matching feature

This fix is essential for the "Trust Mode" differentiator - users must be able to trust that our calculations match their statements exactly.
