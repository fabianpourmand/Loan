/**
 * Assumptions schema for mortgage calculations
 * Controls how amortization and payment application works
 */

import type { DayCountBasis, PaymentFrequency } from './dates';

/**
 * Amortization method
 * - monthly: Standard monthly compounding (most common)
 * - daily: Daily simple interest accrual
 */
export type AmortizationMethod = 'monthly' | 'daily';

/**
 * Payment application order
 * Defines how payments are applied to different loan components
 * Standard order: Interest -> Principal -> Escrow -> Fees
 */
export type PaymentApplicationOrder = 'standard' | 'custom';

/**
 * Payment application priority
 * Used for custom payment application orders
 */
export interface PaymentPriority {
  interest: number;
  principal: number;
  escrow: number;
  fees: number;
}

/**
 * Complete assumption set for mortgage calculations
 * This controls all aspects of how calculations are performed
 */
export interface AssumptionSet {
  /**
   * Human-readable name for this assumption set
   */
  name: string;

  /**
   * Amortization method
   */
  amortizationMethod: AmortizationMethod;

  /**
   * Day count convention for interest calculations
   * Only applies to daily accrual method
   */
  dayCountBasis: DayCountBasis;

  /**
   * Payment frequency
   */
  paymentFrequency: PaymentFrequency;

  /**
   * Payment application order
   */
  paymentApplicationOrder: PaymentApplicationOrder;

  /**
   * Custom payment priorities (if using custom order)
   */
  customPaymentPriority?: PaymentPriority;

  /**
   * Whether to include escrow in calculations
   */
  includeEscrow: boolean;

  /**
   * Whether to include PMI in calculations
   */
  includePMI: boolean;

  /**
   * Whether to include HOA fees in calculations
   */
  includeHOA: boolean;

  /**
   * Rounding method for interest calculations
   * - nearest: Round to nearest cent (default)
   * - down: Always round down
   * - up: Always round up
   */
  roundingMethod: 'nearest' | 'down' | 'up';
}

/**
 * Standard monthly amortization assumption set
 * Most common mortgage calculation method
 */
export const STANDARD_MONTHLY: AssumptionSet = {
  name: 'Standard Monthly',
  amortizationMethod: 'monthly',
  dayCountBasis: 'actual/365',
  paymentFrequency: 'monthly',
  paymentApplicationOrder: 'standard',
  includeEscrow: true,
  includePMI: false,
  includeHOA: false,
  roundingMethod: 'nearest'
};

/**
 * Daily accrual assumption set
 * Used for loans with daily simple interest
 */
export const DAILY_ACCRUAL_365: AssumptionSet = {
  name: 'Daily Accrual (365)',
  amortizationMethod: 'daily',
  dayCountBasis: 'actual/365',
  paymentFrequency: 'monthly',
  paymentApplicationOrder: 'standard',
  includeEscrow: true,
  includePMI: false,
  includeHOA: false,
  roundingMethod: 'nearest'
};

/**
 * Daily accrual with 360 day basis
 * Some lenders use 360-day year
 */
export const DAILY_ACCRUAL_360: AssumptionSet = {
  name: 'Daily Accrual (360)',
  amortizationMethod: 'daily',
  dayCountBasis: 'actual/360',
  paymentFrequency: 'monthly',
  paymentApplicationOrder: 'standard',
  includeEscrow: true,
  includePMI: false,
  includeHOA: false,
  roundingMethod: 'nearest'
};

/**
 * Bi-weekly payment assumption set
 */
export const BI_WEEKLY: AssumptionSet = {
  name: 'Bi-Weekly',
  amortizationMethod: 'monthly',
  dayCountBasis: 'actual/365',
  paymentFrequency: 'bi-weekly',
  paymentApplicationOrder: 'standard',
  includeEscrow: true,
  includePMI: false,
  includeHOA: false,
  roundingMethod: 'nearest'
};

/**
 * All predefined assumption sets
 */
export const PREDEFINED_ASSUMPTIONS: Record<string, AssumptionSet> = {
  'standard-monthly': STANDARD_MONTHLY,
  'daily-365': DAILY_ACCRUAL_365,
  'daily-360': DAILY_ACCRUAL_360,
  'bi-weekly': BI_WEEKLY
};

/**
 * Create a custom assumption set
 */
export function createCustomAssumptionSet(
  overrides: Partial<AssumptionSet>
): AssumptionSet {
  return {
    ...STANDARD_MONTHLY,
    ...overrides,
    name: overrides.name || 'Custom'
  };
}

/**
 * Validate an assumption set
 * Returns array of validation errors (empty if valid)
 */
export function validateAssumptionSet(assumptions: AssumptionSet): string[] {
  const errors: string[] = [];

  if (!assumptions.name || assumptions.name.trim() === '') {
    errors.push('Assumption set must have a name');
  }

  if (assumptions.amortizationMethod === 'daily') {
    if (!assumptions.dayCountBasis) {
      errors.push('Day count basis is required for daily amortization');
    }
  }

  if (
    assumptions.paymentApplicationOrder === 'custom' &&
    !assumptions.customPaymentPriority
  ) {
    errors.push('Custom payment priority is required for custom payment order');
  }

  return errors;
}

/**
 * Check if two assumption sets are equivalent
 */
export function areAssumptionsEqual(a: AssumptionSet, b: AssumptionSet): boolean {
  return (
    a.amortizationMethod === b.amortizationMethod &&
    a.dayCountBasis === b.dayCountBasis &&
    a.paymentFrequency === b.paymentFrequency &&
    a.paymentApplicationOrder === b.paymentApplicationOrder &&
    a.includeEscrow === b.includeEscrow &&
    a.includePMI === b.includePMI &&
    a.includeHOA === b.includeHOA &&
    a.roundingMethod === b.roundingMethod
  );
}

/**
 * Get a summary description of an assumption set
 */
export function getAssumptionSummary(assumptions: AssumptionSet): string {
  const parts: string[] = [];

  parts.push(
    assumptions.amortizationMethod === 'monthly'
      ? 'Monthly Amortization'
      : `Daily Accrual (${assumptions.dayCountBasis})`
  );

  if (assumptions.paymentFrequency !== 'monthly') {
    parts.push(
      assumptions.paymentFrequency === 'bi-weekly' ? 'Bi-Weekly Payments' : 'Weekly Payments'
    );
  }

  const extras: string[] = [];
  if (assumptions.includeEscrow) extras.push('Escrow');
  if (assumptions.includePMI) extras.push('PMI');
  if (assumptions.includeHOA) extras.push('HOA');

  if (extras.length > 0) {
    parts.push(`Including: ${extras.join(', ')}`);
  }

  return parts.join(' | ');
}
