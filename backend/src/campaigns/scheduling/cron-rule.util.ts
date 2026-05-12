import { CronExpressionParser } from 'cron-parser';

export function validateCron(expr: string): boolean {
  if (!expr.trim()) return false;
  try {
    CronExpressionParser.parse(expr);
    return true;
  } catch {
    return false;
  }
}

export function nextRunFromCron(expr: string, after: Date): Date | null {
  if (!expr.trim()) return null;
  try {
    const interval = CronExpressionParser.parse(expr, { currentDate: after });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
