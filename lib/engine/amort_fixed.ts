/**
 * Fixed-rate monthly amortization calculator
 * Standard mortgage calculation method (most common)
 */

import type { Money } from './money';
import * as Money from './money';
import * as Dates from './dates';
import type { AssumptionSet } from './assumptions';
import * as PaymentApply from './payment_apply';

/**
 * Loan parameters for amortization
 */
export interface LoanParameters {
  /** Initial principal balance */
  principal: Money;

  /** Annual interest rate (as decimal, e.g., 0.065 for 6.5%) */
  annualRate: number;

  /** Term in months */
  termMonths: number;

  /** First payment date */
  firstPaymentDate: Date;

  /** Monthly escrow amount (optional) */
  escrow?: Money;

  /** Monthly PMI amount (optional) */
  pmi?: Money;

  /** Monthly HOA amount (optional) */
  hoa?: Money;
}

/**
 * Extra payment schedule
 * Allows modeling of extra principal payments
 */
export interface ExtraPayment {
  /** Payment number (1-indexed) */
  paymentNumber: number;

  /** Extra principal amount */
  amount: Money;
}

/**
 * Single period in amortization schedule
 */
export interface AmortizationPeriod {
  /** Period number (1-indexed) */
  periodNumber: number;

  /** Payment date */
  paymentDate: Date;

  /** Beginning balance for this period */
  beginningBalance: Money;

  /** Scheduled payment amount (P&I only) */
  scheduledPayment: Money;

  /** Interest portion */
  interestPortion: Money;

  /** Principal portion */
  principalPortion: Money;

  /** Extra principal payment (if any) */
  extraPrincipal: Money;

  /** Total principal paid this period */
  totalPrincipal: Money;

  /** Ending balance after this payment */
  endingBalance: Money;

  /** Escrow portion (if included) */
  escrow: Money;

  /** PMI portion (if included) */
  pmi: Money;

  /** HOA portion (if included) */
  hoa: Money;

  /** Total payment (including escrow, PMI, HOA) */
  totalPayment: Money;

  /** Cumulative interest paid through this period */
  cumulativeInterest: Money;

  /** Cumulative principal paid through this period */
  cumulativePrincipal: Money;
}

/**
 * Complete amortization schedule
 */
export interface AmortizationSchedule {
  /** Loan parameters */
  parameters: LoanParameters;

  /** Assumption set used */
  assumptions: AssumptionSet;

  /** Scheduled payment amount */
  scheduledPayment: Money;

  /** All periods in the schedule */
  periods: AmortizationPeriod[];

  /** Summary statistics */
  summary: {
    /** Total interest paid over life of loan */
    totalInterest: Money;

    /** Total principal paid (should equal initial principal) */
    totalPrincipal: Money;

    /** Total payments (P&I only) */
    totalPayments: Money;

    /** Total paid including escrow, PMI, HOA */
    totalPaidWithEscrow: Money;

    /** Number of payments to payoff */
    numberOfPayments: number;

    /** Payoff date */
    payoffDate: Date;
  };
}

/**
 * Generate amortization schedule for fixed-rate loan
 *
 * @param params - Loan parameters
 * @param assumptions - Assumption set (must use monthly amortization)
 * @param extraPayments - Optional extra payment schedule
 * @returns Complete amortization schedule
 */
export function generateSchedule(
  params: LoanParameters,
  assumptions: AssumptionSet,
  extraPayments: ExtraPayment[] = []
): AmortizationSchedule {
  // Validate assumptions
  if (assumptions.amortizationMethod !== 'monthly') {
    throw new Error('amort_fixed requires monthly amortization method');
  }

  if (assumptions.paymentFrequency !== 'monthly') {
    throw new Error('amort_fixed only supports monthly payment frequency');
  }

  // Calculate scheduled payment
  const scheduledPayment = PaymentApply.calculateScheduledPayment(
    params.principal,
    params.annualRate,
    params.termMonths
  );

  // Build extra payment lookup
  const extraPaymentMap = new Map<number, Money>();
  extraPayments.forEach((ep) => {
    extraPaymentMap.set(ep.paymentNumber, ep.amount);
  });

  // Generate schedule
  const periods: AmortizationPeriod[] = [];
  let currentBalance = params.principal;
  let currentDate = new Date(params.firstPaymentDate);
  let cumulativeInterest = Money.ZERO;
  let cumulativePrincipal = Money.ZERO;
  let periodNumber = 1;

  // Contract: Generate exactly termMonths periods (or fewer if extra payments pay off early)
  while (Money.isGreaterThan(currentBalance, Money.ZERO) && periodNumber <= params.termMonths) {
    // Calculate interest for this period
    const interest = Money.calculateInterest(currentBalance, params.annualRate, 12);

    // Get extra principal for this period
    const extraPrincipal = extraPaymentMap.get(periodNumber) || Money.ZERO;

    // Determine actual payment amount
    let actualPayment = scheduledPayment;

    // If this is the final period (termMonths), force payoff
    if (periodNumber === params.termMonths) {
      // Calculate exact payment needed to bring balance to zero
      // Payment must cover interest plus remaining principal
      const payoffAmount = Money.add(interest, currentBalance);
      actualPayment = payoffAmount;
    } else {
      // For non-final periods, use regular scheduled payment
      // unless loan would be paid off early (due to extra payments)
      const totalOwed = Money.add(interest, currentBalance);
      if (Money.isLessThan(totalOwed, scheduledPayment)) {
        // Early payoff: only pay what's needed
        actualPayment = totalOwed;
      }
    }

    // Apply payment
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: actualPayment,
      extraPrincipal: extraPrincipal,
      escrow: params.escrow,
      pmi: params.pmi,
      hoa: params.hoa
    };

    const breakdown = PaymentApply.applyPayment(
      {
        balance: currentBalance,
        accruedInterest: interest
      },
      components,
      assumptions
    );

    // Create period record
    const totalPrincipal = Money.add(
      breakdown.principalPortion,
      breakdown.extraPrincipalPortion
    );

    cumulativeInterest = Money.add(cumulativeInterest, breakdown.interestPortion);
    cumulativePrincipal = Money.add(cumulativePrincipal, totalPrincipal);

    const period: AmortizationPeriod = {
      periodNumber,
      paymentDate: new Date(currentDate),
      beginningBalance: currentBalance,
      scheduledPayment: actualPayment,
      interestPortion: breakdown.interestPortion,
      principalPortion: breakdown.principalPortion,
      extraPrincipal: breakdown.extraPrincipalPortion,
      totalPrincipal,
      endingBalance: breakdown.newBalance,
      escrow: breakdown.escrowPortion,
      pmi: breakdown.pmiPortion,
      hoa: breakdown.hoaPortion,
      totalPayment: breakdown.totalPayment,
      cumulativeInterest,
      cumulativePrincipal
    };

    periods.push(period);

    // Move to next period
    currentBalance = breakdown.newBalance;
    currentDate = Dates.addMonths(currentDate, 1);
    periodNumber++;

    // Safety check: if balance is zero or negative, we're done
    if (Money.isLessThanOrEqual(currentBalance, Money.ZERO)) {
      break;
    }
  }

  // Calculate summary
  const lastPeriod = periods[periods.length - 1];
  const totalInterest = lastPeriod?.cumulativeInterest || Money.ZERO;
  const totalPrincipal = lastPeriod?.cumulativePrincipal || Money.ZERO;

  let totalPayments = Money.ZERO;
  let totalEscrow = Money.ZERO;
  let totalPMI = Money.ZERO;
  let totalHOA = Money.ZERO;

  periods.forEach((period) => {
    totalPayments = Money.add(
      totalPayments,
      Money.add(period.interestPortion, period.totalPrincipal)
    );
    totalEscrow = Money.add(totalEscrow, period.escrow);
    totalPMI = Money.add(totalPMI, period.pmi);
    totalHOA = Money.add(totalHOA, period.hoa);
  });

  const totalPaidWithEscrow = Money.add(
    totalPayments,
    Money.add(totalEscrow, Money.add(totalPMI, totalHOA))
  );

  return {
    parameters: params,
    assumptions,
    scheduledPayment,
    periods,
    summary: {
      totalInterest,
      totalPrincipal,
      totalPayments,
      totalPaidWithEscrow,
      numberOfPayments: periods.length,
      payoffDate: lastPeriod?.paymentDate || params.firstPaymentDate
    }
  };
}

/**
 * Get a specific period from the schedule
 */
export function getPeriod(
  schedule: AmortizationSchedule,
  periodNumber: number
): AmortizationPeriod | undefined {
  return schedule.periods.find((p) => p.periodNumber === periodNumber);
}

/**
 * Get balance at a specific period
 */
export function getBalanceAtPeriod(
  schedule: AmortizationSchedule,
  periodNumber: number
): Money {
  const period = getPeriod(schedule, periodNumber);
  return period ? period.endingBalance : Money.ZERO;
}

/**
 * Get total interest paid through a specific period
 */
export function getInterestPaidThrough(
  schedule: AmortizationSchedule,
  periodNumber: number
): Money {
  const period = getPeriod(schedule, periodNumber);
  return period ? period.cumulativeInterest : Money.ZERO;
}
