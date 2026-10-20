/**
 * Date range calculation and boundary helpers for Solure Scents Admin Analytics.
 * Authoritative timezone: Africa/Lagos (WAT, UTC+1, no DST).
 */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface ResolvedDateRange {
  preset: DateRangePreset;
  label: string;
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  comparisonLabel: string;
  granularity: "daily" | "weekly" | "monthly";
}

export const LAGOS_UTC_OFFSET_HOURS = 1;
export const LAGOS_OFFSET_MS = LAGOS_UTC_OFFSET_HOURS * 60 * 60 * 1000; // UTC+1 (WAT, no DST)

/**
 * Returns current date/time shifted to Lagos local time.
 */
export function getLagosNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + LAGOS_OFFSET_MS);
}

/**
 * Converts Lagos year, month (0-indexed), date into a UTC Date representing the start of that day in Lagos.
 */
function lagosDayStartToUTC(year: number, month: number, date: number): Date {
  // Midnight Lagos is 23:00 UTC previous day
  return new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - LAGOS_OFFSET_MS);
}

/**
 * Converts Lagos year, month (0-indexed), date into a UTC Date representing the end of that day in Lagos.
 */
function lagosDayEndToUTC(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - LAGOS_OFFSET_MS);
}

/**
 * Resolves date boundaries (both current and comparison previous period)
 * in Africa/Lagos timezone with inclusive start and end UTC timestamps.
 */
export function resolveDateRange(
  presetInput?: string | null,
  customFrom?: string | null,
  customTo?: string | null,
): ResolvedDateRange {
  const validPreset = (presetInput || "30d") as DateRangePreset;
  const lagosNow = getLagosNow();

  const currentYear = lagosNow.getUTCFullYear();
  const currentMonth = lagosNow.getUTCMonth();
  const currentDate = lagosNow.getUTCDate();

  let startDate: Date;
  let endDate: Date;
  let previousStartDate: Date;
  let previousEndDate: Date;
  let label = "Last 30 Days";
  let comparisonLabel = "vs. previous 30 days";
  let granularity: "daily" | "weekly" | "monthly" = "daily";
  let finalPreset: DateRangePreset = validPreset;

  switch (validPreset) {
    case "today": {
      label = "Today";
      comparisonLabel = "vs. yesterday";
      granularity = "daily";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      previousStartDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 1);
      previousEndDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 1);
      break;
    }

    case "yesterday": {
      label = "Yesterday";
      comparisonLabel = "vs. day before yesterday";
      granularity = "daily";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 1);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 1);

      previousStartDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 2);
      previousEndDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 2);
      break;
    }

    case "7d": {
      label = "Last 7 Days";
      comparisonLabel = "vs. previous 7 days";
      granularity = "daily";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 6);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      previousStartDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 13);
      previousEndDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 7);
      break;
    }

    case "14d": {
      label = "Last 14 Days";
      comparisonLabel = "vs. previous 14 days";
      granularity = "daily";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 13);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      previousStartDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 27);
      previousEndDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 14);
      break;
    }

    case "30d":
    default: {
      finalPreset = "30d";
      label = "Last 30 Days";
      comparisonLabel = "vs. previous 30 days";
      granularity = "daily";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 29);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      previousStartDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 59);
      previousEndDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 30);
      break;
    }

    case "90d": {
      label = "Last 90 Days";
      comparisonLabel = "vs. previous 90 days";
      granularity = "weekly";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 89);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      previousStartDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 179);
      previousEndDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate - 90);
      break;
    }

    case "this_month": {
      label = "This Month";
      comparisonLabel = "vs. previous month";
      granularity = "daily";
      startDate = lagosDayStartToUTC(currentYear, currentMonth, 1);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      // Previous month up to the same day of the month or last day of previous month
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const daysInPrevMonth = new Date(Date.UTC(prevMonthYear, prevMonthIdx + 1, 0)).getUTCDate();
      const prevMonthEndDay = Math.min(currentDate, daysInPrevMonth);

      previousStartDate = lagosDayStartToUTC(prevMonthYear, prevMonthIdx, 1);
      previousEndDate = lagosDayEndToUTC(prevMonthYear, prevMonthIdx, prevMonthEndDay);
      break;
    }

    case "last_month": {
      label = "Last Month";
      comparisonLabel = "vs. month prior";
      granularity = "daily";
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const daysInPrevMonth = new Date(Date.UTC(prevMonthYear, prevMonthIdx + 1, 0)).getUTCDate();

      startDate = lagosDayStartToUTC(prevMonthYear, prevMonthIdx, 1);
      endDate = lagosDayEndToUTC(prevMonthYear, prevMonthIdx, daysInPrevMonth);

      const monthPriorYear = prevMonthIdx === 0 ? prevMonthYear - 1 : prevMonthYear;
      const monthPriorIdx = prevMonthIdx === 0 ? 11 : prevMonthIdx - 1;
      const daysInMonthPrior = new Date(Date.UTC(monthPriorYear, monthPriorIdx + 1, 0)).getUTCDate();

      previousStartDate = lagosDayStartToUTC(monthPriorYear, monthPriorIdx, 1);
      previousEndDate = lagosDayEndToUTC(monthPriorYear, monthPriorIdx, daysInMonthPrior);
      break;
    }

    case "this_year": {
      label = "This Year";
      comparisonLabel = "vs. previous year";
      granularity = "monthly";
      startDate = lagosDayStartToUTC(currentYear, 0, 1);
      endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);

      previousStartDate = lagosDayStartToUTC(currentYear - 1, 0, 1);
      previousEndDate = lagosDayEndToUTC(currentYear - 1, currentMonth, currentDate);
      break;
    }

    case "custom": {
      finalPreset = "custom";
      if (customFrom && customTo) {
        const fromParts = customFrom.split("-").map(Number);
        const toParts = customTo.split("-").map(Number);
        const fromY = fromParts[0] ?? currentYear;
        const fromM = fromParts[1] ?? currentMonth + 1;
        const fromD = fromParts[2] ?? currentDate;
        const toY = toParts[0] ?? currentYear;
        const toM = toParts[1] ?? currentMonth + 1;
        const toD = toParts[2] ?? currentDate;
        startDate = lagosDayStartToUTC(fromY, fromM - 1, fromD);
        endDate = lagosDayEndToUTC(toY, toM - 1, toD);
      } else {
        startDate = lagosDayStartToUTC(currentYear, currentMonth, currentDate - 29);
        endDate = lagosDayEndToUTC(currentYear, currentMonth, currentDate);
      }

      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - diffMs);

      label = `Custom (${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)})`;
      comparisonLabel = `vs. previous ${diffDays} days`;

      if (diffDays <= 14) {
        granularity = "daily";
      } else if (diffDays <= 90) {
        granularity = "weekly";
      } else {
        granularity = "monthly";
      }
      break;
    }
  }

  return {
    preset: finalPreset,
    label,
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    comparisonLabel,
    granularity,
  };
}

/**
 * Calculates percentage change between current and previous periods.
 * Returns null when baseline is 0 or undefined, indicating a neutral display.
 */
export function calculatePeriodChange(
  current: number,
  previous: number,
): { percent: number; isPositive: boolean; isNeutral: boolean } {
  if (previous === 0) {
    if (current === 0) {
      return { percent: 0, isPositive: true, isNeutral: true };
    }
    // Growth from zero is positive, marked as neutral indicator to avoid misleading "+Infinity%"
    return { percent: 100, isPositive: true, isNeutral: true };
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  return {
    percent: Math.abs(rounded),
    isPositive: rounded >= 0,
    isNeutral: rounded === 0,
  };
}

/**
 * Evaluates whether a timestamp falls within a relative date filter window.
 */
export function matchesDateWindow(createdAt: string, window: string): boolean {
  if (!window || window === "all") return true;
  const createdMs = new Date(createdAt).getTime();
  const diffMs = Date.now() - createdMs;
  if (window === "today") return diffMs <= 24 * 60 * 60 * 1000;
  if (window === "7d") return diffMs <= 7 * 24 * 60 * 60 * 1000;
  if (window === "30d") return diffMs <= 30 * 24 * 60 * 60 * 1000;
  if (window === "90d") return diffMs <= 90 * 24 * 60 * 60 * 1000;
  return true;
}
