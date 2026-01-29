import { describe, it, expect } from 'vitest';
import * as AmortFixed from '../amort_fixed';
import * as StatementMatch from '../statement_match';
import { GOLDEN_CASES } from '../__golden__/cases';

describe('Golden Cases - Amortization Behavior Lock', () => {
  GOLDEN_CASES.forEach((goldenCase) => {
    describe(goldenCase.id, () => {
      it(`should match expected behavior: ${goldenCase.description}`, () => {
        // Generate schedule
        const schedule = AmortFixed.generateSchedule(
          goldenCase.loanParams,
          goldenCase.assumptions,
          goldenCase.extraPayments
        );

        // Test 1: Verify first 3 rows match exactly using strict statement matching
        const actualFirst3 = schedule.periods.slice(0, 3);
        const expectedFirst3 = goldenCase.expected.first3Rows;

        const matchResult = StatementMatch.matchStatement(expectedFirst3, actualFirst3, {
          treatMissingMoneyAsZero: false, // Strict mode
          allowDateMismatch: false
        });

        // Assert match status
        if (matchResult.status !== 'MATCH') {
          console.error(`\n=== MISMATCH for ${goldenCase.id} ===`);
          console.error('Match notes:', matchResult.diagnostics.notes);
          console.error('\nExpected vs Actual comparison:');
          for (let i = 0; i < 3; i++) {
            const exp = expectedFirst3[i];
            const act = actualFirst3[i];
            console.error(`\nRow ${i}:`);
            console.error(`  scheduledPayment: ${exp.scheduledPayment} vs ${act.scheduledPayment}`);
            console.error(`  totalPayment: ${exp.totalPayment} vs ${act.totalPayment}`);
            console.error(`  escrow: ${exp.escrow} vs ${act.escrow}`);
            console.error(`  pmi: ${exp.pmi} vs ${act.pmi}`);
            console.error(`  hoa: ${exp.hoa} vs ${act.hoa}`);
          }
        }
        expect(matchResult.status).toBe('MATCH');

        // Test 2: Verify row count matches
        expect(schedule.summary.numberOfPayments).toBe(
          goldenCase.expected.summary.numberOfPayments
        );

        // Test 3: Verify summary totals match exactly (bigint comparison)
        expect(schedule.summary.totalInterest).toBe(goldenCase.expected.summary.totalInterest);
        expect(schedule.summary.totalPrincipal).toBe(
          goldenCase.expected.summary.totalPrincipal
        );

        // Test 4: Sanity check - verify we have at least 3 periods
        expect(schedule.periods.length).toBeGreaterThanOrEqual(3);
      });

      it(`should have deterministic first payment for: ${goldenCase.description}`, () => {
        // Run twice to ensure determinism
        const schedule1 = AmortFixed.generateSchedule(
          goldenCase.loanParams,
          goldenCase.assumptions,
          goldenCase.extraPayments
        );

        const schedule2 = AmortFixed.generateSchedule(
          goldenCase.loanParams,
          goldenCase.assumptions,
          goldenCase.extraPayments
        );

        const period1_first = schedule1.periods[0];
        const period2_first = schedule2.periods[0];

        // Verify determinism - all fields should match exactly
        expect(period1_first.periodNumber).toBe(period2_first.periodNumber);
        expect(period1_first.paymentDate.getTime()).toBe(period2_first.paymentDate.getTime());
        expect(period1_first.beginningBalance).toBe(period2_first.beginningBalance);
        expect(period1_first.scheduledPayment).toBe(period2_first.scheduledPayment);
        expect(period1_first.interestPortion).toBe(period2_first.interestPortion);
        expect(period1_first.principalPortion).toBe(period2_first.principalPortion);
        expect(period1_first.extraPrincipal).toBe(period2_first.extraPrincipal);
        expect(period1_first.totalPrincipal).toBe(period2_first.totalPrincipal);
        expect(period1_first.endingBalance).toBe(period2_first.endingBalance);
        expect(period1_first.escrow).toBe(period2_first.escrow);
        expect(period1_first.pmi).toBe(period2_first.pmi);
        expect(period1_first.hoa).toBe(period2_first.hoa);
        expect(period1_first.totalPayment).toBe(period2_first.totalPayment);
        expect(period1_first.cumulativeInterest).toBe(period2_first.cumulativeInterest);
        expect(period1_first.cumulativePrincipal).toBe(period2_first.cumulativePrincipal);
      });
    });
  });

  it('should have all required golden cases defined', () => {
    // Ensure we have at least the minimum set of cases
    expect(GOLDEN_CASES.length).toBeGreaterThanOrEqual(3);

    // Check case IDs are unique
    const ids = GOLDEN_CASES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Check each case has all required fields
    GOLDEN_CASES.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.loanParams).toBeDefined();
      expect(c.assumptions).toBeDefined();
      expect(c.expected.first3Rows).toHaveLength(3);
      expect(c.expected.summary).toBeDefined();
    });
  });
});
