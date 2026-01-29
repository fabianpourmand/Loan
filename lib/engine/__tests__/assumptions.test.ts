import { describe, it, expect } from 'vitest';
import * as Assumptions from '../assumptions';

describe('Assumptions - Predefined Sets', () => {
  it('should have standard monthly assumption set', () => {
    const standard = Assumptions.STANDARD_MONTHLY;

    expect(standard.name).toBe('Standard Monthly');
    expect(standard.amortizationMethod).toBe('monthly');
    expect(standard.paymentFrequency).toBe('monthly');
    expect(standard.dayCountBasis).toBe('actual/365');
    expect(standard.paymentApplicationOrder).toBe('standard');
    expect(standard.roundingMethod).toBe('nearest');
  });

  it('should have daily accrual 365 assumption set', () => {
    const daily365 = Assumptions.DAILY_ACCRUAL_365;

    expect(daily365.name).toBe('Daily Accrual (365)');
    expect(daily365.amortizationMethod).toBe('daily');
    expect(daily365.dayCountBasis).toBe('actual/365');
  });

  it('should have daily accrual 360 assumption set', () => {
    const daily360 = Assumptions.DAILY_ACCRUAL_360;

    expect(daily360.name).toBe('Daily Accrual (360)');
    expect(daily360.amortizationMethod).toBe('daily');
    expect(daily360.dayCountBasis).toBe('actual/360');
  });

  it('should have bi-weekly assumption set', () => {
    const biWeekly = Assumptions.BI_WEEKLY;

    expect(biWeekly.name).toBe('Bi-Weekly');
    expect(biWeekly.paymentFrequency).toBe('bi-weekly');
    expect(biWeekly.amortizationMethod).toBe('monthly');
  });

  it('should have all predefined assumptions accessible', () => {
    expect(Assumptions.PREDEFINED_ASSUMPTIONS['standard-monthly']).toBeDefined();
    expect(Assumptions.PREDEFINED_ASSUMPTIONS['daily-365']).toBeDefined();
    expect(Assumptions.PREDEFINED_ASSUMPTIONS['daily-360']).toBeDefined();
    expect(Assumptions.PREDEFINED_ASSUMPTIONS['bi-weekly']).toBeDefined();
  });
});

describe('Assumptions - Custom Creation', () => {
  it('should create custom assumption set with overrides', () => {
    const custom = Assumptions.createCustomAssumptionSet({
      name: 'My Custom Set',
      amortizationMethod: 'daily',
      dayCountBasis: 'actual/360'
    });

    expect(custom.name).toBe('My Custom Set');
    expect(custom.amortizationMethod).toBe('daily');
    expect(custom.dayCountBasis).toBe('actual/360');
    // Other fields should default to standard monthly
    expect(custom.paymentFrequency).toBe('monthly');
    expect(custom.roundingMethod).toBe('nearest');
  });

  it('should default name to "Custom" if not provided', () => {
    const custom = Assumptions.createCustomAssumptionSet({
      amortizationMethod: 'daily'
    });

    expect(custom.name).toBe('Custom');
  });

  it('should allow partial overrides', () => {
    const custom = Assumptions.createCustomAssumptionSet({
      includePMI: true,
      includeHOA: true
    });

    expect(custom.includePMI).toBe(true);
    expect(custom.includeHOA).toBe(true);
    expect(custom.includeEscrow).toBe(true); // Default from STANDARD_MONTHLY
  });
});

describe('Assumptions - Validation', () => {
  it('should validate a valid assumption set', () => {
    const errors = Assumptions.validateAssumptionSet(
      Assumptions.STANDARD_MONTHLY
    );
    expect(errors).toHaveLength(0);
  });

  it('should require a name', () => {
    const invalid: Assumptions.AssumptionSet = {
      ...Assumptions.STANDARD_MONTHLY,
      name: ''
    };

    const errors = Assumptions.validateAssumptionSet(invalid);
    expect(errors).toContain('Assumption set must have a name');
  });

  it('should require day count basis for daily amortization', () => {
    const invalid: Assumptions.AssumptionSet = {
      ...Assumptions.DAILY_ACCRUAL_365,
      dayCountBasis: undefined as any
    };

    const errors = Assumptions.validateAssumptionSet(invalid);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Day count basis'))).toBe(true);
  });

  it('should require custom priority for custom payment order', () => {
    const invalid: Assumptions.AssumptionSet = {
      ...Assumptions.STANDARD_MONTHLY,
      paymentApplicationOrder: 'custom',
      customPaymentPriority: undefined
    };

    const errors = Assumptions.validateAssumptionSet(invalid);
    expect(errors).toContain(
      'Custom payment priority is required for custom payment order'
    );
  });

  it('should validate all predefined assumption sets', () => {
    Object.values(Assumptions.PREDEFINED_ASSUMPTIONS).forEach((assumptions) => {
      const errors = Assumptions.validateAssumptionSet(assumptions);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('Assumptions - Equality Checking', () => {
  it('should return true for identical assumption sets', () => {
    const a = Assumptions.STANDARD_MONTHLY;
    const b = { ...Assumptions.STANDARD_MONTHLY };

    expect(Assumptions.areAssumptionsEqual(a, b)).toBe(true);
  });

  it('should return false for different amortization methods', () => {
    const a = Assumptions.STANDARD_MONTHLY;
    const b = Assumptions.DAILY_ACCRUAL_365;

    expect(Assumptions.areAssumptionsEqual(a, b)).toBe(false);
  });

  it('should return false for different day count basis', () => {
    const a = Assumptions.DAILY_ACCRUAL_365;
    const b = Assumptions.DAILY_ACCRUAL_360;

    expect(Assumptions.areAssumptionsEqual(a, b)).toBe(false);
  });

  it('should return false for different payment frequency', () => {
    const a = Assumptions.STANDARD_MONTHLY;
    const b = Assumptions.BI_WEEKLY;

    expect(Assumptions.areAssumptionsEqual(a, b)).toBe(false);
  });

  it('should ignore name differences', () => {
    const a = Assumptions.STANDARD_MONTHLY;
    const b = { ...Assumptions.STANDARD_MONTHLY, name: 'Different Name' };

    // Names are different but calculation assumptions are the same
    expect(Assumptions.areAssumptionsEqual(a, b)).toBe(true);
  });

  it('should detect differences in optional flags', () => {
    const a = Assumptions.STANDARD_MONTHLY;
    const b = { ...Assumptions.STANDARD_MONTHLY, includePMI: true };

    expect(Assumptions.areAssumptionsEqual(a, b)).toBe(false);
  });
});

describe('Assumptions - Summary Generation', () => {
  it('should generate summary for standard monthly', () => {
    const summary = Assumptions.getAssumptionSummary(
      Assumptions.STANDARD_MONTHLY
    );

    expect(summary).toContain('Monthly Amortization');
    expect(summary).toContain('Escrow');
  });

  it('should generate summary for daily accrual', () => {
    const summary = Assumptions.getAssumptionSummary(
      Assumptions.DAILY_ACCRUAL_365
    );

    expect(summary).toContain('Daily Accrual');
    expect(summary).toContain('actual/365');
  });

  it('should include payment frequency if not monthly', () => {
    const summary = Assumptions.getAssumptionSummary(Assumptions.BI_WEEKLY);

    expect(summary).toContain('Bi-Weekly Payments');
  });

  it('should list all included components', () => {
    const custom = Assumptions.createCustomAssumptionSet({
      includeEscrow: true,
      includePMI: true,
      includeHOA: true
    });

    const summary = Assumptions.getAssumptionSummary(custom);

    expect(summary).toContain('Escrow');
    expect(summary).toContain('PMI');
    expect(summary).toContain('HOA');
  });

  it('should not list components that are not included', () => {
    const custom = Assumptions.createCustomAssumptionSet({
      includeEscrow: false,
      includePMI: false,
      includeHOA: false
    });

    const summary = Assumptions.getAssumptionSummary(custom);

    expect(summary).not.toContain('Including:');
  });
});

describe('Assumptions - Real-world Scenarios', () => {
  it('should support common mortgage calculation scenario', () => {
    // Most common: standard monthly with escrow
    const assumptions = Assumptions.STANDARD_MONTHLY;

    expect(assumptions.amortizationMethod).toBe('monthly');
    expect(assumptions.paymentFrequency).toBe('monthly');
    expect(assumptions.includeEscrow).toBe(true);
    expect(Assumptions.validateAssumptionSet(assumptions)).toHaveLength(0);
  });

  it('should support statement match scenario', () => {
    // For statement matching, we might need to try different assumptions
    const scenarios = [
      Assumptions.STANDARD_MONTHLY,
      Assumptions.DAILY_ACCRUAL_365,
      Assumptions.DAILY_ACCRUAL_360
    ];

    scenarios.forEach((scenario) => {
      expect(Assumptions.validateAssumptionSet(scenario)).toHaveLength(0);
    });

    // Each should be different
    expect(
      Assumptions.areAssumptionsEqual(scenarios[0], scenarios[1])
    ).toBe(false);
    expect(
      Assumptions.areAssumptionsEqual(scenarios[1], scenarios[2])
    ).toBe(false);
  });

  it('should support aggressive payoff scenario with bi-weekly', () => {
    // User wants to pay bi-weekly to pay off faster
    const assumptions = Assumptions.BI_WEEKLY;

    expect(assumptions.paymentFrequency).toBe('bi-weekly');
    expect(assumptions.amortizationMethod).toBe('monthly');
  });

  it('should allow customization for edge cases', () => {
    // Some servicers might have unique calculation methods
    const custom = Assumptions.createCustomAssumptionSet({
      name: 'Special Servicer',
      amortizationMethod: 'daily',
      dayCountBasis: '30/360',
      roundingMethod: 'down'
    });

    expect(custom.amortizationMethod).toBe('daily');
    expect(custom.dayCountBasis).toBe('30/360');
    expect(custom.roundingMethod).toBe('down');
    expect(Assumptions.validateAssumptionSet(custom)).toHaveLength(0);
  });
});
