import { Platform } from "react-native";

/**
 * Calendar integration helper.
 *
 * This module attempts to load `expo-calendar` dynamically at runtime so that
 * the app can continue to bundle/run even when the native module is not
 * installed (useful for development or CI where the dependency isn't present).
 *
 * If `expo-calendar` is not available, functions will return `null` / `false`
 * and log a warning — the rest of the app must handle these cases gracefully.
 */

// Try to load expo-calendar dynamically. Use string concatenation to avoid
// static analysis by Metro bundler so the bundle doesn't fail when the module
// is missing.
let Calendar: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Calendar = require("expo" + "-calendar");
} catch (err) {
  // Module not available — integration will be disabled at runtime
  // Do not throw here to keep the app bundling-able without the native plugin.
  // The calling code should detect the absence via returned nulls/false.
  // Log the error for developer visibility.
  // Use console.warn (not throw) so Metro doesn't crash the bundling process.
  // eslint-disable-next-line no-console
  console.warn(
    "expo-calendar is not available: calendar integration disabled",
    err,
  );
}

export type HabitCalendarPayload = {
  id?: string;
  title: string;
  notes?: string;
  // ISO string or Date
  startDate?: string | Date;
  // ISO string or Date
  endDate?: string | Date;
  allDay?: boolean;
};

/**
 * Request calendar permissions from the user.
 * Returns true when permission is granted.
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  if (
    !Calendar ||
    typeof Calendar.requestCalendarPermissionsAsync !== "function"
  ) {
    console.warn("requestCalendarPermissions: expo-calendar not available");
    return false;
  }

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted";
  } catch (err) {
    console.warn("requestCalendarPermissions error", err);
    return false;
  }
}

async function getDefaultCalendarSource() {
  if (!Calendar || typeof Calendar.getCalendarsAsync !== "function")
    return null;

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes?.EVENT,
  );
  if (!calendars || calendars.length === 0) return null;

  // Prefer a calendar owned by the user (OWNER) or a local calendar
  const owner = calendars.find(
    (c: any) => c.accessLevel === Calendar.CalendarAccessLevel?.OWNER,
  );
  if (owner) return owner.source || null;

  // Fallback to first calendar's source
  return calendars[0].source || null;
}

/**
 * Ensure we have an application calendar to write events into. If a calendar named
 * "Habit Tracker" already exists, return its id. Otherwise create a new local calendar.
 */
export async function getOrCreateAppCalendar(): Promise<string | null> {
  if (!Calendar || typeof Calendar.getCalendarsAsync !== "function") {
    console.warn("getOrCreateAppCalendar: expo-calendar not available");
    return null;
  }

  try {
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const existing = calendars.find((c: any) => c.title === "Habit Tracker");
    if (existing) return existing.id;

    const defaultSource = await getDefaultCalendarSource();

    const newCalendarId = await Calendar.createCalendarAsync({
      title: "Habit Tracker",
      color: "#2196F3",
      entityType: Calendar.EntityTypes.EVENT,
      // Platform-specific source handling
      sourceId: defaultSource?.id,
      source: defaultSource ?? { name: "Habit Tracker", isLocalAccount: true },
      name: "habit_tracker_calendar",
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel?.OWNER,
    });

    return newCalendarId;
  } catch (err) {
    console.warn("getOrCreateAppCalendar error", err);
    return null;
  }
}

/**
 * Add a habit/goal to the system calendar as an event.
 * Returns the created event id on success or null on failure.
 *
 * Behavior:
 * - If startDate is not provided, the event will be created for "now".
 * - If endDate is not provided, endDate = startDate + 1 hour (for non-allDay events).
 */
export async function addHabitToCalendar(
  payload: HabitCalendarPayload,
): Promise<string | null> {
  if (!Calendar || typeof Calendar.createEventAsync !== "function") {
    console.warn("addHabitToCalendar: expo-calendar not available");
    return null;
  }

  try {
    const granted = await requestCalendarPermissions();
    if (!granted) {
      console.warn("Calendar permission not granted");
      return null;
    }

    const calendarId = await getOrCreateAppCalendar();
    if (!calendarId) {
      console.warn("No calendar available to create event");
      return null;
    }

    const start = payload.startDate ? new Date(payload.startDate) : new Date();
    let end: Date;
    if (payload.allDay) {
      // allDay events should be full-day and have the same date for start/end (end is next day)
      end = payload.endDate
        ? new Date(payload.endDate)
        : new Date(start.getTime() + 24 * 60 * 60 * 1000);
    } else {
      end = payload.endDate
        ? new Date(payload.endDate)
        : new Date(start.getTime() + 60 * 60 * 1000);
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: payload.title,
      notes: payload.notes ?? "",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      allDay: !!payload.allDay,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return eventId;
  } catch (err) {
    console.warn("addHabitToCalendar error", err);
    return null;
  }
}

/**
 * Delete a calendar event by id.
 * Returns true when deletion succeeded.
 */
export async function deleteEventById(eventId: string): Promise<boolean> {
  if (!Calendar || typeof Calendar.deleteEventAsync !== "function") {
    console.warn("deleteEventById: expo-calendar not available");
    return false;
  }

  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (err) {
    console.warn("deleteEventById error", err);
    return false;
  }
}

/**
 * Delete multiple events by their IDs. Returns summary of deletions.
 */
export async function deleteEventsByIds(
  eventIds: string[],
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;
  if (!eventIds || eventIds.length === 0) return { deleted, failed };

  for (const id of eventIds) {
    try {
      const ok = await deleteEventById(id);
      if (ok) deleted += 1;
      else failed += 1;
    } catch (e) {
      failed += 1;
    }
  }
  return { deleted, failed };
}

export default {
  requestCalendarPermissions,
  getOrCreateAppCalendar,
  addHabitToCalendar,
  deleteEventById,
  deleteEventsByIds,
};
