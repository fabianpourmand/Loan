import { describe, it, expect } from 'vitest';
import * as AmortFixed from '../amort_fixed';
import * as Money from '../money';
import { STANDARD_MONTHLY } from '../assumptions';

describe('AmortFixed - Basic Schedule Generation', () => {
  it('should generate schedule for standard 30-year mortgage', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(300000),
      annualRate: 0.065, // 6.5%
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1) // Jan 1, 2024
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // Should have 360 payments (or 360 due to rounding)
    expect(schedule.periods.length).toBeGreaterThanOrEqual(359);
    expect(schedule.periods.length).toBeLessThanOrEqual(361);

    // First period should be period 1
    expect(schedule.periods[0].periodNumber).toBe(1);

    // Final balance should be zero (or very close)
    const finalPeriod = schedule.periods[schedule.periods.length - 1];
    expect(Money.abs(finalPeriod.endingBalance)).toBeLessThanOrEqual(Money.ONE_CENT);
  });

  it('should calculate correct scheduled payment', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(300000),
      annualRate: 0.065,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // Expected payment: ~$1,896.20
    expect(Money.toDollars(schedule.scheduledPayment)).toBeCloseTo(1896.20, 0);

    // All periods except the final one should have same scheduled payment
    for (let i = 0; i < schedule.periods.length - 1; i++) {
      expect(schedule.periods[i].scheduledPayment).toBe(schedule.scheduledPayment);
    }

    // Final period may be different (adjusted to force payoff at termMonths)
    const finalPeriod = schedule.periods[schedule.periods.length - 1];
    // Final payment can be slightly larger or smaller to bring balance to exactly zero
    expect(finalPeriod.endingBalance).toBe(Money.ZERO);
  });

  it('should have decreasing interest and increasing principal over time', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // First period has higher interest
    const firstInterest = schedule.periods[0].interestPortion;
    const lastInterest = schedule.periods[359].interestPortion;

    expect(Money.isGreaterThan(firstInterest, lastInterest)).toBe(true);

    // First period has lower principal
    const firstPrincipal = schedule.periods[0].principalPortion;
    const lastPrincipal = schedule.periods[359].principalPortion;

    expect(Money.isLessThan(firstPrincipal, lastPrincipal)).toBe(true);
  });
});

describe('AmortFixed - First Payment Validation (Golden Test)', () => {
  it('should match golden test case for $300k at 6.5% 30yr', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(300000),
      annualRate: 0.065,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);
    const period1 = schedule.periods[0];

    // Period 1 expected values (from mortgage calculators)
    // Payment: $1,896.20
    // Interest: $1,625.00 ($300,000 * 0.065 / 12)
    // Principal: $271.20
    // Balance: $299,728.80

    expect(Money.toDollars(period1.scheduledPayment)).toBeCloseTo(1896.20, 1);
    expect(Money.toDollars(period1.interestPortion)).toBeCloseTo(1625.00, 0);
    expect(Money.toDollars(period1.principalPortion)).toBeCloseTo(271.20, 1);
    expect(Money.toDollars(period1.endingBalance)).toBeCloseTo(299728.80, 1);
  });

  it('should match expected first 3 periods for $200k at 5% 15yr', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.05,
      termMonths: 180,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // Period 1
    const p1 = schedule.periods[0];
    expect(Money.toDollars(p1.scheduledPayment)).toBeCloseTo(1581.59, 1);
    expect(Money.toDollars(p1.interestPortion)).toBeCloseTo(833.33, 1);
    expect(Money.toDollars(p1.principalPortion)).toBeCloseTo(748.26, 1);
    expect(Money.toDollars(p1.endingBalance)).toBeCloseTo(199251.74, 1);

    // Period 2
    const p2 = schedule.periods[1];
    expect(Money.toDollars(p2.interestPortion)).toBeCloseTo(830.22, 1);
    expect(Money.toDollars(p2.principalPortion)).toBeCloseTo(751.37, 1);

    // Period 3
    const p3 = schedule.periods[2];
    expect(Money.toDollars(p3.interestPortion)).toBeCloseTo(827.09, 1);
    expect(Money.toDollars(p3.principalPortion)).toBeCloseTo(754.50, 1);
  });
});

describe('AmortFixed - Invariants', () => {
  it('should satisfy: sum of principal paid equals initial principal', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(150000),
      annualRate: 0.055,
      termMonths: 180,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // Sum all principal payments
    let totalPrincipalPaid = Money.ZERO;
    schedule.periods.forEach((period) => {
      totalPrincipalPaid = Money.add(totalPrincipalPaid, period.totalPrincipal);
    });

    // Should equal initial principal (within 1 cent due to rounding)
    const diff = Money.abs(Money.subtract(totalPrincipalPaid, params.principal));
    expect(diff).toBeLessThanOrEqual(Money.ONE_CENT);
  });

  it('should satisfy: balance never increases', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(250000),
      annualRate: 0.07,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    for (let i = 1; i < schedule.periods.length; i++) {
      const prevBalance = schedule.periods[i - 1].endingBalance;
      const currBalance = schedule.periods[i].beginningBalance;
      const currEndingBalance = schedule.periods[i].endingBalance;

      // Current beginning should equal previous ending
      expect(currBalance).toBe(prevBalance);

      // Current ending should be less than or equal to beginning
      expect(Money.isLessThanOrEqual(currEndingBalance, currBalance)).toBe(true);
    }
  });

  it('should satisfy: payment = interest + principal', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(100000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    schedule.periods.forEach((period) => {
      const sumParts = Money.add(
        period.interestPortion,
        period.principalPortion
      );

      // Scheduled payment should equal interest + principal (within 1 cent due to rounding)
      const diff = Money.abs(Money.subtract(period.scheduledPayment, sumParts));
      expect(diff).toBeLessThanOrEqual(Money.ONE_CENT);
    });
  });

  it('should satisfy: cumulative values are monotonically increasing', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.065,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    for (let i = 1; i < schedule.periods.length; i++) {
      const prev = schedule.periods[i - 1];
      const curr = schedule.periods[i];

      // Cumulative interest should increase
      expect(
        Money.isGreaterThanOrEqual(curr.cumulativeInterest, prev.cumulativeInterest)
      ).toBe(true);

      // Cumulative principal should increase
      expect(
        Money.isGreaterThanOrEqual(curr.cumulativePrincipal, prev.cumulativePrincipal)
      ).toBe(true);
    }
  });
});

describe('AmortFixed - Extra Principal Payments', () => {
  it('should apply extra principal payments', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const extraPayments: AmortFixed.ExtraPayment[] = [
      { paymentNumber: 1, amount: Money.fromDollars(1000) },
      { paymentNumber: 12, amount: Money.fromDollars(5000) }
    ];

    const schedule = AmortFixed.generateSchedule(
      params,
      STANDARD_MONTHLY,
      extraPayments
    );

    // Period 1 should have $1,000 extra principal
    expect(schedule.periods[0].extraPrincipal).toBe(Money.fromDollars(1000));

    // Period 12 should have $5,000 extra principal
    expect(schedule.periods[11].extraPrincipal).toBe(Money.fromDollars(5000));

    // Other periods should have zero extra principal
    expect(schedule.periods[1].extraPrincipal).toBe(Money.ZERO);
  });

  it('should pay off loan faster with extra principal', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    // No extra payments
    const scheduleNoExtra = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // $500 extra every month
    const extraPayments: AmortFixed.ExtraPayment[] = [];
    for (let i = 1; i <= 360; i++) {
      extraPayments.push({
        paymentNumber: i,
        amount: Money.fromDollars(500)
      });
    }

    const scheduleWithExtra = AmortFixed.generateSchedule(
      params,
      STANDARD_MONTHLY,
      extraPayments
    );

    // Should pay off much faster
    expect(scheduleWithExtra.periods.length).toBeLessThan(scheduleNoExtra.periods.length);

    // Should pay less total interest
    expect(
      Money.isLessThan(
        scheduleWithExtra.summary.totalInterest,
        scheduleNoExtra.summary.totalInterest
      )
    ).toBe(true);
  });
});

describe('AmortFixed - With Escrow and Other Components', () => {
  it('should include escrow in total payment', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(300000),
      annualRate: 0.065,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1),
      escrow: Money.fromDollars(500)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // Each period should have $500 escrow
    schedule.periods.forEach((period) => {
      expect(period.escrow).toBe(Money.fromDollars(500));

      // Total payment should include escrow
      const expectedTotal = Money.add(period.scheduledPayment, Money.fromDollars(500));
      expect(period.totalPayment).toBe(expectedTotal);
    });
  });

  it('should include PMI when enabled', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(300000),
      annualRate: 0.065,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1),
      pmi: Money.fromDollars(150)
    };

    const assumptions = {
      ...STANDARD_MONTHLY,
      includePMI: true
    };

    const schedule = AmortFixed.generateSchedule(params, assumptions);

    // Each period should have $150 PMI
    schedule.periods.forEach((period) => {
      expect(period.pmi).toBe(Money.fromDollars(150));
    });
  });

  it('should calculate correct summary with all components', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 180, // 15 years
      firstPaymentDate: new Date(2024, 0, 1),
      escrow: Money.fromDollars(400),
      pmi: Money.fromDollars(100),
      hoa: Money.fromDollars(200)
    };

    const assumptions = {
      ...STANDARD_MONTHLY,
      includePMI: true,
      includeHOA: true
    };

    const schedule = AmortFixed.generateSchedule(params, assumptions);

    // Total paid with escrow should be significantly higher than P&I only
    expect(
      Money.isGreaterThan(
        schedule.summary.totalPaidWithEscrow,
        schedule.summary.totalPayments
      )
    ).toBe(true);

    // Verify escrow, PMI, HOA totals
    const expectedEscrowTotal = Money.multiply(
      Money.fromDollars(400),
      schedule.periods.length
    );
    const expectedPMITotal = Money.multiply(
      Money.fromDollars(100),
      schedule.periods.length
    );
    const expectedHOATotal = Money.multiply(
      Money.fromDollars(200),
      schedule.periods.length
    );

    const totalExtra = Money.add(
      expectedEscrowTotal,
      Money.add(expectedPMITotal, expectedHOATotal)
    );

    const expectedTotal = Money.add(schedule.summary.totalPayments, totalExtra);

    // Should match (within rounding)
    const diff = Money.abs(
      Money.subtract(schedule.summary.totalPaidWithEscrow, expectedTotal)
    );
    expect(diff).toBeLessThanOrEqual(Money.ONE_DOLLAR);
  });
});

describe('AmortFixed - Helper Functions', () => {
  it('should get specific period', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    const period12 = AmortFixed.getPeriod(schedule, 12);
    expect(period12).toBeDefined();
    expect(period12?.periodNumber).toBe(12);
  });

  it('should get balance at specific period', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    const balanceAt12 = AmortFixed.getBalanceAtPeriod(schedule, 12);
    expect(Money.isGreaterThan(balanceAt12, Money.ZERO)).toBe(true);
    expect(Money.isLessThan(balanceAt12, params.principal)).toBe(true);
  });

  it('should get cumulative interest paid', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    const interestThrough12 = AmortFixed.getInterestPaidThrough(schedule, 12);
    expect(Money.isGreaterThan(interestThrough12, Money.ZERO)).toBe(true);

    const interestThrough24 = AmortFixed.getInterestPaidThrough(schedule, 24);
    expect(Money.isGreaterThan(interestThrough24, interestThrough12)).toBe(true);
  });
});

describe('AmortFixed - Payoff Contract', () => {
  it('should return exactly termMonths rows with zero ending balance in final period', () => {
    // Contract test: amort_fixed must return exactly termMonths periods,
    // with the last period adjusted to bring endingBalance to exactly zero.
    // No extra spillover month should be generated.
    const params: AmortFixed.LoanParameters = {
      principal: 30000000n, // $300,000.00
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date('2026-02-01T00:00:00.000Z')
    };

    const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

    // Contract: Must have exactly 360 periods (no extra month)
    expect(schedule.periods.length).toBe(360);

    // Contract: First period is period 1
    expect(schedule.periods[0].periodNumber).toBe(1);

    // Contract: Last period is period 360
    expect(schedule.periods[359].periodNumber).toBe(360);

    // Contract: Last payment date should be exactly 360 months from first payment
    // First payment: 2026-02-01, so 360th payment: 2056-01-01
    expect(schedule.periods[359].paymentDate.toISOString()).toBe(
      '2056-01-01T00:00:00.000Z'
    );

    // Contract: Last period must have exactly zero ending balance
    expect(schedule.periods[359].endingBalance).toBe(0n);

    // Sanity: Last period should still have positive principal and non-negative interest
    expect(schedule.periods[359].totalPrincipal).toBeGreaterThan(0n);
    expect(schedule.periods[359].interestPortion).toBeGreaterThanOrEqual(0n);
  });
});

describe('AmortFixed - Validation', () => {
  it('should reject non-monthly amortization method', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const dailyAssumptions = {
      ...STANDARD_MONTHLY,
      amortizationMethod: 'daily' as const
    };

    expect(() =>
      AmortFixed.generateSchedule(params, dailyAssumptions)
    ).toThrow('amort_fixed requires monthly amortization method');
  });

  it('should reject non-monthly payment frequency', () => {
    const params: AmortFixed.LoanParameters = {
      principal: Money.fromDollars(200000),
      annualRate: 0.06,
      termMonths: 360,
      firstPaymentDate: new Date(2024, 0, 1)
    };

    const biWeeklyAssumptions = {
      ...STANDARD_MONTHLY,
      paymentFrequency: 'bi-weekly' as const
    };

    expect(() =>
      AmortFixed.generateSchedule(params, biWeeklyAssumptions)
    ).toThrow('amort_fixed only supports monthly payment frequency');
  });
});
