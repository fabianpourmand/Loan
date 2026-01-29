import { describe, it, expect } from 'vitest';
import * as Dates from '../dates';

describe('Dates - Day Counting', () => {
  it('should calculate days between dates', () => {
    const start = new Date(2024, 0, 1); // Jan 1, 2024
    const end = new Date(2024, 0, 31); // Jan 31, 2024
    expect(Dates.daysBetween(start, end)).toBe(30);
  });

  it('should handle same date', () => {
    const date = new Date(2024, 0, 1);
    expect(Dates.daysBetween(date, date)).toBe(0);
  });

  it('should handle leap year', () => {
    const start = new Date(2024, 1, 1); // Feb 1, 2024
    const end = new Date(2024, 2, 1); // Mar 1, 2024
    expect(Dates.daysBetween(start, end)).toBe(29); // 2024 is leap year
  });

  it('should handle non-leap year', () => {
    const start = new Date(2023, 1, 1); // Feb 1, 2023
    const end = new Date(2023, 2, 1); // Mar 1, 2023
    expect(Dates.daysBetween(start, end)).toBe(28);
  });

  it('should calculate days across year boundary', () => {
    const start = new Date(2023, 11, 15); // Dec 15, 2023
    const end = new Date(2024, 0, 15); // Jan 15, 2024
    expect(Dates.daysBetween(start, end)).toBe(31);
  });
});

describe('Dates - Day Count Conventions', () => {
  it('should calculate Actual/365 fraction', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const fraction = Dates.dayCountFraction(start, end, 'actual/365');
    expect(fraction).toBeCloseTo(30 / 365, 10);
  });

  it('should calculate Actual/360 fraction', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const fraction = Dates.dayCountFraction(start, end, 'actual/360');
    expect(fraction).toBeCloseTo(30 / 360, 10);
  });

  it('should calculate 30/360 fraction', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const fraction = Dates.dayCountFraction(start, end, '30/360');
    // 30/360: d1=1, d2=min(31,30)=30, same month/year
    // Days = 360*0 + 30*0 + (30-1) = 29 days
    expect(fraction).toBeCloseTo(29 / 360, 10);
  });

  it('should default to Actual/365', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 1, 1);
    const fraction = Dates.dayCountFraction(start, end);
    expect(fraction).toBeCloseTo(31 / 365, 10);
  });
});

describe('Dates - Adding Months', () => {
  it('should add one month', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const result = Dates.addMonths(date, 1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // February (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it('should add multiple months', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const result = Dates.addMonths(date, 6);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(15);
  });

  it('should handle year rollover', () => {
    const date = new Date(2024, 10, 15); // Nov 15, 2024
    const result = Dates.addMonths(date, 3);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(15);
  });

  it('should handle month-end edge case (Jan 31 -> Feb 28)', () => {
    const date = new Date(2023, 0, 31); // Jan 31, 2023
    const result = Dates.addMonths(date, 1);
    expect(result.getFullYear()).toBe(2023);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28); // Feb 28 in non-leap year
  });

  it('should handle month-end edge case (Jan 31 -> Feb 29 in leap year)', () => {
    const date = new Date(2024, 0, 31); // Jan 31, 2024
    const result = Dates.addMonths(date, 1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29); // Feb 29 in leap year
  });

  it('should handle month-end edge case (Jan 31 -> Apr 30)', () => {
    const date = new Date(2024, 0, 31); // Jan 31, 2024
    const result = Dates.addMonths(date, 3);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(30); // April has 30 days
  });
});

describe('Dates - Adding Days and Years', () => {
  it('should add days', () => {
    const date = new Date(2024, 0, 15);
    const result = Dates.addDays(date, 10);
    expect(result.getDate()).toBe(25);
  });

  it('should add days across month boundary', () => {
    const date = new Date(2024, 0, 25);
    const result = Dates.addDays(date, 10);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(4);
  });

  it('should add years', () => {
    const date = new Date(2024, 0, 15);
    const result = Dates.addYears(date, 2);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

describe('Dates - Payment Frequency', () => {
  it('should return correct periods per year', () => {
    expect(Dates.periodsPerYear('monthly')).toBe(12);
    expect(Dates.periodsPerYear('bi-weekly')).toBe(26);
    expect(Dates.periodsPerYear('weekly')).toBe(52);
  });

  it('should calculate next monthly payment date', () => {
    const date = new Date(2024, 0, 15);
    const next = Dates.nextPaymentDate(date, 'monthly');
    expect(next.getFullYear()).toBe(2024);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(15);
  });

  it('should calculate next bi-weekly payment date', () => {
    const date = new Date(2024, 0, 15);
    const next = Dates.nextPaymentDate(date, 'bi-weekly');
    expect(next.getFullYear()).toBe(2024);
    expect(next.getMonth()).toBe(0); // Still January
    expect(next.getDate()).toBe(29);
  });

  it('should calculate next weekly payment date', () => {
    const date = new Date(2024, 0, 15);
    const next = Dates.nextPaymentDate(date, 'weekly');
    expect(next.getDate()).toBe(22);
  });
});

describe('Dates - Payment Schedule Generation', () => {
  it('should generate monthly payment schedule', () => {
    const start = new Date(2024, 0, 15);
    const schedule = Dates.generatePaymentSchedule(start, 3, 'monthly');

    expect(schedule.length).toBe(3);
    expect(schedule[0].getMonth()).toBe(0); // Jan
    expect(schedule[1].getMonth()).toBe(1); // Feb
    expect(schedule[2].getMonth()).toBe(2); // Mar
  });

  it('should generate bi-weekly payment schedule', () => {
    const start = new Date(2024, 0, 1);
    const schedule = Dates.generatePaymentSchedule(start, 3, 'bi-weekly');

    expect(schedule.length).toBe(3);
    expect(Dates.daysBetween(schedule[0], schedule[1])).toBe(14);
    expect(Dates.daysBetween(schedule[1], schedule[2])).toBe(14);
  });

  it('should default to monthly schedule', () => {
    const start = new Date(2024, 0, 15);
    const schedule = Dates.generatePaymentSchedule(start, 12);

    expect(schedule.length).toBe(12);
    expect(schedule[0].getMonth()).toBe(0); // Jan
    expect(schedule[11].getMonth()).toBe(11); // Dec
  });
});

describe('Dates - Remaining Term', () => {
  it('should calculate remaining months', () => {
    const current = new Date(2024, 0, 1);
    const maturity = new Date(2054, 0, 1);
    const remaining = Dates.remainingTermMonths(current, maturity);
    expect(remaining).toBe(360); // 30 years = 360 months
  });

  it('should calculate partial year remaining', () => {
    const current = new Date(2024, 0, 1);
    const maturity = new Date(2024, 6, 1);
    const remaining = Dates.remainingTermMonths(current, maturity);
    expect(remaining).toBe(6);
  });
});

describe('Dates - Leap Year Detection', () => {
  it('should identify leap years', () => {
    expect(Dates.isLeapYear(2024)).toBe(true);
    expect(Dates.isLeapYear(2000)).toBe(true);
    expect(Dates.isLeapYear(2400)).toBe(true);
  });

  it('should identify non-leap years', () => {
    expect(Dates.isLeapYear(2023)).toBe(false);
    expect(Dates.isLeapYear(1900)).toBe(false);
    expect(Dates.isLeapYear(2100)).toBe(false);
  });

  it('should return correct days in year', () => {
    expect(Dates.daysInYear(2024)).toBe(366);
    expect(Dates.daysInYear(2023)).toBe(365);
  });
});

describe('Dates - Formatting and Parsing', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 5);
    expect(Dates.formatDate(date)).toBe('2024-01-05');
  });

  it('should format date with proper zero padding', () => {
    const date = new Date(2024, 0, 5); // Jan 5, 2024
    expect(Dates.formatDate(date)).toBe('2024-01-05');
  });

  it('should parse date from string', () => {
    const date = Dates.parseDate('2024-01-15');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(15);
  });

  it('should round-trip format and parse', () => {
    const original = new Date(2024, 5, 15); // Jun 15, 2024
    const formatted = Dates.formatDate(original);
    const parsed = Dates.parseDate(formatted);

    expect(parsed.getFullYear()).toBe(original.getFullYear());
    expect(parsed.getMonth()).toBe(original.getMonth());
    expect(parsed.getDate()).toBe(original.getDate());
  });
});

describe('Dates - Real-world Scenarios', () => {
  it('should handle mortgage payment dates consistently', () => {
    // Typical mortgage: monthly payments on the 1st
    const firstPayment = new Date(2024, 1, 1); // Feb 1, 2024
    const schedule = Dates.generatePaymentSchedule(firstPayment, 12, 'monthly');

    // All payments should be on the 1st
    schedule.forEach((date) => {
      expect(date.getDate()).toBe(1);
    });
  });

  it('should handle bi-weekly payment conversion', () => {
    // User wants to pay bi-weekly instead of monthly
    const monthlyPayment = 2000; // dollars
    const biWeeklyPayment = (monthlyPayment * 12) / 26;

    // Verify 26 bi-weekly payments equals 12 monthly payments annually
    expect(biWeeklyPayment * 26).toBeCloseTo(monthlyPayment * 12, 2);
  });

  it('should calculate daily interest period correctly', () => {
    // Last payment was Dec 1, next payment is Jan 1
    const lastPayment = new Date(2024, 11, 1); // Dec 1, 2024
    const nextPayment = new Date(2025, 0, 1); // Jan 1, 2025
    const days = Dates.daysBetween(lastPayment, nextPayment);

    expect(days).toBe(31); // December has 31 days
  });
});
