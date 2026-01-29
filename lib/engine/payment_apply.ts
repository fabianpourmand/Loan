/**
 * Payment application logic
 * Determines how payments are split between interest, principal, escrow, fees
 */

import type { Money } from './money';
import * as Money from './money';
import type { AssumptionSet } from './assumptions';

/**
 * Components of a loan payment
 */
export interface PaymentComponents {
  /** Scheduled payment amount (P&I only) */
  scheduledPayment: Money;
  /** Extra principal payment (optional) */
  extraPrincipal?: Money;
  /** Escrow payment (optional) */
  escrow?: Money;
  /** PMI payment (optional) */
  pmi?: Money;
  /** HOA payment (optional) */
  hoa?: Money;
  /** Late fees or other charges (optional) */
  fees?: Money;
}

/**
 * Breakdown of how a payment was applied
 */
export interface PaymentBreakdown {
  /** Total payment amount */
  totalPayment: Money;

  /** Amount applied to interest */
  interestPortion: Money;

  /** Amount applied to principal */
  principalPortion: Money;

  /** Amount applied to extra principal */
  extraPrincipalPortion: Money;

  /** Amount applied to escrow */
  escrowPortion: Money;

  /** Amount applied to PMI */
  pmiPortion: Money;

  /** Amount applied to HOA */
  hoaPortion: Money;

  /** Amount applied to fees */
  feesPortion: Money;

  /** Remaining payment amount (should be 0 if fully applied) */
  remaining: Money;

  /** New principal balance after this payment */
  newBalance: Money;

  /** Whether this was a partial payment (didn't cover interest) */
  isPartialPayment: boolean;
}

/**
 * Loan state for payment application
 */
export interface LoanState {
  /** Current principal balance */
  balance: Money;

  /** Interest accrued since last payment */
  accruedInterest: Money;
}

/**
 * Apply a payment to a loan following standard payment waterfall
 *
 * Standard order (per assumptions):
 * 1. Fees (late fees, etc.)
 * 2. Interest (accrued)
 * 3. Principal (scheduled)
 * 4. Extra Principal (optional)
 * 5. Escrow (if included)
 * 6. PMI (if included)
 * 7. HOA (if included)
 *
 * @param loanState - Current loan state
 * @param components - Payment components
 * @param assumptions - Assumption set
 * @returns Payment breakdown
 */
export function applyPayment(
  loanState: LoanState,
  components: PaymentComponents,
  assumptions: AssumptionSet
): PaymentBreakdown {
  // Track P&I remaining separately (scheduledPayment is P&I only)
  let piRemaining = components.scheduledPayment;

  // Initialize breakdown
  const breakdown: PaymentBreakdown = {
    totalPayment: components.scheduledPayment,
    interestPortion: Money.ZERO,
    principalPortion: Money.ZERO,
    extraPrincipalPortion: Money.ZERO,
    escrowPortion: Money.ZERO,
    pmiPortion: Money.ZERO,
    hoaPortion: Money.ZERO,
    feesPortion: Money.ZERO,
    remaining: Money.ZERO,
    newBalance: loanState.balance,
    isPartialPayment: false
  };

  // Add optional components to totalPayment
  if (components.extraPrincipal) {
    breakdown.totalPayment = Money.add(
      breakdown.totalPayment,
      components.extraPrincipal
    );
  }
  if (components.escrow) {
    breakdown.totalPayment = Money.add(breakdown.totalPayment, components.escrow);
  }
  if (components.pmi) {
    breakdown.totalPayment = Money.add(breakdown.totalPayment, components.pmi);
  }
  if (components.hoa) {
    breakdown.totalPayment = Money.add(breakdown.totalPayment, components.hoa);
  }
  if (components.fees) {
    breakdown.totalPayment = Money.add(breakdown.totalPayment, components.fees);
  }

  // Step 1: Apply fees (separate from P&I bucket - fees are extra cash in totalPayment)
  if (components.fees && Money.isGreaterThan(components.fees, Money.ZERO)) {
    breakdown.feesPortion = components.fees;
  }

  // Step 2: Apply to interest (from scheduledPayment)
  const interestToPay = Money.min(piRemaining, loanState.accruedInterest);
  breakdown.interestPortion = interestToPay;
  piRemaining = Money.subtract(piRemaining, interestToPay);

  // Check if payment didn't cover full interest (partial payment)
  if (Money.isLessThan(interestToPay, loanState.accruedInterest)) {
    breakdown.isPartialPayment = true;
    breakdown.newBalance = loanState.balance; // Balance doesn't change

    // In partial payment, extra principal is NOT applied
    // Escrow/PMI/HOA are also NOT applied (servicer typically returns these)

    // Calculate remaining: totalPayment - what was applied
    const appliedTotal = Money.add(breakdown.feesPortion, breakdown.interestPortion);
    breakdown.remaining = Money.subtract(breakdown.totalPayment, appliedTotal);

    return breakdown;
  }

  // Step 3: Apply to principal (from scheduledPayment, up to balance)
  const principalToPay = Money.min(piRemaining, loanState.balance);
  breakdown.principalPortion = principalToPay;
  piRemaining = Money.subtract(piRemaining, principalToPay);

  // Update balance
  breakdown.newBalance = Money.subtract(loanState.balance, principalToPay);

  // Step 4: Apply extra principal (only if P&I was satisfied)
  if (components.extraPrincipal && Money.isGreaterThan(components.extraPrincipal, Money.ZERO)) {
    const extraToPay = Money.min(components.extraPrincipal, breakdown.newBalance);
    breakdown.extraPrincipalPortion = extraToPay;
    breakdown.newBalance = Money.subtract(breakdown.newBalance, extraToPay);
  }

  // Step 5-7: Apply escrow, PMI, HOA (only if assumptions enable AND amounts provided)
  if (
    assumptions.includeEscrow &&
    components.escrow &&
    Money.isGreaterThan(components.escrow, Money.ZERO)
  ) {
    breakdown.escrowPortion = components.escrow;
  }

  if (
    assumptions.includePMI &&
    components.pmi &&
    Money.isGreaterThan(components.pmi, Money.ZERO)
  ) {
    breakdown.pmiPortion = components.pmi;
  }

  if (
    assumptions.includeHOA &&
    components.hoa &&
    Money.isGreaterThan(components.hoa, Money.ZERO)
  ) {
    breakdown.hoaPortion = components.hoa;
  }

  // Calculate remaining: totalPayment - all applied portions
  const appliedTotal = Money.add(
    breakdown.feesPortion,
    Money.add(
      breakdown.interestPortion,
      Money.add(
        breakdown.principalPortion,
        Money.add(
          breakdown.extraPrincipalPortion,
          Money.add(
            breakdown.escrowPortion,
            Money.add(breakdown.pmiPortion, breakdown.hoaPortion)
          )
        )
      )
    )
  );

  breakdown.remaining = Money.subtract(breakdown.totalPayment, appliedTotal);

  return breakdown;
}

/**
 * Calculate scheduled payment (P&I) for a fixed-rate loan
 * Uses standard mortgage payment formula
 *
 * @param principal - Loan principal
 * @param annualRate - Annual interest rate (as decimal, e.g., 0.065)
 * @param numberOfPayments - Total number of payments
 * @returns Monthly payment amount
 */
export function calculateScheduledPayment(
  principal: Money,
  annualRate: number,
  numberOfPayments: number
): Money {
  if (numberOfPayments <= 0) {
    throw new Error('Number of payments must be positive');
  }

  // Handle 0% interest rate edge case
  if (annualRate === 0) {
    return Money.divide(principal, numberOfPayments);
  }

  const monthlyRate = annualRate / 12;
  const principalDollars = Money.toDollars(principal);

  // Standard mortgage formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const rateOnePlusR = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
  const onePlusRn = Math.pow(1 + monthlyRate, numberOfPayments);
  const payment = principalDollars * (rateOnePlusR / (onePlusRn - 1));

  return Money.fromDollars(payment);
}

/**
 * Validate payment components
 * Returns array of validation errors
 */
export function validatePaymentComponents(
  components: PaymentComponents
): string[] {
  const errors: string[] = [];

  if (Money.isLessThan(components.scheduledPayment, Money.ZERO)) {
    errors.push('Scheduled payment cannot be negative');
  }

  if (
    components.extraPrincipal &&
    Money.isLessThan(components.extraPrincipal, Money.ZERO)
  ) {
    errors.push('Extra principal cannot be negative');
  }

  if (components.escrow && Money.isLessThan(components.escrow, Money.ZERO)) {
    errors.push('Escrow cannot be negative');
  }

  if (components.pmi && Money.isLessThan(components.pmi, Money.ZERO)) {
    errors.push('PMI cannot be negative');
  }

  if (components.hoa && Money.isLessThan(components.hoa, Money.ZERO)) {
    errors.push('HOA cannot be negative');
  }

  if (components.fees && Money.isLessThan(components.fees, Money.ZERO)) {
    errors.push('Fees cannot be negative');
  }

  return errors;
}
