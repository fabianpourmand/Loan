/**
 * Statement matching harness
 * Compares engine-generated schedule to lender statement data
 */

import type { Money } from './money';
import * as Money from './money';

/**
 * Match status result
 */
export type MatchStatus = 'MATCH' | 'CLOSE' | 'NO_MATCH';

/**
 * Options for statement matching
 */
export interface MatchOptions {
  /** Tolerance for money field deltas (default: 1 cent) */
  moneyToleranceCents?: bigint;
  /** Allow date mismatches (default: false) */
  allowDateMismatch?: boolean;
  /** Treat missing money fields as zero (default: false - strict missing field checking) */
  treatMissingMoneyAsZero?: boolean;
}

/**
 * Delta information for a single row
 */
export interface RowDelta {
  /** Row index (0-indexed) */
  rowIndex: number;
  /** Field deltas (only non-zero deltas included) */
  deltas: Record<string, Money>;
}

/**
 * Match diagnostics
 */
export interface MatchDiagnostics {
  /** Expected row count */
  rowCountExpected: number;
  /** Actual row count */
  rowCountActual: number;
  /** Maximum absolute delta by field name */
  maxAbsDeltaByField: Record<string, Money>;
  /** First N rows with non-zero deltas */
  deltasByRow: RowDelta[];
  /** Human-readable notes */
  notes: string[];
}

/**
 * Statement row - minimal interface matching AmortizationPeriod fields
 */
export interface StatementRow {
  /** Period/payment number */
  periodNumber?: number;
  /** Payment date */
  paymentDate?: Date;
  /** Beginning balance */
  beginningBalance?: Money;
  /** Scheduled payment (P&I only) */
  scheduledPayment?: Money;
  /** Interest portion */
  interestPortion?: Money;
  /** Principal portion */
  principalPortion?: Money;
  /** Extra principal */
  extraPrincipal?: Money;
  /** Total principal */
  totalPrincipal?: Money;
  /** Ending balance */
  endingBalance?: Money;
  /** Escrow */
  escrow?: Money;
  /** PMI */
  pmi?: Money;
  /** HOA */
  hoa?: Money;
  /** Total payment */
  totalPayment?: Money;
  /** Cumulative interest */
  cumulativeInterest?: Money;
  /** Cumulative principal */
  cumulativePrincipal?: Money;
}

/**
 * Money field names to compare
 */
const MONEY_FIELDS: (keyof StatementRow)[] = [
  'beginningBalance',
  'scheduledPayment',
  'interestPortion',
  'principalPortion',
  'extraPrincipal',
  'totalPrincipal',
  'endingBalance',
  'escrow',
  'pmi',
  'hoa',
  'totalPayment',
  'cumulativeInterest',
  'cumulativePrincipal'
];

/**
 * Match statement rows against expected rows
 *
 * @param expectedRows - Expected rows (from engine)
 * @param actualRows - Actual rows (from lender statement)
 * @param options - Match options
 * @returns Match result with status and diagnostics
 */
export function matchStatement(
  expectedRows: StatementRow[],
  actualRows: StatementRow[],
  options?: MatchOptions
): { status: MatchStatus; diagnostics: MatchDiagnostics } {
  const opts: Required<MatchOptions> = {
    moneyToleranceCents: options?.moneyToleranceCents ?? 1n,
    allowDateMismatch: options?.allowDateMismatch ?? false,
    treatMissingMoneyAsZero: options?.treatMissingMoneyAsZero ?? false
  };

  const diagnostics: MatchDiagnostics = {
    rowCountExpected: expectedRows.length,
    rowCountActual: actualRows.length,
    maxAbsDeltaByField: {},
    deltasByRow: [],
    notes: []
  };

  // Check row count match
  if (expectedRows.length !== actualRows.length) {
    diagnostics.notes.push(
      `Row count mismatch: expected ${expectedRows.length}, got ${actualRows.length}`
    );
    return { status: 'NO_MATCH', diagnostics };
  }

  // Compare rows
  const maxAbsDelta: Record<string, Money> = {};
  const rowDeltas: RowDelta[] = [];
  let hasDateMismatch = false;
  let hasMissingFieldMismatch = false;
  let allExactMatch = true;
  let allWithinTolerance = true;

  for (let i = 0; i < expectedRows.length; i++) {
    const expected = expectedRows[i];
    const actual = actualRows[i];
    const deltas: Record<string, Money> = {};

    // Check dates
    const expHasDate = expected.paymentDate !== undefined && expected.paymentDate !== null;
    const actHasDate = actual.paymentDate !== undefined && actual.paymentDate !== null;

    if (expHasDate && actHasDate) {
      // Both present - compare times
      if (expected.paymentDate!.getTime() !== actual.paymentDate!.getTime()) {
        hasDateMismatch = true;
        if (!opts.allowDateMismatch) {
          diagnostics.notes.push(
            `Date mismatch at row ${i}: expected ${expected.paymentDate!.toISOString()}, got ${actual.paymentDate!.toISOString()}`
          );
        }
      }
    } else if (expHasDate !== actHasDate) {
      // Exactly one has a date - mismatch
      hasDateMismatch = true;
      if (!opts.allowDateMismatch) {
        diagnostics.notes.push(`Date missing at row ${i}`);
      }
    }
    // If both missing, OK - no action needed

    // Compare money fields
    for (const field of MONEY_FIELDS) {
      const expectedVal = expected[field];
      const actualVal = actual[field];

      // Skip if both undefined/null
      if (
        (expectedVal === undefined || expectedVal === null) &&
        (actualVal === undefined || actualVal === null)
      ) {
        continue;
      }

      // Check if exactly one side is missing
      const expectedMissing = expectedVal === undefined || expectedVal === null;
      const actualMissing = actualVal === undefined || actualVal === null;

      if (expectedMissing !== actualMissing) {
        // Exactly one side is missing
        if (opts.treatMissingMoneyAsZero) {
          // Opt-in behavior: coerce missing to zero and compare
          const expMoney = expectedVal ?? Money.ZERO;
          const actMoney = actualVal ?? Money.ZERO;

          const delta = Money.subtract(actMoney, expMoney);
          const absDelta = Money.abs(delta);

          if (delta !== Money.ZERO) {
            deltas[field] = delta;
            allExactMatch = false;

            // Track max absolute delta per field
            const currentMax = maxAbsDelta[field] ?? Money.ZERO;
            if (Money.isGreaterThan(absDelta, currentMax)) {
              maxAbsDelta[field] = absDelta;
            }

            // Check tolerance
            if (Money.isGreaterThan(absDelta, opts.moneyToleranceCents)) {
              allWithinTolerance = false;
            }
          }
        } else {
          // Strict default: mark as missing field mismatch
          hasMissingFieldMismatch = true;
          diagnostics.notes.push(`Missing field ${field} at row ${i}`);
        }
        continue;
      }

      // Both present - compare normally
      const expMoney = expectedVal!;
      const actMoney = actualVal!;

      const delta = Money.subtract(actMoney, expMoney);
      const absDelta = Money.abs(delta);

      if (delta !== Money.ZERO) {
        deltas[field] = delta;
        allExactMatch = false;

        // Track max absolute delta per field
        const currentMax = maxAbsDelta[field] ?? Money.ZERO;
        if (Money.isGreaterThan(absDelta, currentMax)) {
          maxAbsDelta[field] = absDelta;
        }

        // Check tolerance
        if (Money.isGreaterThan(absDelta, opts.moneyToleranceCents)) {
          allWithinTolerance = false;
        }
      }
    }

    // Record row deltas if any
    if (Object.keys(deltas).length > 0) {
      if (rowDeltas.length < 5) {
        // Limit to first 5 rows with deltas
        rowDeltas.push({ rowIndex: i, deltas });
      }
    }
  }

  diagnostics.maxAbsDeltaByField = maxAbsDelta;
  diagnostics.deltasByRow = rowDeltas;

  // Determine status
  // Missing field mismatch takes precedence when strict mode is enabled
  if (hasMissingFieldMismatch && !opts.treatMissingMoneyAsZero) {
    return { status: 'NO_MATCH', diagnostics };
  }

  if (hasDateMismatch && !opts.allowDateMismatch) {
    diagnostics.notes.push('Date mismatch detected');
    return { status: 'NO_MATCH', diagnostics };
  }

  if (allExactMatch && !hasDateMismatch) {
    diagnostics.notes.push('All fields match exactly');
    return { status: 'MATCH', diagnostics };
  }

  if (allWithinTolerance) {
    if (hasDateMismatch && opts.allowDateMismatch) {
      diagnostics.notes.push(
        `All money fields within tolerance (${opts.moneyToleranceCents} cents), date mismatch allowed`
      );
    } else {
      diagnostics.notes.push(
        `All money fields within tolerance (${opts.moneyToleranceCents} cents)`
      );
    }
    return { status: 'CLOSE', diagnostics };
  }

  diagnostics.notes.push('Deltas exceed tolerance');
  return { status: 'NO_MATCH', diagnostics };
}
