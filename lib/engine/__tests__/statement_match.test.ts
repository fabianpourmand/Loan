import { describe, it, expect } from 'vitest';
import * as StatementMatch from '../statement_match';
import * as Money from '../money';

describe('StatementMatch - Exact Match', () => {
  it('should return MATCH for exactly equal rows', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-01'),
        beginningBalance: Money.fromDollars(300000),
        interestPortion: Money.fromDollars(1625),
        principalPortion: Money.fromDollars(375),
        endingBalance: Money.fromDollars(299625),
        totalPayment: Money.fromDollars(2000)
      },
      {
        periodNumber: 2,
        paymentDate: new Date('2024-03-01'),
        beginningBalance: Money.fromDollars(299625),
        interestPortion: Money.fromDollars(1623),
        principalPortion: Money.fromDollars(377),
        endingBalance: Money.fromDollars(299248),
        totalPayment: Money.fromDollars(2000)
      }
    ];

    const actualRows = [...expectedRows];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('MATCH');
    expect(result.diagnostics.rowCountExpected).toBe(2);
    expect(result.diagnostics.rowCountActual).toBe(2);
    expect(Object.keys(result.diagnostics.maxAbsDeltaByField)).toHaveLength(0);
    expect(result.diagnostics.deltasByRow).toHaveLength(0);
    expect(result.diagnostics.notes).toContain('All fields match exactly');
  });
});

describe('StatementMatch - Close Match', () => {
  it('should return CLOSE for 1-cent rounding differences within tolerance', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        beginningBalance: Money.fromDollars(100000),
        interestPortion: Money.fromDollars(541.67),
        principalPortion: Money.fromDollars(458.33),
        endingBalance: Money.fromDollars(99541.67)
      },
      {
        periodNumber: 2,
        beginningBalance: Money.fromDollars(99541.67),
        interestPortion: Money.fromDollars(539.19),
        principalPortion: Money.fromDollars(460.81),
        endingBalance: Money.fromDollars(99080.86)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        beginningBalance: Money.fromDollars(100000),
        interestPortion: 54167n, // $541.67
        principalPortion: 45833n, // $458.33 (no rounding diff)
        endingBalance: 9954167n // $99,541.67
      },
      {
        periodNumber: 2,
        beginningBalance: 9954167n,
        interestPortion: 53920n, // $539.20 (1 cent diff from 539.19)
        principalPortion: 46080n, // $460.80 (1 cent diff from 460.81)
        endingBalance: 9908087n // $99,080.87 (1 cent diff from 99,080.86)
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('CLOSE');
    expect(result.diagnostics.deltasByRow.length).toBeGreaterThan(0);
    expect(result.diagnostics.notes.some((n) => n.includes('within tolerance'))).toBe(
      true
    );

    // Check max deltas are 1 cent
    const maxDeltas = result.diagnostics.maxAbsDeltaByField;
    Object.values(maxDeltas).forEach((delta) => {
      expect(delta).toBeLessThanOrEqual(1n);
    });
  });

  it('should respect custom tolerance', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(1000),
        principalPortion: Money.fromDollars(500)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(1000.05), // 5 cent diff
        principalPortion: Money.fromDollars(499.95) // 5 cent diff
      }
    ];

    // With 1 cent tolerance -> NO_MATCH
    const result1 = StatementMatch.matchStatement(expectedRows, actualRows);
    expect(result1.status).toBe('NO_MATCH');

    // With 10 cent tolerance -> CLOSE
    const result2 = StatementMatch.matchStatement(expectedRows, actualRows, {
      moneyToleranceCents: 10n
    });
    expect(result2.status).toBe('CLOSE');
  });
});

describe('StatementMatch - No Match', () => {
  it('should return NO_MATCH for larger differences', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(1625),
        principalPortion: Money.fromDollars(375),
        endingBalance: Money.fromDollars(299625)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(1630), // $5 off
        principalPortion: Money.fromDollars(370), // $5 off
        endingBalance: Money.fromDollars(299630) // $5 off
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.notes).toContain('Deltas exceed tolerance');

    // Check deltas recorded
    expect(result.diagnostics.deltasByRow.length).toBeGreaterThan(0);
    const firstRowDelta = result.diagnostics.deltasByRow[0];
    expect(firstRowDelta.rowIndex).toBe(0);
    expect(firstRowDelta.deltas.interestPortion).toBe(500n); // +$5
  });

  it('should return NO_MATCH for row count mismatch', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(1625)
      },
      {
        periodNumber: 2,
        interestPortion: Money.fromDollars(1623)
      },
      {
        periodNumber: 3,
        interestPortion: Money.fromDollars(1621)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(1625)
      },
      {
        periodNumber: 2,
        interestPortion: Money.fromDollars(1623)
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.rowCountExpected).toBe(3);
    expect(result.diagnostics.rowCountActual).toBe(2);
    expect(result.diagnostics.notes.some((n) => n.includes('Row count mismatch'))).toBe(
      true
    );
  });
});

describe('StatementMatch - Date Handling', () => {
  it('should return NO_MATCH for date mismatch when allowDateMismatch is false', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-01'),
        interestPortion: Money.fromDollars(1625)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-02'), // Different date
        interestPortion: Money.fromDollars(1625)
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.notes.some((n) => n.includes('Date mismatch'))).toBe(true);
  });

  it('should return CLOSE for date mismatch when allowDateMismatch is true and money within tolerance', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-01'),
        interestPortion: Money.fromDollars(1625),
        principalPortion: Money.fromDollars(375)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-02'), // Different date
        interestPortion: 162500n, // Exact match on money
        principalPortion: 37501n // 1 cent diff
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows, {
      allowDateMismatch: true
    });

    expect(result.status).toBe('CLOSE');
    expect(
      result.diagnostics.notes.some((n) => n.includes('date mismatch allowed'))
    ).toBe(true);
  });

  it('should return NO_MATCH when expected has date but actual missing and allowDateMismatch is false', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-01'),
        interestPortion: Money.fromDollars(1625),
        principalPortion: Money.fromDollars(375)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: undefined, // Missing date
        interestPortion: Money.fromDollars(1625), // Exact money match
        principalPortion: Money.fromDollars(375)
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.notes.some((n) => n.includes('Date missing'))).toBe(true);
  });

  it('should return CLOSE when date missing but allowDateMismatch is true and money exact', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: new Date('2024-02-01'),
        interestPortion: Money.fromDollars(1625),
        principalPortion: Money.fromDollars(375)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        paymentDate: undefined, // Missing date
        interestPortion: Money.fromDollars(1625), // Exact money match
        principalPortion: Money.fromDollars(375)
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows, {
      allowDateMismatch: true
    });

    expect(result.status).toBe('CLOSE');
    expect(
      result.diagnostics.notes.some((n) => n.includes('date mismatch allowed'))
    ).toBe(true);
  });
});

describe('StatementMatch - Diagnostics', () => {
  it('should track max absolute delta per field', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50)
      },
      {
        periodNumber: 2,
        interestPortion: Money.fromDollars(200),
        principalPortion: Money.fromDollars(60)
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: 10002n, // +2 cents
        principalPortion: 4998n // -2 cents
      },
      {
        periodNumber: 2,
        interestPortion: 20005n, // +5 cents (max for this field)
        principalPortion: 5999n // -1 cent
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.maxAbsDeltaByField.interestPortion).toBe(5n);
    expect(result.diagnostics.maxAbsDeltaByField.principalPortion).toBe(2n);
  });

  it('should limit deltasByRow to first 5 rows', () => {
    const expectedRows: StatementMatch.StatementRow[] = Array.from(
      { length: 10 },
      (_, i) => ({
        periodNumber: i + 1,
        interestPortion: Money.fromDollars(100)
      })
    );

    const actualRows: StatementMatch.StatementRow[] = Array.from(
      { length: 10 },
      (_, i) => ({
        periodNumber: i + 1,
        interestPortion: 10010n // +10 cents in each row
      })
    );

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.diagnostics.deltasByRow.length).toBe(5); // Limited to 5
  });

  it('should handle undefined/null fields as zero when treatMissingMoneyAsZero is true', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        extraPrincipal: undefined // Not provided
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        extraPrincipal: Money.ZERO // Explicitly zero
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows, {
      treatMissingMoneyAsZero: true
    });

    expect(result.status).toBe('MATCH'); // Should treat undefined as zero
  });
});

describe('StatementMatch - Strict Missing Field Handling', () => {
  it('should return NO_MATCH when expected has field but actual is missing (strict default)', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50),
        extraPrincipal: Money.fromDollars(25) // Expected has this field
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50),
        extraPrincipal: undefined // Actual missing
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.notes.some((n) => n.includes('Missing field'))).toBe(true);
    expect(
      result.diagnostics.notes.some((n) => n.includes('extraPrincipal') && n.includes('row 0'))
    ).toBe(true);
  });

  it('should return NO_MATCH when expected missing field but actual has value (strict default)', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50),
        extraPrincipal: undefined // Expected missing
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50),
        extraPrincipal: Money.ZERO // Actual has zero
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows);

    expect(result.status).toBe('NO_MATCH');
    expect(result.diagnostics.notes.some((n) => n.includes('Missing field'))).toBe(true);
    expect(
      result.diagnostics.notes.some((n) => n.includes('extraPrincipal') && n.includes('row 0'))
    ).toBe(true);
  });

  it('should return MATCH when treatMissingMoneyAsZero is true and missing equals zero', () => {
    const expectedRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50),
        extraPrincipal: undefined // Expected missing
      }
    ];

    const actualRows: StatementMatch.StatementRow[] = [
      {
        periodNumber: 1,
        interestPortion: Money.fromDollars(100),
        principalPortion: Money.fromDollars(50),
        extraPrincipal: Money.ZERO // Actual has zero
      }
    ];

    const result = StatementMatch.matchStatement(expectedRows, actualRows, {
      treatMissingMoneyAsZero: true
    });

    expect(result.status).toBe('MATCH');
    expect(result.diagnostics.notes).toContain('All fields match exactly');
  });
});
