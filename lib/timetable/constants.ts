// Split out from lib/actions/timetable.ts — a "use server" file can only
// export async functions, not plain constants/types, so these live here
// instead and get re-imported by both the action file and any component
// that needs them.
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
export type Weekday = typeof WEEKDAYS[number]
export const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
}
