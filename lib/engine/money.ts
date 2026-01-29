/**
 * Money module - All monetary values as bigint cents
 * NO FLOATING POINT for money operations
 */

export type Money = bigint;

/**
 * Rate scaling factor for fixed-point interest rate arithmetic
 * Using parts-per-billion (1e9) for high precision
 */
const RATE_SCALE = 1000000000n; // 1e9

/**
 * Convert a decimal interest rate to parts-per-billion (ppb) as BigInt
 * @param rate - Annual interest rate as decimal (e.g., 0.065 for 6.5%)
 * @returns Rate in parts-per-billion as BigInt
 */
function rateToPpb(rate: number): bigint {
  if (!Number.isFinite(rate)) {
    throw new Error('Interest rate must be finite');
  }
  if (rate < 0) {
    throw new Error('Interest rate cannot be negative');
  }
  if (rate > 2) {
    throw new Error('Interest rate cannot exceed 200%');
  }
  return BigInt(Math.round(rate * 1e9));
}

/**
 * Multiply two BigInts and divide by a denominator with half-up rounding
 * Used for fixed-point arithmetic in interest calculations
 * @param a - First multiplicand
 * @param b - Second multiplicand
 * @param denom - Denominator
 * @returns (a * b + denom/2) / denom (rounded half-up)
 */
function mulDivRoundHalfUp(a: bigint, b: bigint, denom: bigint): bigint {
  if (denom <= 0n) {
    throw new Error('Denominator must be positive');
  }
  const prod = a * b;
  return (prod + denom / 2n) / denom;
}

/**
 * Convert dollars (as number) to Money (cents as bigint)
 * @param dollars - Dollar amount (can have decimals)
 * @returns Money in cents
 */
export function fromDollars(dollars: number): Money {
  // Round to nearest cent to avoid floating point precision issues
  const cents = Math.round(dollars * 100);
  return BigInt(cents);
}

/**
 * Convert Money (cents as bigint) to dollars (as number)
 * Use only for display purposes
 * @param money - Money in cents
 * @returns Dollar amount
 */
export function toDollars(money: Money): number {
  return Number(money) / 100;
}

/**
 * Add two money values
 */
export function add(a: Money, b: Money): Money {
  return a + b;
}

/**
 * Subtract two money values
 */
export function subtract(a: Money, b: Money): Money {
  return a - b;
}

/**
 * Multiply money by a scalar factor
 * Rounds to nearest cent
 * @param money - Money in cents
 * @param factor - Scalar multiplier
 */
export function multiply(money: Money, factor: number): Money {
  const cents = Number(money) * factor;
  return BigInt(Math.round(cents));
}

/**
 * Divide money by a scalar divisor
 * Rounds to nearest cent
 * @param money - Money in cents
 * @param divisor - Scalar divisor
 */
export function divide(money: Money, divisor: number): Money {
  if (divisor === 0) throw new Error('Division by zero');
  const cents = Number(money) / divisor;
  return BigInt(Math.round(cents));
}

/**
 * Calculate interest using BigInt fixed-point arithmetic (no floating point)
 * Uses parts-per-billion scaling for precise rate calculations
 * Rounds to nearest cent (half-up rounding)
 *
 * @param principal - Principal amount in cents
 * @param annualRate - Annual interest rate as decimal (e.g., 0.065 for 6.5%)
 * @param periods - Number of periods per year (12 for monthly, 365 for daily)
 * @returns Interest amount in cents
 */
export function calculateInterest(
  principal: Money,
  annualRate: number,
  periods: number = 12
): Money {
  // Validate periods parameter
  if (!Number.isFinite(periods)) {
    throw new Error('Periods must be a positive integer');
  }
  if (!Number.isInteger(periods)) {
    throw new Error('Periods must be a positive integer');
  }
  if (periods <= 0) {
    throw new Error('Periods must be a positive integer');
  }

  const ratePpb = rateToPpb(annualRate);
  const denom = BigInt(periods) * RATE_SCALE;
  const interest = mulDivRoundHalfUp(principal, ratePpb, denom);
  return interest;
}

/**
 * Calculate daily interest using BigInt fixed-point arithmetic (no floating point)
 * Uses parts-per-billion scaling for precise rate calculations
 * Rounds to nearest cent (half-up rounding)
 *
 * @param principal - Principal amount in cents
 * @param annualRate - Annual interest rate as decimal
 * @param days - Number of days
 * @param dayCountBasis - Day count convention (365 or 360)
 * @returns Interest amount in cents
 */
export function calculateDailyInterest(
  principal: Money,
  annualRate: number,
  days: number,
  dayCountBasis: number = 365
): Money {
  // Validate days parameter
  if (!Number.isFinite(days)) {
    throw new Error('Days must be a non-negative integer');
  }
  if (!Number.isInteger(days)) {
    throw new Error('Days must be a non-negative integer');
  }
  if (days < 0) {
    throw new Error('Days must be a non-negative integer');
  }

  // Validate dayCountBasis parameter
  if (!Number.isFinite(dayCountBasis)) {
    throw new Error('Day count basis must be a positive integer');
  }
  if (!Number.isInteger(dayCountBasis)) {
    throw new Error('Day count basis must be a positive integer');
  }
  if (dayCountBasis <= 0) {
    throw new Error('Day count basis must be a positive integer');
  }

  const ratePpb = rateToPpb(annualRate);
  const denom = BigInt(dayCountBasis) * RATE_SCALE;
  const numer = principal * ratePpb * BigInt(days);
  return (numer + denom / 2n) / denom;
}

/**
 * Compare two money values
 */
export function isEqual(a: Money, b: Money): boolean {
  return a === b;
}

export function isGreaterThan(a: Money, b: Money): boolean {
  return a > b;
}

export function isLessThan(a: Money, b: Money): boolean {
  return a < b;
}

export function isGreaterThanOrEqual(a: Money, b: Money): boolean {
  return a >= b;
}

export function isLessThanOrEqual(a: Money, b: Money): boolean {
  return a <= b;
}

/**
 * Return the minimum of two money values
 */
export function min(a: Money, b: Money): Money {
  return a < b ? a : b;
}

/**
 * Return the maximum of two money values
 */
export function max(a: Money, b: Money): Money {
  return a > b ? a : b;
}

/**
 * Return absolute value
 */
export function abs(money: Money): Money {
  return money < 0n ? -money : money;
}

/**
 * Format money for display
 * @param money - Money in cents
 * @param includeDollarSign - Whether to include $ sign
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function format(money: Money, includeDollarSign: boolean = true): string {
  const dollars = toDollars(money);
  const isNegative = dollars < 0;
  const absoluteDollars = Math.abs(dollars);

  const formatted = absoluteDollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const sign = isNegative ? '-' : '';
  const dollarSign = includeDollarSign ? '$' : '';

  return `${sign}${dollarSign}${formatted}`;
}

/**
 * Zero money value
 */
export const ZERO: Money = 0n;

/**
 * One cent
 */
export const ONE_CENT: Money = 1n;

/**
 * One dollar
 */
export const ONE_DOLLAR: Money = 100n;
