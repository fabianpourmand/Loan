import { describe, it, expect } from 'vitest';
import * as Money from '../money';

describe('Money - Conversions', () => {
  it('should convert dollars to cents', () => {
    expect(Money.fromDollars(100)).toBe(10000n);
    expect(Money.fromDollars(1.50)).toBe(150n);
    expect(Money.fromDollars(0.01)).toBe(1n);
    expect(Money.fromDollars(0)).toBe(0n);
  });

  it('should handle floating point precision in fromDollars', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
    expect(Money.fromDollars(0.1 + 0.2)).toBe(30n);
    // Note: 1.005 * 100 = 100.49999999999999 in JS, so rounds to 100
    expect(Money.fromDollars(1.005)).toBe(100n);
    expect(Money.fromDollars(1.006)).toBe(101n); // rounds up
    expect(Money.fromDollars(1.004)).toBe(100n); // rounds down
  });

  it('should convert cents to dollars', () => {
    expect(Money.toDollars(10000n)).toBe(100);
    expect(Money.toDollars(150n)).toBe(1.5);
    expect(Money.toDollars(1n)).toBe(0.01);
    expect(Money.toDollars(0n)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(Money.fromDollars(-50.25)).toBe(-5025n);
    expect(Money.toDollars(-5025n)).toBe(-50.25);
  });
});

describe('Money - Arithmetic', () => {
  it('should add money values', () => {
    expect(Money.add(100n, 50n)).toBe(150n);
    expect(Money.add(Money.fromDollars(10), Money.fromDollars(5.50))).toBe(1550n);
  });

  it('should subtract money values', () => {
    expect(Money.subtract(100n, 50n)).toBe(50n);
    expect(Money.subtract(Money.fromDollars(10), Money.fromDollars(3.25))).toBe(675n);
  });

  it('should multiply money by scalar', () => {
    expect(Money.multiply(100n, 2)).toBe(200n);
    expect(Money.multiply(100n, 1.5)).toBe(150n);
    expect(Money.multiply(100n, 0.5)).toBe(50n);
  });

  it('should round multiplication to nearest cent', () => {
    expect(Money.multiply(100n, 1.555)).toBe(156n); // rounds up
    expect(Money.multiply(100n, 1.554)).toBe(155n); // rounds down
  });

  it('should divide money by scalar', () => {
    expect(Money.divide(100n, 2)).toBe(50n);
    expect(Money.divide(100n, 3)).toBe(33n); // rounds to 33 cents
    expect(Money.divide(100n, 4)).toBe(25n);
  });

  it('should round division to nearest cent', () => {
    expect(Money.divide(100n, 3)).toBe(33n); // 33.333... rounds to 33
    expect(Money.divide(200n, 3)).toBe(67n); // 66.666... rounds to 67
  });

  it('should throw on division by zero', () => {
    expect(() => Money.divide(100n, 0)).toThrow('Division by zero');
  });
});

describe('Money - Interest Calculations', () => {
  it('should calculate monthly interest correctly (exact integer)', () => {
    // $300,000 at 6.5% annual = $1,625/month interest (first month)
    const principal = Money.fromDollars(300000);
    const annualRate = 0.065;
    const monthlyInterest = Money.calculateInterest(principal, annualRate, 12);
    expect(monthlyInterest).toBe(162500n); // $1,625.00
  });

  it('should calculate daily interest correctly (365 day basis, exact integer)', () => {
    // $300,000 at 6.5% for 30 days with 365 day count
    const principal = Money.fromDollars(300000);
    const annualRate = 0.065;
    const dailyInterest = Money.calculateDailyInterest(principal, annualRate, 30, 365);
    // Daily rate = 0.065 / 365 = 0.00017808...
    // 30 days = 0.00534246... * 300,000 = $1,602.74
    expect(dailyInterest).toBe(160274n);
  });

  it('should calculate daily interest correctly (360 day basis, exact integer)', () => {
    // $300,000 at 6.5% for 30 days with 360 day count
    const principal = Money.fromDollars(300000);
    const annualRate = 0.065;
    const dailyInterest = Money.calculateDailyInterest(principal, annualRate, 30, 360);
    // Daily rate = 0.065 / 360 = 0.00018055...
    // 30 days = 0.0054166... * 300,000 = $1,625.00
    expect(dailyInterest).toBe(162500n);
  });

  it('should calculate daily interest for $100,000 at 5% for 30 days (exact integer)', () => {
    // $100,000 at 5% annual for 30 days with 365 day basis
    const principal = Money.fromDollars(100000);
    const annualRate = 0.05;
    const dailyInterest = Money.calculateDailyInterest(principal, annualRate, 30, 365);
    // Formula: (principal * rate * days) / dayCountBasis
    // = (100,000 * 0.05 * 30) / 365 = 150,000 / 365 = 410.958... = $410.96
    expect(dailyInterest).toBe(41096n);
  });

  it('should handle small principal amounts', () => {
    const principal = Money.fromDollars(100);
    const annualRate = 0.05;
    const monthlyInterest = Money.calculateInterest(principal, annualRate, 12);
    // $100 * 0.05 / 12 = $0.4166... rounds to $0.42
    expect(monthlyInterest).toBe(42n);
  });

  it('should use half-up rounding for fractional cents', () => {
    // Test case that yields exactly 0.5 cents (should round up)
    // $1.00 at 6% annual for 1 month = 0.005 = 0.5 cents -> rounds to 1 cent
    const principal = Money.fromDollars(1.00);
    const annualRate = 0.06;
    const monthlyInterest = Money.calculateInterest(principal, annualRate, 12);
    expect(monthlyInterest).toBe(1n); // 0.5 cents rounds up to 1 cent

    // Another test: $1.00 at 4% annual for 1 month = 0.00333... = 0.333... cents -> rounds to 0 cents
    const principal2 = Money.fromDollars(1.00);
    const annualRate2 = 0.04;
    const monthlyInterest2 = Money.calculateInterest(principal2, annualRate2, 12);
    expect(monthlyInterest2).toBe(0n); // 0.333... cents rounds down to 0 cents
  });

  it('should produce deterministic results (no floating-point drift)', () => {
    // Same calculation multiple times should yield identical results
    const principal = Money.fromDollars(123456.78);
    const annualRate = 0.0725;

    const result1 = Money.calculateInterest(principal, annualRate, 12);
    const result2 = Money.calculateInterest(principal, annualRate, 12);
    const result3 = Money.calculateInterest(principal, annualRate, 12);

    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toBe(74588n); // Exact deterministic result: $745.88
  });

  it('should validate interest rate bounds', () => {
    const principal = Money.fromDollars(1000);

    // Negative rate should throw
    expect(() => Money.calculateInterest(principal, -0.05, 12)).toThrow('Interest rate cannot be negative');

    // Rate > 200% should throw
    expect(() => Money.calculateInterest(principal, 2.5, 12)).toThrow('Interest rate cannot exceed 200%');

    // Infinite rate should throw
    expect(() => Money.calculateInterest(principal, Infinity, 12)).toThrow('Interest rate must be finite');
  });

  it('should validate periods parameter in calculateInterest', () => {
    const principal = Money.fromDollars(1000);
    const rate = 0.05;

    // periods = 0 should throw
    expect(() => Money.calculateInterest(principal, rate, 0)).toThrow('Periods must be a positive integer');

    // Negative periods should throw
    expect(() => Money.calculateInterest(principal, rate, -12)).toThrow('Periods must be a positive integer');

    // Non-integer periods should throw
    expect(() => Money.calculateInterest(principal, rate, 12.5)).toThrow('Periods must be a positive integer');

    // Infinite periods should throw
    expect(() => Money.calculateInterest(principal, rate, Infinity)).toThrow('Periods must be a positive integer');
  });

  it('should validate days parameter in calculateDailyInterest', () => {
    const principal = Money.fromDollars(1000);
    const rate = 0.05;

    // Negative days should throw
    expect(() => Money.calculateDailyInterest(principal, rate, -1, 365)).toThrow('Days must be a non-negative integer');

    // Non-integer days should throw
    expect(() => Money.calculateDailyInterest(principal, rate, 1.2, 365)).toThrow('Days must be a non-negative integer');

    // Infinite days should throw
    expect(() => Money.calculateDailyInterest(principal, rate, Infinity, 365)).toThrow('Days must be a non-negative integer');
  });

  it('should validate dayCountBasis parameter in calculateDailyInterest', () => {
    const principal = Money.fromDollars(1000);
    const rate = 0.05;

    // dayCountBasis = 0 should throw
    expect(() => Money.calculateDailyInterest(principal, rate, 30, 0)).toThrow('Day count basis must be a positive integer');

    // Negative dayCountBasis should throw
    expect(() => Money.calculateDailyInterest(principal, rate, 30, -360)).toThrow('Day count basis must be a positive integer');

    // Non-integer dayCountBasis should throw
    expect(() => Money.calculateDailyInterest(principal, rate, 30, 365.5)).toThrow('Day count basis must be a positive integer');

    // Infinite dayCountBasis should throw
    expect(() => Money.calculateDailyInterest(principal, rate, 30, Infinity)).toThrow('Day count basis must be a positive integer');
  });

  it('should handle days=0 and return 0 interest', () => {
    const principal = Money.fromDollars(100000);
    const rate = 0.05;

    // 0 days should return 0 interest
    const interest = Money.calculateDailyInterest(principal, rate, 0, 365);
    expect(interest).toBe(Money.ZERO);
  });
});

describe('Money - Comparisons', () => {
  it('should compare equality', () => {
    expect(Money.isEqual(100n, 100n)).toBe(true);
    expect(Money.isEqual(100n, 101n)).toBe(false);
  });

  it('should compare greater than', () => {
    expect(Money.isGreaterThan(100n, 50n)).toBe(true);
    expect(Money.isGreaterThan(50n, 100n)).toBe(false);
    expect(Money.isGreaterThan(100n, 100n)).toBe(false);
  });

  it('should compare less than', () => {
    expect(Money.isLessThan(50n, 100n)).toBe(true);
    expect(Money.isLessThan(100n, 50n)).toBe(false);
    expect(Money.isLessThan(100n, 100n)).toBe(false);
  });

  it('should find minimum', () => {
    expect(Money.min(100n, 50n)).toBe(50n);
    expect(Money.min(50n, 100n)).toBe(50n);
  });

  it('should find maximum', () => {
    expect(Money.max(100n, 50n)).toBe(100n);
    expect(Money.max(50n, 100n)).toBe(100n);
  });

  it('should calculate absolute value', () => {
    expect(Money.abs(100n)).toBe(100n);
    expect(Money.abs(-100n)).toBe(100n);
    expect(Money.abs(0n)).toBe(0n);
  });
});

describe('Money - Formatting', () => {
  it('should format with dollar sign', () => {
    expect(Money.format(100000n)).toBe('$1,000.00');
    expect(Money.format(150n)).toBe('$1.50');
    expect(Money.format(1n)).toBe('$0.01');
  });

  it('should format without dollar sign', () => {
    expect(Money.format(100000n, false)).toBe('1,000.00');
    expect(Money.format(150n, false)).toBe('1.50');
  });

  it('should format negative amounts', () => {
    expect(Money.format(-100000n)).toBe('-$1,000.00');
  });

  it('should format large amounts with commas', () => {
    expect(Money.format(Money.fromDollars(1234567.89))).toBe('$1,234,567.89');
  });
});

describe('Money - Constants', () => {
  it('should provide useful constants', () => {
    expect(Money.ZERO).toBe(0n);
    expect(Money.ONE_CENT).toBe(1n);
    expect(Money.ONE_DOLLAR).toBe(100n);
  });
});

describe('Money - Real-world scenarios', () => {
  it('should accurately calculate mortgage interest for typical loan', () => {
    // $350,000 loan at 7.25% annual rate
    const principal = Money.fromDollars(350000);
    const rate = 0.0725;
    const monthlyInterest = Money.calculateInterest(principal, rate, 12);

    // Expected: $350,000 * 0.0725 / 12 = $2,114.58
    expect(monthlyInterest).toBe(211458n);
    expect(Money.toDollars(monthlyInterest)).toBe(2114.58);
  });

  it('should handle payment application correctly', () => {
    // Payment = $2,500, Interest = $2,114.58, Principal should be $385.42
    const payment = Money.fromDollars(2500);
    const interest = 211458n;
    const principalPortion = Money.subtract(payment, interest);

    expect(principalPortion).toBe(38542n);
    expect(Money.toDollars(principalPortion)).toBe(385.42);
  });

  it('should maintain precision across multiple operations', () => {
    // Start with a principal
    let balance = Money.fromDollars(300000);
    const rate = 0.065;

    // Calculate interest and apply payment for 3 months
    for (let i = 0; i < 3; i++) {
      const interest = Money.calculateInterest(balance, rate, 12);
      const principalPayment = Money.fromDollars(500);
      balance = Money.subtract(balance, principalPayment);
    }

    // After 3 months of $500 principal payments
    expect(balance).toBe(Money.fromDollars(298500));
  });
});
