/**
 * Format time from a Date or string to display format without timezone conversion
 * IMPORTANT: All times in the database are already in Las Vegas timezone
 * This function simply formats them for display without any conversion
 */
export function formatSessionTime(dateTime: Date | string): string {
  // If it's already a string like "10:30 AM", just return it
  if (typeof dateTime === 'string' && dateTime.includes(':') && (dateTime.includes('AM') || dateTime.includes('PM'))) {
    return dateTime;
  }

  // Parse the date treating it as already being in Las Vegas time
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;

  // Extract hours and minutes directly without timezone conversion
  const hours = date.getUTCHours(); // Use UTC to avoid local timezone conversion
  const minutes = date.getUTCMinutes();

  // Format to 12-hour time
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Alternative method that parses ISO strings correctly
 * Use this when dates come as ISO strings from the database
 */
export function formatLasVegasTime(dateTimeStr: string): string {
  // If it's already formatted, return as-is
  if (dateTimeStr.includes(':') && (dateTimeStr.includes('AM') || dateTimeStr.includes('PM'))) {
    return dateTimeStr;
  }

  // For ISO strings like "2025-10-15T10:30:00.000Z"
  // Extract time components directly from the string
  const match = dateTimeStr.match(/T(\d{2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = match[2];

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period}`;
  }

  // Fallback to basic formatting
  return formatSessionTime(dateTimeStr);
}