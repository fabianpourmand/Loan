import { describe, it, expect } from 'vitest';
import * as AmortFixed from '../amort_fixed';
import * as AmortDaily from '../amort_daily';
import * as Money from '../money';
import { STANDARD_MONTHLY, DAILY_ACCRUAL_365, DAILY_ACCRUAL_360 } from '../assumptions';
import type { AssumptionSet } from '../assumptions';
import type { AmortizationSchedule } from '../amort_fixed';

/**
 * Seeded pseudo-random number generator (LCG)
 * Linear Congruential Generator with parameters from Numerical Recipes
 * Ensures reproducible random test cases across runs
 */
class SeededRandom {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = 2 ** 32;

  constructor(seed: number) {
    this.seed = seed >>> 0; // Ensure unsigned 32-bit integer
  }

  /**
   * Generate next random number in range [0, 1)
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  /**
   * Generate random integer in range [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

/**
 * Generate random loan parameters for property-based testing
 * Stays within realistic mortgage ranges
 */
function generateRandomLoan(rng: SeededRandom): AmortFixed.LoanParameters {
  // Principal: $50k - $1M
  const principal = Money.fromDollars(rng.nextInt(50000, 1000000));

  // Annual rate: 2% - 12%
  const annualRate = rng.nextFloat(0.02, 0.12);

  // Term: 60-360 months (5-30 years)
  const termMonths = rng.nextInt(60, 360);

  // Random start date in 2024
  const month = rng.nextInt(0, 11);
  const day = rng.nextInt(1, 28); // Avoid month-end edge cases
  const firstPaymentDate = new Date(2024, month, day);

  // PI only - no escrow/PMI/HOA
  return {
    principal,
    annualRate,
    termMonths,
    firstPaymentDate
  };
}

/**
 * Assert all invariants for a generated schedule
 * These invariants must hold for ANY valid amortization schedule
 */
function assertScheduleInvariants(
  schedule: AmortizationSchedule,
  testLabel: string
): void {
  const { periods, parameters, summary } = schedule;

  // Invariant: Must have at least one period
  expect(periods.length).toBeGreaterThan(0);

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const prevPeriod = i > 0 ? periods[i - 1] : null;

    // Invariant 1: Period numbers are sequential starting from 1
    expect(period.periodNumber).toBe(i + 1);

    // Invariant 2: Payment dates strictly increase
    if (prevPeriod) {
      expect(period.paymentDate.getTime()).toBeGreaterThan(
        prevPeriod.paymentDate.getTime()
      );
    }

    // Invariant 3: All money fields are non-negative
    expect(period.beginningBalance).toBeGreaterThanOrEqual(0n);
    expect(period.scheduledPayment).toBeGreaterThanOrEqual(0n);
    expect(period.interestPortion).toBeGreaterThanOrEqual(0n);
    expect(period.principalPortion).toBeGreaterThanOrEqual(0n);
    expect(period.extraPrincipal).toBeGreaterThanOrEqual(0n);
    expect(period.totalPrincipal).toBeGreaterThanOrEqual(0n);
    expect(period.endingBalance).toBeGreaterThanOrEqual(0n);
    expect(period.escrow).toBeGreaterThanOrEqual(0n);
    expect(period.pmi).toBeGreaterThanOrEqual(0n);
    expect(period.hoa).toBeGreaterThanOrEqual(0n);
    expect(period.totalPayment).toBeGreaterThanOrEqual(0n);
    expect(period.cumulativeInterest).toBeGreaterThanOrEqual(0n);
    expect(period.cumulativePrincipal).toBeGreaterThanOrEqual(0n);

    // Invariant 4: Ending balance never exceeds beginning balance
    expect(period.endingBalance).toBeLessThanOrEqual(period.beginningBalance);

    // Invariant 5: Balance equation: endingBalance = beginningBalance - totalPrincipal
    const expectedEnding = Money.subtract(
      period.beginningBalance,
      period.totalPrincipal
    );
    expect(period.endingBalance).toBe(expectedEnding);

    // Invariant 6: Payment decomposition: scheduledPayment = interestPortion + principalPortion
    // (Allow 1 cent tolerance for rounding)
    const paymentSum = Money.add(period.interestPortion, period.principalPortion);
    const diff = Money.abs(Money.subtract(period.scheduledPayment, paymentSum));
    expect(diff).toBeLessThanOrEqual(Money.ONE_CENT);

    // Invariant 7: Total principal = principal portion + extra principal
    const expectedTotal = Money.add(
      period.principalPortion,
      period.extraPrincipal
    );
    expect(period.totalPrincipal).toBe(expectedTotal);

    // Invariant 8: Cumulative consistency
    if (prevPeriod) {
      // Current cumulative = previous cumulative + current period amount
      const expectedCumInterest = Money.add(
        prevPeriod.cumulativeInterest,
        period.interestPortion
      );
      expect(period.cumulativeInterest).toBe(expectedCumInterest);

      const expectedCumPrincipal = Money.add(
        prevPeriod.cumulativePrincipal,
        period.totalPrincipal
      );
      expect(period.cumulativePrincipal).toBe(expectedCumPrincipal);
    } else {
      // First period: cumulative equals period amount
      expect(period.cumulativeInterest).toBe(period.interestPortion);
      expect(period.cumulativePrincipal).toBe(period.totalPrincipal);
    }

    // Invariant 9: Beginning balance consistency
    if (prevPeriod) {
      expect(period.beginningBalance).toBe(prevPeriod.endingBalance);
    } else {
      expect(period.beginningBalance).toBe(parameters.principal);
    }
  }

  // Invariant 10: Final period - ending balance must be zero
  const lastPeriod = periods[periods.length - 1];
  expect(lastPeriod.endingBalance).toBe(0n);

  // Invariant 11: Total principal paid equals original principal
  // (Allow 1 cent tolerance for rounding)
  const principalDiff = Money.abs(
    Money.subtract(summary.totalPrincipal, parameters.principal)
  );
  expect(principalDiff).toBeLessThanOrEqual(Money.ONE_CENT);

  // Invariant 12: Conservation law - total payments = total interest + total principal
  const expectedTotal = Money.add(summary.totalInterest, summary.totalPrincipal);
  const conservationDiff = Money.abs(
    Money.subtract(summary.totalPayments, expectedTotal)
  );
  expect(conservationDiff).toBeLessThanOrEqual(Money.ONE_CENT);

  // Invariant 13: Summary totals match last period cumulatives
  expect(summary.totalInterest).toBe(lastPeriod.cumulativeInterest);
  expect(summary.totalPrincipal).toBe(lastPeriod.cumulativePrincipal);

  // Invariant 14: Number of payments matches period count
  expect(summary.numberOfPayments).toBe(periods.length);

  // Invariant 15: Payoff date matches last period payment date
  expect(summary.payoffDate.getTime()).toBe(lastPeriod.paymentDate.getTime());
}

describe('Schedule Invariants - Property-Based Tests', () => {
  const SEED = 42; // Fixed seed for reproducibility
  const NUM_TESTS = 100;

  describe('amort_fixed.generateSchedule - Monthly Amortization', () => {
    it(`should satisfy all invariants for ${NUM_TESTS} random loans`, () => {
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < NUM_TESTS; i++) {
        const params = generateRandomLoan(rng);
        const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

        assertScheduleInvariants(
          schedule,
          `Fixed monthly test ${i + 1}: $${Money.toDollars(params.principal)} @ ${(params.annualRate * 100).toFixed(2)}% for ${params.termMonths} months`
        );
      }
    });
  });

  describe('amort_daily.generateSchedule - Daily Accrual (365)', () => {
    it(`should satisfy all invariants for ${NUM_TESTS} random loans`, () => {
      const rng = new SeededRandom(SEED + 1000); // Different seed for variety

      for (let i = 0; i < NUM_TESTS; i++) {
        const params = generateRandomLoan(rng);
        const schedule = AmortDaily.generateSchedule(params, DAILY_ACCRUAL_365);

        assertScheduleInvariants(
          schedule,
          `Daily 365 test ${i + 1}: $${Money.toDollars(params.principal)} @ ${(params.annualRate * 100).toFixed(2)}% for ${params.termMonths} months`
        );
      }
    });
  });

  describe('amort_daily.generateSchedule - Daily Accrual (360)', () => {
    it(`should satisfy all invariants for ${NUM_TESTS} random loans`, () => {
      const rng = new SeededRandom(SEED + 2000); // Different seed for variety

      for (let i = 0; i < NUM_TESTS; i++) {
        const params = generateRandomLoan(rng);
        const schedule = AmortDaily.generateSchedule(params, DAILY_ACCRUAL_360);

        assertScheduleInvariants(
          schedule,
          `Daily 360 test ${i + 1}: $${Money.toDollars(params.principal)} @ ${(params.annualRate * 100).toFixed(2)}% for ${params.termMonths} months`
        );
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small principal amounts', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(1000), // $1k minimum
        annualRate: 0.05,
        termMonths: 60,
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      assertScheduleInvariants(schedule, 'Small principal edge case');
    });

    it('should handle very large principal amounts', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(5000000), // $5M jumbo loan
        annualRate: 0.07,
        termMonths: 360,
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      assertScheduleInvariants(schedule, 'Large principal edge case');
    });

    it('should handle low interest rates', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(300000),
        annualRate: 0.01, // 1% low rate
        termMonths: 360,
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      assertScheduleInvariants(schedule, 'Low interest rate edge case');
    });

    it('should handle high interest rates', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(300000),
        annualRate: 0.15, // 15% high rate
        termMonths: 360,
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      assertScheduleInvariants(schedule, 'High interest rate edge case');
    });

    it('should handle short term loans', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(200000),
        annualRate: 0.06,
        termMonths: 12, // 1 year
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      assertScheduleInvariants(schedule, 'Short term edge case');
    });

    it('should handle long term loans', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(300000),
        annualRate: 0.065,
        termMonths: 480, // 40 years
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      assertScheduleInvariants(schedule, 'Long term edge case');
    });
  });

  describe('Cross-Method Consistency', () => {
    it('should have similar total payments between monthly and daily methods', () => {
      const params: AmortFixed.LoanParameters = {
        principal: Money.fromDollars(300000),
        annualRate: 0.065,
        termMonths: 360,
        firstPaymentDate: new Date(2024, 0, 1)
      };

      const monthlySchedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
      const daily365Schedule = AmortDaily.generateSchedule(params, DAILY_ACCRUAL_365);
      const daily360Schedule = AmortDaily.generateSchedule(params, DAILY_ACCRUAL_360);

      // All three should have the same scheduled payment (calculated the same way)
      expect(monthlySchedule.scheduledPayment).toBe(daily365Schedule.scheduledPayment);
      expect(monthlySchedule.scheduledPayment).toBe(daily360Schedule.scheduledPayment);

      // Total interest may differ slightly due to different accrual methods
      // but should be in the same ballpark (within 10%)
      const monthlyInterest = monthlySchedule.summary.totalInterest;
      const daily365Interest = daily365Schedule.summary.totalInterest;
      const daily360Interest = daily360Schedule.summary.totalInterest;

      const diff365 = Money.abs(Money.subtract(monthlyInterest, daily365Interest));
      const diff360 = Money.abs(Money.subtract(monthlyInterest, daily360Interest));

      // Allow up to 10% variance due to different accrual methods
      const tolerance = monthlyInterest / 10n;
      expect(diff365).toBeLessThanOrEqual(tolerance);
      expect(diff360).toBeLessThanOrEqual(tolerance);
    });
  });
});
