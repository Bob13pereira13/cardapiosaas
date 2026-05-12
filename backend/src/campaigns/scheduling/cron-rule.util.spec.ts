import { nextRunFromCron, validateCron } from './cron-rule.util';

describe('validateCron', () => {
  it.each([
    ['* * * * *', true],
    ['*/5 * * * *', true],
    ['0 9 * * 1', true],
    ['0 0 1 * *', true],
    ['30 8 * * 1-5', true],
  ])('accepts valid expression %j', (expr, expected) => {
    expect(validateCron(expr)).toBe(expected);
  });

  it.each([['invalid'], ['abc def ghi'], ['not a cron']])(
    'rejects invalid expression %j',
    (expr) => {
      expect(validateCron(expr)).toBe(false);
    },
  );

  it('rejects empty string', () => {
    expect(validateCron('')).toBe(false);
  });
});

describe('nextRunFromCron', () => {
  it('returns a Date instance for valid expression', () => {
    const after = new Date('2026-01-01T10:00:00.000Z');
    const next = nextRunFromCron('*/5 * * * *', after);
    expect(next).toBeInstanceOf(Date);
  });

  it('returned date is after the "after" argument', () => {
    const after = new Date('2026-05-12T15:30:00.000Z');
    const next = nextRunFromCron('* * * * *', after);
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it('*/5 — next run falls on a 5-min boundary', () => {
    const after = new Date('2026-01-01T10:02:00.000Z');
    const next = nextRunFromCron('*/5 * * * *', after);
    expect(next!.getMinutes() % 5).toBe(0);
  });

  it('every Monday 9am — next run is a Monday', () => {
    // 2026-01-01 is a Thursday
    const after = new Date('2026-01-01T00:00:00.000Z');
    const next = nextRunFromCron('0 9 * * 1', after);
    expect(next).toBeInstanceOf(Date);
    expect(next!.getDay()).toBe(1); // Monday
  });

  it('consecutive calls advance by one period', () => {
    const after = new Date('2026-01-01T10:00:00.000Z');
    const first = nextRunFromCron('*/10 * * * *', after)!;
    const second = nextRunFromCron('*/10 * * * *', first)!;
    expect(second.getTime() - first.getTime()).toBe(10 * 60 * 1000);
  });

  it('returns null for invalid expression', () => {
    expect(nextRunFromCron('invalid', new Date())).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(nextRunFromCron('', new Date())).toBeNull();
  });
});
