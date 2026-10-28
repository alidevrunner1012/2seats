/** Default suggestion: same weekday and time next week, formatted for <input type="datetime-local">. */
export function nextWeekLocal(from = new Date()): string {
  const d = new Date(from.getTime() + 7 * 24 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
