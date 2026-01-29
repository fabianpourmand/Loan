/**
 * Daily simple interest amortization calculator
 * Interest accrues daily; payment date affects interest calculation
 */

import type { Money } from './money';
import * as Money from './money';
import * as Dates from './dates';
import type { AssumptionSet } from './assumptions';
import * as PaymentApply from './payment_apply';

/**
 * Re-export types from amort_fixed for consistency
 */
export type {
  LoanParameters,
  ExtraPayment,
  AmortizationPeriod,
  AmortizationSchedule
} from './amort_fixed';

import type {
  LoanParameters,
  ExtraPayment,
  AmortizationPeriod,
  AmortizationSchedule
} from './amort_fixed';

/**
 * Generate amortization schedule for daily simple interest loan
 *
 * @param params - Loan parameters
 * @param assumptions - Assumption set (must use daily amortization)
 * @param extraPayments - Optional extra payment schedule
 * @param lastPaymentDate - Date of last payment (for calculating days since last payment)
 * @returns Complete amortization schedule
 */
export function generateSchedule(
  params: LoanParameters,
  assumptions: AssumptionSet,
  extraPayments: ExtraPayment[] = [],
  lastPaymentDate?: Date
): AmortizationSchedule {
  // Validate assumptions
  if (assumptions.amortizationMethod !== 'daily') {
    throw new Error('amort_daily requires daily amortization method');
  }

  if (assumptions.paymentFrequency !== 'monthly') {
    throw new Error('amort_daily only supports monthly payment frequency');
  }

  // Calculate scheduled payment using standard formula
  // (same as monthly, but interest accrues differently)
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

  // Convert day count basis to numeric denominator
  const dayCountDenom = assumptions.dayCountBasis === 'actual/360' ? 360 : 365;

  // Generate schedule
  const periods: AmortizationPeriod[] = [];
  let currentBalance = params.principal;
  let currentDate = new Date(params.firstPaymentDate);
  let lastEventDate = lastPaymentDate || new Date(params.firstPaymentDate);
  let cumulativeInterest = Money.ZERO;
  let cumulativePrincipal = Money.ZERO;
  let periodNumber = 1;

  while (Money.isGreaterThan(currentBalance, Money.ZERO) && periodNumber <= params.termMonths * 2) {
    // Calculate days between last event and current payment date
    const days = Dates.daysBetween(lastEventDate, currentDate);

    // Calculate interest accrued over this period (daily simple interest)
    const interest = Money.calculateDailyInterest(
      currentBalance,
      params.annualRate,
      days,
      dayCountDenom
    );

    // Get extra principal for this period
    const extraPrincipal = extraPaymentMap.get(periodNumber) || Money.ZERO;

    // Determine actual payment amount (may be less than scheduled for final payment)
    let actualPayment = scheduledPayment;
    const totalOwed = Money.add(interest, currentBalance);
    if (Money.isLessThan(totalOwed, scheduledPayment)) {
      // Final payment: only pay what's needed
      actualPayment = totalOwed;
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
    lastEventDate = new Date(currentDate);
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
