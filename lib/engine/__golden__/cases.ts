/**
 * Golden test cases for amortization and statement matching
 * These cases lock in expected behavior over time
 */

import * as Money from '../money';
import type { LoanParameters, ExtraPayment } from '../amort_fixed';
import type { AssumptionSet } from '../assumptions';
import * as Assumptions from '../assumptions';

/**
 * Expected row data for first 3 periods
 */
export interface ExpectedRow {
  periodNumber: number;
  paymentDate: Date;
  beginningBalance: Money.Money;
  scheduledPayment: Money.Money;
  interestPortion: Money.Money;
  principalPortion: Money.Money;
  extraPrincipal: Money.Money;
  totalPrincipal: Money.Money;
  endingBalance: Money.Money;
  escrow: Money.Money;
  pmi: Money.Money;
  hoa: Money.Money;
  totalPayment: Money.Money;
  cumulativeInterest: Money.Money;
  cumulativePrincipal: Money.Money;
}

/**
 * Expected summary totals
 */
export interface ExpectedSummary {
  totalInterest: Money.Money;
  totalPrincipal: Money.Money;
  numberOfPayments: number;
}

/**
 * A single golden test case
 */
export interface GoldenCase {
  id: string;
  description: string;
  loanParams: LoanParameters;
  assumptions: AssumptionSet;
  extraPayments?: ExtraPayment[];
  expected: {
    first3Rows: ExpectedRow[];
    summary: ExpectedSummary;
  };
}

/**
 * Golden test cases
 */
export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'simple-loan',
    description: 'Simple 12-month loan with no extras',
    loanParams: {
      principal: Money.fromDollars(100000),
      annualRate: 0.06, // 6% APR
      termMonths: 12,
      firstPaymentDate: new Date('2024-02-01'),
      escrow: Money.ZERO,
      pmi: Money.ZERO,
      hoa: Money.ZERO
    },
    assumptions: Assumptions.STANDARD_MONTHLY,
    expected: {
      first3Rows: [
        {
          periodNumber: 1,
          paymentDate: new Date('2024-02-01T00:00:00.000Z'),
          beginningBalance: 10000000n,
          scheduledPayment: 860664n,
          interestPortion: 50000n,
          principalPortion: 810664n,
          extraPrincipal: 0n,
          totalPrincipal: 810664n,
          endingBalance: 9189336n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 860664n,
          cumulativeInterest: 50000n,
          cumulativePrincipal: 810664n
        },
        {
          periodNumber: 2,
          paymentDate: new Date('2024-03-01T00:00:00.000Z'),
          beginningBalance: 9189336n,
          scheduledPayment: 860664n,
          interestPortion: 45947n,
          principalPortion: 814717n,
          extraPrincipal: 0n,
          totalPrincipal: 814717n,
          endingBalance: 8374619n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 860664n,
          cumulativeInterest: 95947n,
          cumulativePrincipal: 1625381n
        },
        {
          periodNumber: 3,
          paymentDate: new Date('2024-04-01T00:00:00.000Z'),
          beginningBalance: 8374619n,
          scheduledPayment: 860664n,
          interestPortion: 41873n,
          principalPortion: 818791n,
          extraPrincipal: 0n,
          totalPrincipal: 818791n,
          endingBalance: 7555828n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 860664n,
          cumulativeInterest: 137820n,
          cumulativePrincipal: 2444172n
        }
      ],
      summary: {
        totalInterest: 327973n,
        totalPrincipal: 10000000n,
        numberOfPayments: 12
      }
    }
  },
  {
    id: 'loan-with-extra-payment',
    description: '6-month loan with $5,000 extra payment in period 1',
    loanParams: {
      principal: Money.fromDollars(50000),
      annualRate: 0.05, // 5% APR
      termMonths: 6,
      firstPaymentDate: new Date('2024-01-15'),
      escrow: Money.ZERO,
      pmi: Money.ZERO,
      hoa: Money.ZERO
    },
    assumptions: Assumptions.STANDARD_MONTHLY,
    extraPayments: [
      {
        paymentNumber: 1,
        amount: Money.fromDollars(5000)
      }
    ],
    expected: {
      first3Rows: [
        {
          periodNumber: 1,
          paymentDate: new Date('2024-01-15T00:00:00.000Z'),
          beginningBalance: 5000000n,
          scheduledPayment: 845528n,
          interestPortion: 20833n,
          principalPortion: 824695n,
          extraPrincipal: 500000n,
          totalPrincipal: 1324695n,
          endingBalance: 3675305n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 1345528n,
          cumulativeInterest: 20833n,
          cumulativePrincipal: 1324695n
        },
        {
          periodNumber: 2,
          paymentDate: new Date('2024-02-15T00:00:00.000Z'),
          beginningBalance: 3675305n,
          scheduledPayment: 845528n,
          interestPortion: 15314n,
          principalPortion: 830214n,
          extraPrincipal: 0n,
          totalPrincipal: 830214n,
          endingBalance: 2845091n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 845528n,
          cumulativeInterest: 36147n,
          cumulativePrincipal: 2154909n
        },
        {
          periodNumber: 3,
          paymentDate: new Date('2024-03-15T00:00:00.000Z'),
          beginningBalance: 2845091n,
          scheduledPayment: 845528n,
          interestPortion: 11855n,
          principalPortion: 833673n,
          extraPrincipal: 0n,
          totalPrincipal: 833673n,
          endingBalance: 2011418n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 845528n,
          cumulativeInterest: 48002n,
          cumulativePrincipal: 2988582n
        }
      ],
      summary: {
        totalInterest: 62666n,
        totalPrincipal: 5000000n,
        numberOfPayments: 6
      }
    }
  },
  {
    id: 'loan-with-escrow',
    description: '3-month loan with escrow (PMI/HOA disabled in standard assumptions)',
    loanParams: {
      principal: Money.fromDollars(25000),
      annualRate: 0.04, // 4% APR
      termMonths: 3,
      firstPaymentDate: new Date('2024-03-01'),
      escrow: Money.fromDollars(200),
      pmi: Money.ZERO,
      hoa: Money.ZERO
    },
    assumptions: Assumptions.STANDARD_MONTHLY,
    expected: {
      first3Rows: [
        {
          periodNumber: 1,
          paymentDate: new Date('2024-03-01T00:00:00.000Z'),
          beginningBalance: 2500000n,
          scheduledPayment: 838895n,
          interestPortion: 8333n,
          principalPortion: 830562n,
          extraPrincipal: 0n,
          totalPrincipal: 830562n,
          endingBalance: 1669438n,
          escrow: 20000n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 858895n,
          cumulativeInterest: 8333n,
          cumulativePrincipal: 830562n
        },
        {
          periodNumber: 2,
          paymentDate: new Date('2024-04-01T00:00:00.000Z'),
          beginningBalance: 1669438n,
          scheduledPayment: 838895n,
          interestPortion: 5565n,
          principalPortion: 833330n,
          extraPrincipal: 0n,
          totalPrincipal: 833330n,
          endingBalance: 836108n,
          escrow: 20000n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 858895n,
          cumulativeInterest: 13898n,
          cumulativePrincipal: 1663892n
        },
        {
          periodNumber: 3,
          paymentDate: new Date('2024-05-01T00:00:00.000Z'),
          beginningBalance: 836108n,
          scheduledPayment: 838895n,
          interestPortion: 2787n,
          principalPortion: 836108n,
          extraPrincipal: 0n,
          totalPrincipal: 836108n,
          endingBalance: 0n,
          escrow: 20000n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 858895n,
          cumulativeInterest: 16685n,
          cumulativePrincipal: 2500000n
        }
      ],
      summary: {
        totalInterest: 16685n,
        totalPrincipal: 2500000n,
        numberOfPayments: 3
      }
    }
  },
  {
    id: 'monthly_300k_6pct_30y_2026-01-01',
    description: '$300k at 6% for 30 years - totals verified vs MortgageCalculator.org (rounded monthly payment with final payment adjustment); Calculator.net totals differ slightly due to internal unrounded payment; Bankrate rounds to whole dollars',
    // Verification captures (2026-01-29):
    // - Calculator.net (Amortization Calculator):
    //   payment 1798.65
    //   total_interest 347514.57
    //   total_paid 647514.57
    //   num_payments 360
    // - Bankrate (Amortization Calculator; rounded to dollars):
    //   payment 1799
    //   total_interest 347515
    //   total_paid 647515
    //   num_payments 360
    //   payoff Jan 2056
    // - MortgageCalculator.org (Amortization Schedule):
    //   payment 1798.65
    //   total_interest 347515.44
    //   total_paid 647515.44
    //   num_payments 360
    //   final_payment 1800.09 (principal 1791.13, interest 8.96)
    // Notes:
    // - Some calculators compute using an unrounded payment (1798.651575...) internally, then display 1798.65,
    //   which explains the 0.87 difference vs Calculator.net totals.
    // - Our engine uses cents-rounded scheduled payments each month and forces payoff in the final period,
    //   matching MortgageCalculator.org totals exactly.
    loanParams: {
      principal: 30000000n, // $300,000.00
      annualRate: 0.06, // 6% APR
      termMonths: 360,
      firstPaymentDate: new Date('2026-02-01T00:00:00.000Z'),
      escrow: Money.ZERO,
      pmi: Money.ZERO,
      hoa: Money.ZERO
    },
    assumptions: Assumptions.STANDARD_MONTHLY,
    expected: {
      first3Rows: [
        {
          periodNumber: 1,
          paymentDate: new Date('2026-02-01T00:00:00.000Z'),
          beginningBalance: 30000000n,
          scheduledPayment: 179865n,
          interestPortion: 150000n,
          principalPortion: 29865n,
          extraPrincipal: 0n,
          totalPrincipal: 29865n,
          endingBalance: 29970135n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 179865n,
          cumulativeInterest: 150000n,
          cumulativePrincipal: 29865n
        },
        {
          periodNumber: 2,
          paymentDate: new Date('2026-03-01T00:00:00.000Z'),
          beginningBalance: 29970135n,
          scheduledPayment: 179865n,
          interestPortion: 149851n,
          principalPortion: 30014n,
          extraPrincipal: 0n,
          totalPrincipal: 30014n,
          endingBalance: 29940121n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 179865n,
          cumulativeInterest: 299851n,
          cumulativePrincipal: 59879n
        },
        {
          periodNumber: 3,
          paymentDate: new Date('2026-04-01T00:00:00.000Z'),
          beginningBalance: 29940121n,
          scheduledPayment: 179865n,
          interestPortion: 149701n,
          principalPortion: 30164n,
          extraPrincipal: 0n,
          totalPrincipal: 30164n,
          endingBalance: 29909957n,
          escrow: 0n,
          pmi: 0n,
          hoa: 0n,
          totalPayment: 179865n,
          cumulativeInterest: 449552n,
          cumulativePrincipal: 90043n
        }
      ],
      summary: {
        totalInterest: 34751544n,
        totalPrincipal: 30000000n,
        numberOfPayments: 360
      }
    }
  }
];
