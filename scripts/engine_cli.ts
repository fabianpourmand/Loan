#!/usr/bin/env tsx
/**
 * Engine CLI - Prints amortization schedules for testing
 * Usage: npm run engine:cli
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as Money from '../lib/engine/money';
import * as AmortFixed from '../lib/engine/amort_fixed';
import { STANDARD_MONTHLY } from '../lib/engine/assumptions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GoldenTestCase {
  id: string;
  description: string;
  parameters: {
    principal: number;
    annualRate: number;
    termMonths: number;
    firstPaymentDate: string;
  };
  expectedScheduledPayment: number;
  expectedPeriods: Array<{
    periodNumber: number;
    interestPortion: number;
    principalPortion: number;
    endingBalance: number;
  }>;
}

interface GoldenTestFile {
  description: string;
  source: string;
  cases: GoldenTestCase[];
}

/**
 * Print a formatted amortization period
 */
function printPeriod(period: AmortFixed.AmortizationPeriod) {
  const periodNum = String(period.periodNumber).padStart(4, ' ');
  const date = period.paymentDate.toISOString().slice(0, 10);
  const payment = Money.format(period.scheduledPayment).padStart(12, ' ');
  const interest = Money.format(period.interestPortion).padStart(12, ' ');
  const principal = Money.format(period.totalPrincipal).padStart(12, ' ');
  const balance = Money.format(period.endingBalance).padStart(15, ' ');

  console.log(
    `${periodNum}  ${date}  ${payment}  ${interest}  ${principal}  ${balance}`
  );
}

/**
 * Print schedule header
 */
function printHeader() {
  console.log(
    '  #    Date        Payment       Interest     Principal        Balance'
  );
  console.log(
    '─'.repeat(80)
  );
}

/**
 * Print schedule summary
 */
function printSummary(schedule: AmortFixed.AmortizationSchedule) {
  console.log('─'.repeat(80));
  console.log('\nSummary:');
  console.log(`  Total Payments:    ${schedule.summary.numberOfPayments}`);
  console.log(`  Total Interest:    ${Money.format(schedule.summary.totalInterest)}`);
  console.log(`  Total Principal:   ${Money.format(schedule.summary.totalPrincipal)}`);
  console.log(`  Total Paid (P&I):  ${Money.format(schedule.summary.totalPayments)}`);
  console.log(`  Payoff Date:       ${schedule.summary.payoffDate.toISOString().slice(0, 10)}`);
}

/**
 * Run golden test case and compare results
 */
function runGoldenTest(testCase: GoldenTestCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Golden Test Case: ${testCase.id}`);
  console.log(`Description: ${testCase.description}`);
  console.log(`${'='.repeat(80)}\n`);

  // Convert parameters
  const params: AmortFixed.LoanParameters = {
    principal: Money.fromDollars(testCase.parameters.principal),
    annualRate: testCase.parameters.annualRate,
    termMonths: testCase.parameters.termMonths,
    firstPaymentDate: new Date(testCase.parameters.firstPaymentDate)
  };

  console.log('Loan Parameters:');
  console.log(`  Principal:    ${Money.format(params.principal)}`);
  console.log(`  Rate:         ${(params.annualRate * 100).toFixed(2)}%`);
  console.log(`  Term:         ${params.termMonths} months (${params.termMonths / 12} years)`);
  console.log(`  Start Date:   ${testCase.parameters.firstPaymentDate}`);

  // Generate schedule
  const schedule = AmortFixed.generateSchedule(params, STANDARD_MONTHLY);

  console.log(`\nScheduled Payment: ${Money.format(schedule.scheduledPayment)}`);
  console.log(
    `Expected Payment:  $${testCase.expectedScheduledPayment.toFixed(2)}`
  );

  const paymentDiff = Math.abs(
    Money.toDollars(schedule.scheduledPayment) - testCase.expectedScheduledPayment
  );
  const paymentMatch = paymentDiff < 1.0;

  console.log(
    `Match: ${paymentMatch ? '✓ PASS' : '✗ FAIL'} (diff: $${paymentDiff.toFixed(2)})`
  );

  // Print first 12 periods
  console.log(`\nFirst 12 Periods:`);
  printHeader();

  for (let i = 0; i < Math.min(12, schedule.periods.length); i++) {
    printPeriod(schedule.periods[i]);
  }

  // Validate against expected periods
  console.log(`\nValidating First ${testCase.expectedPeriods.length} Periods:`);

  let allMatch = true;
  testCase.expectedPeriods.forEach((expected) => {
    const actual = schedule.periods[expected.periodNumber - 1];

    const interestDiff = Math.abs(
      Money.toDollars(actual.interestPortion) - expected.interestPortion
    );
    const principalDiff = Math.abs(
      Money.toDollars(actual.principalPortion) - expected.principalPortion
    );
    const balanceDiff = Math.abs(
      Money.toDollars(actual.endingBalance) - expected.endingBalance
    );

    const periodMatch =
      interestDiff < 0.5 && principalDiff < 0.5 && balanceDiff < 0.5;

    if (!periodMatch) allMatch = false;

    console.log(`  Period ${expected.periodNumber}: ${periodMatch ? '✓' : '✗'}`);
    console.log(
      `    Interest:  ${Money.format(actual.interestPortion)} (expected $${expected.interestPortion.toFixed(2)}, diff $${interestDiff.toFixed(2)})`
    );
    console.log(
      `    Principal: ${Money.format(actual.principalPortion)} (expected $${expected.principalPortion.toFixed(2)}, diff $${principalDiff.toFixed(2)})`
    );
    console.log(
      `    Balance:   ${Money.format(actual.endingBalance)} (expected $${expected.endingBalance.toFixed(2)}, diff $${balanceDiff.toFixed(2)})`
    );
  });

  console.log(
    `\nOverall: ${allMatch && paymentMatch ? '✓ PASS' : '✗ FAIL'}`
  );

  printSummary(schedule);

  return allMatch && paymentMatch;
}

/**
 * Main entry point
 */
function main() {
  console.log('Loanalize Engine CLI\n');

  // Load golden test cases
  const goldenPath = path.join(
    __dirname,
    '../lib/engine/__golden__/cases.json'
  );

  if (!fs.existsSync(goldenPath)) {
    console.error(`Golden test file not found: ${goldenPath}`);
    process.exit(1);
  }

  const goldenData: GoldenTestFile = JSON.parse(
    fs.readFileSync(goldenPath, 'utf-8')
  );

  console.log(`Loaded ${goldenData.cases.length} golden test cases`);
  console.log(
    'Source: lib/engine/__golden__/cases.ts (see per-case notes for verification captures)\n'
  );

  // Run all golden tests
  const results: { id: string; pass: boolean }[] = [];

  goldenData.cases.forEach((testCase) => {
    const pass = runGoldenTest(testCase);
    results.push({ id: testCase.id, pass });
  });

  // Print final results
  console.log(`\n${'='.repeat(80)}`);
  console.log('Final Results:');
  console.log(`${'='.repeat(80)}\n`);

  const passCount = results.filter((r) => r.pass).length;
  const totalCount = results.length;

  results.forEach((result) => {
    console.log(`  ${result.pass ? '✓' : '✗'} ${result.id}`);
  });

  console.log(
    `\n${passCount}/${totalCount} tests passed (${((passCount / totalCount) * 100).toFixed(0)}%)`
  );

  if (passCount === totalCount) {
    console.log('\n✓ All golden tests passed!\n');
    process.exit(0);
  } else {
    console.log(`\n✗ ${totalCount - passCount} tests failed\n`);
    process.exit(1);
  }
}

main();
