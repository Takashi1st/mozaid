/**
 * Lightweight Zero-Dependency Test Framework & Assertion Library for Mozaid AI E2E Suites
 * Compatible with Node 22 native execution and Vitest runner semantics.
 */

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
  status?: 'passed' | 'failed' | 'skipped';
  error?: Error;
  durationMs?: number;
}

export interface TestSuite {
  name: string;
  beforeEachFns: Array<() => void | Promise<void>>;
  afterEachFns: Array<() => void | Promise<void>>;
  tests: TestCase[];
}

export interface SuiteReport {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  failures: Array<{ testName: string; error: string; stack?: string }>;
}

export interface OverallReport {
  suites: SuiteReport[];
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDurationMs: number;
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;
const globalBeforeEachFns: Array<() => void | Promise<void>> = [];
const globalAfterEachFns: Array<() => void | Promise<void>> = [];

export function describe(name: string, fn: () => void): void {
  const previousSuite = currentSuite;
  const newSuite: TestSuite = {
    name,
    beforeEachFns: [],
    afterEachFns: [],
    tests: [],
  };
  suites.push(newSuite);
  currentSuite = newSuite;
  try {
    fn();
  } finally {
    currentSuite = previousSuite;
  }
}

export function it(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    const defaultSuite: TestSuite = {
      name: 'Default Suite',
      beforeEachFns: [],
      afterEachFns: [],
      tests: [],
    };
    suites.push(defaultSuite);
    currentSuite = defaultSuite;
  }
  currentSuite.tests.push({ name, fn });
}

export function beforeEach(fn: () => void | Promise<void>): void {
  if (currentSuite) {
    currentSuite.beforeEachFns.push(fn);
  } else {
    globalBeforeEachFns.push(fn);
  }
}

export function afterEach(fn: () => void | Promise<void>): void {
  if (currentSuite) {
    currentSuite.afterEachFns.push(fn);
  } else {
    globalAfterEachFns.push(fn);
  }
}

// Minimalist Expectation Interface
export class Expectation<T> {
  actual: T;
  isNot: boolean;

  constructor(actual: T, isNot: boolean = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  private fail(message: string): never {
    throw new Error(message);
  }

  toBe(expected: unknown): void {
    const match = Object.is(this.actual, expected);
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`);
    }
  }

  toEqual(expected: unknown): void {
    const actualStr = JSON.stringify(this.actual);
    const expectedStr = JSON.stringify(expected);
    const match = actualStr === expectedStr;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${actualStr} ${this.isNot ? 'not to equal' : 'to equal'} ${expectedStr}`);
    }
  }

  toBeTruthy(): void {
    const match = Boolean(this.actual);
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'to be falsy' : 'to be truthy'}`);
    }
  }

  toBeFalsy(): void {
    const match = !this.actual;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'to be truthy' : 'to be falsy'}`);
    }
  }

  toBeDefined(): void {
    const match = this.actual !== undefined;
    if (this.isNot ? match : !match) {
      this.fail(`Expected value ${this.isNot ? 'to be undefined' : 'to be defined'}`);
    }
  }

  toBeUndefined(): void {
    const match = this.actual === undefined;
    if (this.isNot ? match : !match) {
      this.fail(`Expected value ${this.isNot ? 'not to be undefined' : 'to be undefined'}`);
    }
  }

  toBeNull(): void {
    const match = this.actual === null;
    if (this.isNot ? match : !match) {
      this.fail(`Expected value ${this.isNot ? 'not to be null' : 'to be null'}`);
    }
  }

  toBeGreaterThan(expected: number): void {
    const match = (this.actual as unknown as number) > expected;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${this.actual} ${this.isNot ? 'not to be greater than' : 'to be greater than'} ${expected}`);
    }
  }

  toBeGreaterThanOrEqual(expected: number): void {
    const match = (this.actual as unknown as number) >= expected;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${this.actual} ${this.isNot ? 'not to be greater than or equal to' : 'to be greater than or equal to'} ${expected}`);
    }
  }

  toBeLessThan(expected: number): void {
    const match = (this.actual as unknown as number) < expected;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${this.actual} ${this.isNot ? 'not to be less than' : 'to be less than'} ${expected}`);
    }
  }

  toBeLessThanOrEqual(expected: number): void {
    const match = (this.actual as unknown as number) <= expected;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${this.actual} ${this.isNot ? 'not to be less than or equal to' : 'to be less than or equal to'} ${expected}`);
    }
  }

  toBeCloseTo(expected: number, numDigits: number = 2): void {
    const diff = Math.abs((this.actual as unknown as number) - expected);
    const tolerance = Math.pow(10, -numDigits) / 2;
    const match = diff < tolerance;
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${this.actual} ${this.isNot ? 'not to be close to' : 'to be close to'} ${expected} within ${tolerance}`);
    }
  }

  toContain(item: unknown): void {
    let match = false;
    if (typeof this.actual === 'string') {
      match = this.actual.includes(item as string);
    } else if (Array.isArray(this.actual)) {
      match = this.actual.some((el) => Object.is(el, item) || JSON.stringify(el) === JSON.stringify(item));
    }
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(item)}`);
    }
  }

  toMatch(regex: RegExp | string): void {
    const r = typeof regex === 'string' ? new RegExp(regex) : regex;
    const match = r.test(String(this.actual));
    if (this.isNot ? match : !match) {
      this.fail(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to match' : 'to match'} ${regex}`);
    }
  }

  toThrow(expectedMessage?: string | RegExp): void {
    if (typeof this.actual !== 'function') {
      this.fail('Expected actual value to be a callable function');
    }
    let threw = false;
    let thrownError: unknown = null;
    try {
      (this.actual as Function)();
    } catch (e) {
      threw = true;
      thrownError = e;
    }

    if (!this.isNot && !threw) {
      this.fail('Expected function to throw an error, but it did not throw.');
    }
    if (this.isNot && threw) {
      this.fail(`Expected function not to throw, but it threw: ${thrownError}`);
    }
    if (threw && expectedMessage) {
      const msg = thrownError instanceof Error ? thrownError.message : String(thrownError);
      if (typeof expectedMessage === 'string' && !msg.includes(expectedMessage)) {
        this.fail(`Expected error message to include "${expectedMessage}", but got "${msg}"`);
      } else if (expectedMessage instanceof RegExp && !expectedMessage.test(msg)) {
        this.fail(`Expected error message to match ${expectedMessage}, but got "${msg}"`);
      }
    }
  }
}

export function expect<T>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

export function clearSuites(): void {
  suites.length = 0;
  currentSuite = null;
}

export function getSuites(): TestSuite[] {
  return suites;
}

export async function runAllSuites(): Promise<OverallReport> {
  const overallStart = Date.now();
  const suiteReports: SuiteReport[] = [];

  for (const suite of suites) {
    const suiteStart = Date.now();
    let passed = 0;
    let failed = 0;
    const failures: SuiteReport['failures'] = [];

    for (const test of suite.tests) {
      const testStart = Date.now();
      try {
        for (const gbf of globalBeforeEachFns) {
          await gbf();
        }
        for (const bf of suite.beforeEachFns) {
          await bf();
        }
        await test.fn();
        for (const af of suite.afterEachFns) {
          await af();
        }
        for (const gaf of globalAfterEachFns) {
          await gaf();
        }
        test.status = 'passed';
        test.durationMs = Date.now() - testStart;
        passed++;
      } catch (err: unknown) {
        test.status = 'failed';
        test.durationMs = Date.now() - testStart;
        const e = err instanceof Error ? err : new Error(String(err));
        test.error = e;
        failed++;
        failures.push({
          testName: test.name,
          error: e.message,
          stack: e.stack,
        });
      }
    }

    suiteReports.push({
      suiteName: suite.name,
      total: suite.tests.length,
      passed,
      failed,
      durationMs: Date.now() - suiteStart,
      failures,
    });
  }

  const totalPassed = suiteReports.reduce((acc, s) => acc + s.passed, 0);
  const totalFailed = suiteReports.reduce((acc, s) => acc + s.failed, 0);
  const totalTests = totalPassed + totalFailed;

  return {
    suites: suiteReports,
    totalSuites: suiteReports.length,
    totalTests,
    totalPassed,
    totalFailed,
    totalDurationMs: Date.now() - overallStart,
  };
}
