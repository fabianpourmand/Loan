/**
 * Tests for daily simple interest amortization
 */

import { describe, it, expect } from 'vitest';
import * as AmortDaily from '../amort_daily';
import * as Money from '../money';
import type { AssumptionSet } from '../assumptions';
import type { LoanParameters } from '../amort_fixed';

// Test assumption set for daily accrual
const DAILY_ASSUMPTIONS: AssumptionSet = {
  name: 'Daily Simple Interest',
  amortizationMethod: 'daily',
  dayCountBasis: 'actual/365',
  paymentFrequency: 'monthly',
  paymentApplicationOrder: 'standard',
  includeEscrow: false,
  includePMI: false,
  includeHOA: false,
  roundingMethod: 'nearest'
};

describe('amort_daily', () => {
  describe('generateSchedule - basic daily interest calculation', () => {
    it('Test A: calculates exact interest for 1 day at 100% APR ($365 principal)', () => {
      // Principal: $365.00 (36500 cents)
      // APR: 100% (1.0)
      // 1 day between 2026-01-01 and 2026-01-02
      // Expected interest: $365 * 1.0 * 1 / 365 = $1.00 exactly
      const params: LoanParameters = {
        principal: 36500n, // $365.00
        annualRate: 1.0, // 100%
        termMonths: 12,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 2, 0, 0, 0)) // 2026-01-02
      };

      const lastPaymentDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0)); // 2026-01-01

      const schedule = AmortDaily.generateSchedule(
        params,
        DAILY_ASSUMPTIONS,
        [],
        lastPaymentDate
      );

      expect(schedule.periods.length).toBeGreaterThan(0);

      const period1 = schedule.periods[0];

      // Interest should be exactly $1.00 (100 cents)
      expect(period1.interestPortion).toBe(100n);

      // Principal paid should equal scheduled payment minus interest
      const expectedPrincipalPaid = Money.subtract(
        period1.scheduledPayment,
        period1.interestPortion
      );
      expect(period1.principalPortion).toBe(expectedPrincipalPaid);
      expect(period1.principalPortion).toBeGreaterThan(0n);

      // Ending balance should equal beginning balance minus principal paid
      const expectedEndingBalance = Money.subtract(
        period1.beginningBalance,
        period1.principalPortion
      );
      expect(period1.endingBalance).toBe(expectedEndingBalance);
    });

    it('Test B: calculates interest for 2 days (doubles interest from Test A)', () => {
      // Same setup but with 2-day gap
      // Expected interest: $365 * 1.0 * 2 / 365 = $2.00 exactly
      const params: LoanParameters = {
        principal: 36500n, // $365.00
        annualRate: 1.0, // 100%
        termMonths: 12,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 3, 0, 0, 0)) // 2026-01-03
      };

      const lastPaymentDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0)); // 2026-01-01

      const schedule = AmortDaily.generateSchedule(
        params,
        DAILY_ASSUMPTIONS,
        [],
        lastPaymentDate
      );

      expect(schedule.periods.length).toBeGreaterThan(0);

      const period1 = schedule.periods[0];

      // Interest should be exactly $2.00 (200 cents) - double Test A
      expect(period1.interestPortion).toBe(200n);

      // Verify principal portion is payment minus interest (interest paid first)
      const principalPaid = period1.scheduledPayment - period1.interestPortion;
      expect(period1.principalPortion).toBe(principalPaid);
      expect(period1.principalPortion).toBeGreaterThan(0n);
    });

    it('Test C: verifies payment application order (interest paid first)', () => {
      // Scenario: payment must cover interest before principal
      // Principal: $1000.00, APR: 10%, 30 days
      // Interest: $1000 * 0.10 * 30 / 365 = $8.22 (approx)
      const params: LoanParameters = {
        principal: 100000n, // $1000.00
        annualRate: 0.10, // 10%
        termMonths: 12,
        firstPaymentDate: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)) // 2026-02-01
      };

      const lastPaymentDate = new Date(Date.UTC(2026, 0, 2, 0, 0, 0)); // 2026-01-02

      const schedule = AmortDaily.generateSchedule(
        params,
        DAILY_ASSUMPTIONS,
        [],
        lastPaymentDate
      );

      expect(schedule.periods.length).toBeGreaterThan(0);

      const period1 = schedule.periods[0];

      // Interest must be positive
      expect(period1.interestPortion).toBeGreaterThan(0n);

      // Principal paid must equal payment minus interest (interest paid first)
      const expectedPrincipalPaid = Money.subtract(
        period1.scheduledPayment,
        period1.interestPortion
      );
      expect(period1.principalPortion).toBe(expectedPrincipalPaid);

      // Principal paid must be non-negative (interest never exceeds payment)
      expect(period1.principalPortion).toBeGreaterThanOrEqual(0n);

      // Ending balance must equal beginning balance minus total principal
      const expectedEndingBalance = Money.subtract(
        period1.beginningBalance,
        period1.totalPrincipal
      );
      expect(period1.endingBalance).toBe(expectedEndingBalance);
    });
  });

  describe('generateSchedule - validation', () => {
    it('rejects non-daily amortization method', () => {
      const params: LoanParameters = {
        principal: 100000n,
        annualRate: 0.05,
        termMonths: 360,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
      };

      const monthlyAssumptions: AssumptionSet = {
        ...DAILY_ASSUMPTIONS,
        amortizationMethod: 'monthly' // Wrong method
      };

      expect(() =>
        AmortDaily.generateSchedule(params, monthlyAssumptions)
      ).toThrow('amort_daily requires daily amortization method');
    });

    it('rejects non-monthly payment frequency', () => {
      const params: LoanParameters = {
        principal: 100000n,
        annualRate: 0.05,
        termMonths: 360,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
      };

      const biWeeklyAssumptions: AssumptionSet = {
        ...DAILY_ASSUMPTIONS,
        paymentFrequency: 'bi-weekly' // Wrong frequency
      };

      expect(() =>
        AmortDaily.generateSchedule(params, biWeeklyAssumptions)
      ).toThrow('amort_daily only supports monthly payment frequency');
    });
  });

  describe('helper functions', () => {
    it('getPeriod returns correct period', () => {
      const params: LoanParameters = {
        principal: 100000n,
        annualRate: 0.05,
        termMonths: 12,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
      };

      const schedule = AmortDaily.generateSchedule(params, DAILY_ASSUMPTIONS);

      const period3 = AmortDaily.getPeriod(schedule, 3);
      expect(period3).toBeDefined();
      expect(period3?.periodNumber).toBe(3);
    });

    it('getBalanceAtPeriod returns correct balance', () => {
      const params: LoanParameters = {
        principal: 100000n,
        annualRate: 0.05,
        termMonths: 12,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
      };

      const schedule = AmortDaily.generateSchedule(params, DAILY_ASSUMPTIONS);

      const balance = AmortDaily.getBalanceAtPeriod(schedule, 1);
      expect(balance).toBeGreaterThan(0n);
      expect(balance).toBeLessThan(params.principal);
    });

    it('getInterestPaidThrough returns cumulative interest', () => {
      const params: LoanParameters = {
        principal: 100000n,
        annualRate: 0.05,
        termMonths: 12,
        firstPaymentDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
      };

      const schedule = AmortDaily.generateSchedule(params, DAILY_ASSUMPTIONS);

      const interest = AmortDaily.getInterestPaidThrough(schedule, 3);
      expect(interest).toBeGreaterThan(0n);
    });
  });
});
