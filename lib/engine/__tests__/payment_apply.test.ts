import { describe, it, expect } from 'vitest';
import * as PaymentApply from '../payment_apply';
import * as Money from '../money';
import { STANDARD_MONTHLY } from '../assumptions';

describe('PaymentApply - Basic Payment Application', () => {
  it('should apply payment to interest and principal', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625) // $1,625 interest
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000) // $2,000 payment
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Interest: $1,625
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1625));

    // Principal: $2,000 - $1,625 = $375
    expect(breakdown.principalPortion).toBe(Money.fromDollars(375));

    // New balance: $300,000 - $375 = $299,625
    expect(breakdown.newBalance).toBe(Money.fromDollars(299625));

    expect(breakdown.isPartialPayment).toBe(false);
    expect(breakdown.remaining).toBe(Money.ZERO);
  });

  it('should handle zero interest', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(1000),
      accruedInterest: Money.ZERO
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(500)
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    expect(breakdown.interestPortion).toBe(Money.ZERO);
    expect(breakdown.principalPortion).toBe(Money.fromDollars(500));
    expect(breakdown.newBalance).toBe(Money.fromDollars(500));
  });
});

describe('PaymentApply - Partial Payments', () => {
  it('should handle partial payment (insufficient for interest)', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1000) // Less than interest
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Only $1,000 applied to interest (partial)
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1000));
    expect(breakdown.principalPortion).toBe(Money.ZERO);
    expect(breakdown.isPartialPayment).toBe(true);

    // Balance doesn't change
    expect(breakdown.newBalance).toBe(loanState.balance);
  });

  it('should handle payment exactly equal to interest', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1625) // Exactly interest
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    expect(breakdown.interestPortion).toBe(Money.fromDollars(1625));
    expect(breakdown.principalPortion).toBe(Money.ZERO);
    expect(breakdown.isPartialPayment).toBe(false);

    // Balance doesn't change
    expect(breakdown.newBalance).toBe(loanState.balance);
  });
});

describe('PaymentApply - Extra Principal', () => {
  it('should apply extra principal payment', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      extraPrincipal: Money.fromDollars(500) // Extra $500
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Total payment should include extra
    expect(breakdown.totalPayment).toBe(Money.fromDollars(2500));

    // Regular application
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1625));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(375));

    // Extra principal
    expect(breakdown.extraPrincipalPortion).toBe(Money.fromDollars(500));

    // New balance: $300,000 - $375 - $500 = $299,125
    expect(breakdown.newBalance).toBe(Money.fromDollars(299125));
  });

  it('should limit extra principal to remaining balance', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(1000),
      accruedInterest: Money.fromDollars(50)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1000),
      extraPrincipal: Money.fromDollars(5000) // More than balance
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Interest: $50
    expect(breakdown.interestPortion).toBe(Money.fromDollars(50));

    // Principal: $1,000 - $50 = $950
    expect(breakdown.principalPortion).toBe(Money.fromDollars(950));

    // Extra principal: only $50 (remaining balance)
    expect(breakdown.extraPrincipalPortion).toBe(Money.fromDollars(50));

    // Balance should be zero
    expect(breakdown.newBalance).toBe(Money.ZERO);
  });
});

describe('PaymentApply - With Escrow and Other Components', () => {
  it('should include escrow in total payment', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      escrow: Money.fromDollars(500)
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Total should include escrow
    expect(breakdown.totalPayment).toBe(Money.fromDollars(2500));

    // Escrow portion
    expect(breakdown.escrowPortion).toBe(Money.fromDollars(500));

    // P&I application unchanged
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1625));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(375));
  });

  it('should include PMI when enabled', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      pmi: Money.fromDollars(150)
    };

    const assumptions = {
      ...STANDARD_MONTHLY,
      includePMI: true
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      assumptions
    );

    expect(breakdown.totalPayment).toBe(Money.fromDollars(2150));
    expect(breakdown.pmiPortion).toBe(Money.fromDollars(150));
  });

  it('should include HOA when enabled', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      hoa: Money.fromDollars(200)
    };

    const assumptions = {
      ...STANDARD_MONTHLY,
      includeHOA: true
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      assumptions
    );

    expect(breakdown.totalPayment).toBe(Money.fromDollars(2200));
    expect(breakdown.hoaPortion).toBe(Money.fromDollars(200));
  });

  it('should include all components together', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      extraPrincipal: Money.fromDollars(300),
      escrow: Money.fromDollars(500),
      pmi: Money.fromDollars(150),
      hoa: Money.fromDollars(200)
    };

    const assumptions = {
      ...STANDARD_MONTHLY,
      includePMI: true,
      includeHOA: true
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      assumptions
    );

    // Total: $2,000 + $300 + $500 + $150 + $200 = $3,150
    expect(breakdown.totalPayment).toBe(Money.fromDollars(3150));

    expect(breakdown.interestPortion).toBe(Money.fromDollars(1625));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(375));
    expect(breakdown.extraPrincipalPortion).toBe(Money.fromDollars(300));
    expect(breakdown.escrowPortion).toBe(Money.fromDollars(500));
    expect(breakdown.pmiPortion).toBe(Money.fromDollars(150));
    expect(breakdown.hoaPortion).toBe(Money.fromDollars(200));
  });
});

describe('PaymentApply - Fees', () => {
  it('should apply fees separately from P&I (trust-critical)', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(10000),
      accruedInterest: Money.fromDollars(100)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(500),
      fees: Money.fromDollars(50) // Late fee
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Total includes fees (separate cash)
    expect(breakdown.totalPayment).toBe(Money.fromDollars(550));

    // Fees paid from separate cash (NOT from scheduledPayment)
    expect(breakdown.feesPortion).toBe(Money.fromDollars(50));

    // Full scheduledPayment ($500) goes to P&I
    expect(breakdown.interestPortion).toBe(Money.fromDollars(100));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(400));

    // Remaining should be 0
    expect(breakdown.remaining).toBe(Money.ZERO);
  });

  it('should apply fees even during partial payment', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(10000),
      accruedInterest: Money.fromDollars(200) // High interest
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(150), // Less than interest!
      fees: Money.fromDollars(25) // Late fee
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Total includes fees
    expect(breakdown.totalPayment).toBe(Money.fromDollars(175));

    // Fees still applied (separate cash)
    expect(breakdown.feesPortion).toBe(Money.fromDollars(25));

    // Partial payment: only $150 to interest
    expect(breakdown.interestPortion).toBe(Money.fromDollars(150));
    expect(breakdown.principalPortion).toBe(Money.ZERO);
    expect(breakdown.isPartialPayment).toBe(true);

    // Balance unchanged
    expect(breakdown.newBalance).toBe(loanState.balance);

    // Remaining = totalPayment - (fees + interest)
    // = 175 - (25 + 150) = 0
    expect(breakdown.remaining).toBe(Money.ZERO);
  });
});

describe('PaymentApply - Scheduled Payment Calculation', () => {
  it('should calculate standard 30-year mortgage payment', () => {
    const principal = Money.fromDollars(300000);
    const annualRate = 0.065; // 6.5%
    const payments = 360; // 30 years

    const payment = PaymentApply.calculateScheduledPayment(
      principal,
      annualRate,
      payments
    );

    // Expected: ~$1,896.20
    expect(Money.toDollars(payment)).toBeCloseTo(1896.20, 0);
  });

  it('should calculate 15-year mortgage payment', () => {
    const principal = Money.fromDollars(300000);
    const annualRate = 0.0575; // 5.75%
    const payments = 180; // 15 years

    const payment = PaymentApply.calculateScheduledPayment(
      principal,
      annualRate,
      payments
    );

    // Expected: ~$2,491.23
    expect(Money.toDollars(payment)).toBeCloseTo(2491, 0);
  });

  it('should handle 0% interest rate', () => {
    const principal = Money.fromDollars(12000);
    const annualRate = 0; // 0%
    const payments = 12;

    const payment = PaymentApply.calculateScheduledPayment(
      principal,
      annualRate,
      payments
    );

    // Expected: $12,000 / 12 = $1,000
    expect(payment).toBe(Money.fromDollars(1000));
  });

  it('should throw on invalid number of payments', () => {
    const principal = Money.fromDollars(300000);
    const annualRate = 0.065;

    expect(() =>
      PaymentApply.calculateScheduledPayment(principal, annualRate, 0)
    ).toThrow('Number of payments must be positive');

    expect(() =>
      PaymentApply.calculateScheduledPayment(principal, annualRate, -12)
    ).toThrow('Number of payments must be positive');
  });
});

describe('PaymentApply - Validation', () => {
  it('should validate valid payment components', () => {
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      extraPrincipal: Money.fromDollars(500),
      escrow: Money.fromDollars(400)
    };

    const errors = PaymentApply.validatePaymentComponents(components);
    expect(errors).toHaveLength(0);
  });

  it('should reject negative scheduled payment', () => {
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(-100)
    };

    const errors = PaymentApply.validatePaymentComponents(components);
    expect(errors).toContain('Scheduled payment cannot be negative');
  });

  it('should reject negative extra principal', () => {
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      extraPrincipal: Money.fromDollars(-50)
    };

    const errors = PaymentApply.validatePaymentComponents(components);
    expect(errors).toContain('Extra principal cannot be negative');
  });

  it('should reject negative escrow', () => {
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      escrow: Money.fromDollars(-100)
    };

    const errors = PaymentApply.validatePaymentComponents(components);
    expect(errors).toContain('Escrow cannot be negative');
  });
});

describe('PaymentApply - Real-world Scenarios', () => {
  it('should handle typical mortgage payment', () => {
    // $350,000 loan at 7.25% annual
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(350000),
      accruedInterest: Money.fromDollars(2114.58) // Monthly interest
    };

    // Scheduled P&I is $2,388
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2388),
      escrow: Money.fromDollars(650) // Taxes + insurance
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Interest: $2,114.58
    expect(breakdown.interestPortion).toBe(Money.fromDollars(2114.58));

    // Principal: $2,388 - $2,114.58 = $273.42
    expect(breakdown.principalPortion).toBe(Money.fromDollars(273.42));

    // New balance: $350,000 - $273.42 = $349,726.58
    expect(breakdown.newBalance).toBe(Money.fromDollars(349726.58));

    // Escrow included in total
    expect(breakdown.totalPayment).toBe(Money.fromDollars(3038));
    expect(breakdown.escrowPortion).toBe(Money.fromDollars(650));
  });

  it('should handle aggressive paydown strategy', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(200000),
      accruedInterest: Money.fromDollars(1000)
    };

    // Regular payment + $1,000 extra principal
    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1500),
      extraPrincipal: Money.fromDollars(1000)
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    expect(breakdown.interestPortion).toBe(Money.fromDollars(1000));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(500));
    expect(breakdown.extraPrincipalPortion).toBe(Money.fromDollars(1000));

    // Total principal reduction: $500 + $1,000 = $1,500
    const principalReduction = Money.add(
      breakdown.principalPortion,
      breakdown.extraPrincipalPortion
    );
    expect(principalReduction).toBe(Money.fromDollars(1500));

    // New balance: $200,000 - $1,500 = $198,500
    expect(breakdown.newBalance).toBe(Money.fromDollars(198500));
  });
});

describe('PaymentApply - Accounting Consistency (Trust-Critical)', () => {
  it('should have remaining == 0 for full payment with no optionals', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(200000),
      accruedInterest: Money.fromDollars(1000)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1500) // Covers interest + principal
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Should apply: interest $1,000 + principal $500
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1000));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(500));

    // Total payment should equal scheduled payment (no optionals)
    expect(breakdown.totalPayment).toBe(Money.fromDollars(1500));

    // Remaining should be exactly 0
    expect(breakdown.remaining).toBe(Money.ZERO);
  });

  it('should have remaining == 0 for full payment with extra principal', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(200000),
      accruedInterest: Money.fromDollars(1000)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1500),
      extraPrincipal: Money.fromDollars(500)
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // P&I application
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1000));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(500));

    // Extra principal applied
    expect(breakdown.extraPrincipalPortion).toBe(Money.fromDollars(500));

    // Total payment should include extra
    expect(breakdown.totalPayment).toBe(Money.fromDollars(2000));

    // Balance reduced by principal + extra
    const totalPrincipalReduction = Money.add(
      breakdown.principalPortion,
      breakdown.extraPrincipalPortion
    );
    expect(totalPrincipalReduction).toBe(Money.fromDollars(1000));
    expect(breakdown.newBalance).toBe(Money.fromDollars(199000));

    // Remaining should be exactly 0
    expect(breakdown.remaining).toBe(Money.ZERO);
  });

  it('should have remaining == 0 for full payment with escrow/pmi/hoa', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(2000),
      escrow: Money.fromDollars(500),
      pmi: Money.fromDollars(150),
      hoa: Money.fromDollars(200)
    };

    const assumptions = {
      ...STANDARD_MONTHLY,
      includePMI: true,
      includeHOA: true
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      assumptions
    );

    // P&I application
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1625));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(375));

    // Other portions applied correctly
    expect(breakdown.escrowPortion).toBe(Money.fromDollars(500));
    expect(breakdown.pmiPortion).toBe(Money.fromDollars(150));
    expect(breakdown.hoaPortion).toBe(Money.fromDollars(200));

    // Total payment should include all components
    expect(breakdown.totalPayment).toBe(Money.fromDollars(2850));

    // Remaining should be exactly 0
    expect(breakdown.remaining).toBe(Money.ZERO);
  });

  it('should NOT apply extra principal in partial payment and calculate correct remaining', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(300000),
      accruedInterest: Money.fromDollars(1625)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1000), // Less than interest!
      extraPrincipal: Money.fromDollars(500) // Should NOT be applied
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Only partial interest covered
    expect(breakdown.interestPortion).toBe(Money.fromDollars(1000));
    expect(breakdown.principalPortion).toBe(Money.ZERO);

    // Extra principal should NOT be applied
    expect(breakdown.extraPrincipalPortion).toBe(Money.ZERO);

    // Balance unchanged
    expect(breakdown.newBalance).toBe(loanState.balance);

    // Mark as partial payment
    expect(breakdown.isPartialPayment).toBe(true);

    // Total payment = scheduledPayment + extraPrincipal
    expect(breakdown.totalPayment).toBe(Money.fromDollars(1500));

    // Remaining = totalPayment - applied portions
    // Applied: $1,000 interest only
    // Remaining: $1,500 - $1,000 = $500
    expect(breakdown.remaining).toBe(Money.fromDollars(500));
  });

  it('should calculate remaining correctly when optional components not applied', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(100000),
      accruedInterest: Money.fromDollars(500)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1000),
      escrow: Money.fromDollars(300), // Provided but assumption disabled
      pmi: Money.fromDollars(100) // Provided but assumption disabled
    };

    // Assumptions have escrow/pmi disabled
    const assumptions = {
      ...STANDARD_MONTHLY,
      includeEscrow: false, // Disabled!
      includePMI: false // Disabled!
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      assumptions
    );

    // P&I applied
    expect(breakdown.interestPortion).toBe(Money.fromDollars(500));
    expect(breakdown.principalPortion).toBe(Money.fromDollars(500));

    // Escrow and PMI should NOT be applied (portions = 0)
    expect(breakdown.escrowPortion).toBe(Money.ZERO);
    expect(breakdown.pmiPortion).toBe(Money.ZERO);

    // Total payment still includes provided amounts
    expect(breakdown.totalPayment).toBe(Money.fromDollars(1400));

    // Remaining = totalPayment - applied portions
    // Applied: $500 interest + $500 principal = $1,000
    // Remaining: $1,400 - $1,000 = $400
    expect(breakdown.remaining).toBe(Money.fromDollars(400));
  });

  it('should maintain invariant: totalPayment = appliedTotal + remaining', () => {
    const loanState: PaymentApply.LoanState = {
      balance: Money.fromDollars(250000),
      accruedInterest: Money.fromDollars(1300)
    };

    const components: PaymentApply.PaymentComponents = {
      scheduledPayment: Money.fromDollars(1800),
      extraPrincipal: Money.fromDollars(200),
      escrow: Money.fromDollars(400),
      fees: Money.fromDollars(50)
    };

    const breakdown = PaymentApply.applyPayment(
      loanState,
      components,
      STANDARD_MONTHLY
    );

    // Calculate applied total
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

    // Invariant: totalPayment = appliedTotal + remaining
    const sum = Money.add(appliedTotal, breakdown.remaining);
    expect(sum).toBe(breakdown.totalPayment);
  });
});
