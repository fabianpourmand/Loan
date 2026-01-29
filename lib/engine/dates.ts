/**
 * Date utilities for mortgage calculations
 * Handles day count conventions and payment scheduling
 */

export type DayCountBasis = 'actual/365' | 'actual/360' | '30/360';
export type PaymentFrequency = 'monthly' | 'bi-weekly' | 'weekly';

/**
 * Calculate days between two dates (Actual/Actual)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates (inclusive of start, exclusive of end)
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set to midnight to avoid time zone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate day count fraction based on convention
 * Used for daily interest calculations
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param basis - Day count convention
 * @returns Day count fraction
 */
export function dayCountFraction(
  startDate: Date,
  endDate: Date,
  basis: DayCountBasis = 'actual/365'
): number {
  let numerator: number;
  let denominator: number;

  switch (basis) {
    case 'actual/365':
      numerator = daysBetween(startDate, endDate);
      denominator = 365;
      break;

    case 'actual/360':
      numerator = daysBetween(startDate, endDate);
      denominator = 360;
      break;

    case '30/360':
      numerator = days30_360(startDate, endDate);
      denominator = 360;
      break;

    default:
      throw new Error(`Unknown day count basis: ${basis}`);
  }

  return numerator / denominator;
}

/**
 * 30/360 day count calculation
 * Assumes each month has 30 days and year has 360 days
 * This is a common convention in some mortgages
 */
function days30_360(startDate: Date, endDate: Date): number {
  const d1 = Math.min(startDate.getDate(), 30);
  const d2 = Math.min(endDate.getDate(), 30);
  const m1 = startDate.getMonth() + 1;
  const m2 = endDate.getMonth() + 1;
  const y1 = startDate.getFullYear();
  const y2 = endDate.getFullYear();

  return 360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1);
}

/**
 * Add months to a date
 * Handles month-end edge cases (e.g., Jan 31 + 1 month = Feb 28/29)
 * Uses UTC methods to avoid DST-related drift
 *
 * @param date - Starting date
 * @param months - Number of months to add
 * @returns New date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const currentDay = result.getUTCDate();

  result.setUTCMonth(result.getUTCMonth() + months);

  // Handle month-end edge case: if day changed due to shorter month,
  // set to last day of the target month
  if (result.getUTCDate() !== currentDay) {
    result.setUTCDate(0); // Go to last day of previous month
  }

  return result;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add years to a date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Get the number of periods per year for a given frequency
 */
export function periodsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'monthly':
      return 12;
    case 'bi-weekly':
      return 26;
    case 'weekly':
      return 52;
    default:
      throw new Error(`Unknown payment frequency: ${frequency}`);
  }
}

/**
 * Calculate next payment date based on frequency
 *
 * @param currentDate - Current payment date
 * @param frequency - Payment frequency
 * @returns Next payment date
 */
export function nextPaymentDate(
  currentDate: Date,
  frequency: PaymentFrequency
): Date {
  switch (frequency) {
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'bi-weekly':
      return addDays(currentDate, 14);
    case 'weekly':
      return addDays(currentDate, 7);
    default:
      throw new Error(`Unknown payment frequency: ${frequency}`);
  }
}

/**
 * Generate payment schedule dates
 *
 * @param startDate - First payment date
 * @param numberOfPayments - Total number of payments
 * @param frequency - Payment frequency
 * @returns Array of payment dates
 */
export function generatePaymentSchedule(
  startDate: Date,
  numberOfPayments: number,
  frequency: PaymentFrequency = 'monthly'
): Date[] {
  const schedule: Date[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < numberOfPayments; i++) {
    schedule.push(new Date(currentDate));
    currentDate = nextPaymentDate(currentDate, frequency);
  }

  return schedule;
}

/**
 * Calculate remaining term in months
 *
 * @param currentDate - Current date
 * @param maturityDate - Loan maturity date
 * @returns Remaining months (rounded)
 */
export function remainingTermMonths(
  currentDate: Date,
  maturityDate: Date
): number {
  const years =
    maturityDate.getFullYear() - currentDate.getFullYear();
  const months =
    maturityDate.getMonth() - currentDate.getMonth();

  return years * 12 + months;
}

/**
 * Check if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get days in year (365 or 366 for leap year)
 */
export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from YYYY-MM-DD string
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
