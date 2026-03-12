const BD_TIMEZONE = 'Asia/Dhaka';

/**
 * Returns a new Date object representing the current time in Bangladesh.
 */
export function getBDNow(): Date {
    return new Date();
}

/**
 * Returns a Date object representing the start of day (00:00:00.000) 
 * for the given date in Bangladesh Time.
 */
export function getBDStartOfDay(date: Date | string | number = new Date()): Date {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: BD_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d);

    const year = Number(parts.find(p => p.type === 'year')?.value);
    const month = Number(parts.find(p => p.type === 'month')?.value);
    const day = Number(parts.find(p => p.type === 'day')?.value);

    // Create a date at 00:00:00 in Asia/Dhaka.
    // The most reliable way is to use a timestamp that we know is 00:00:00 Dhaka.
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`;
    
    // We can use the fact that Dhaka is always UTC+6
    // So 00:00:00 Dhaka is 18:00:00 UTC of the PREVIOUS day.
    // However, to be extra safe and generic:
    const tempDate = new Date(`${dateStr}+06:00`);
    return tempDate;
}

/**
 * Returns a Date object representing the end of day (23:59:59.999) 
 * for the given date in Bangladesh Time.
 */
export function getBDEndOfDay(date: Date | string | number = new Date()): Date {
    const start = getBDStartOfDay(date);
    return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Parses a YYYY-MM string into BD start and end of month
 */
export function getBDMonthRange(monthYear: string) {
    const [year, month] = monthYear.split('-').map(Number);
    
    const startDate = new Date(`${year}-${month!.toString().padStart(2, '0')}-01T00:00:00+06:00`);
    
    // Get last day of month
    const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
    const endDate = new Date(`${year}-${month!.toString().padStart(2, '0')}-${lastDay}T23:59:59.999+06:00`);
    
    return { startDate, endDate, year: year!, monthNum: month! };
}

/**
 * Returns the day of the week (0-6) in Bangladesh Time
 */
export function getBDWeekDay(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: BD_TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(date);

    const year = Number(parts.find(p => p.type === 'year')?.value);
    const month = Number(parts.find(p => p.type === 'month')?.value);
    const day = Number(parts.find(p => p.type === 'day')?.value);

    // This local date (server local) will have the same Y/M/D as BD
    // and its .getDay() will be correct as long as we don't cross midnights in the server local time.
    // Actually, just creating a date with Y, M-1, D in local time is safest for getDay().
    return new Date(year, month - 1, day).getDay();
}

/**
 * Formats a date to Bangladesh local time string for logging/display
 */
export function formatBD(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: BD_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(date);
}
