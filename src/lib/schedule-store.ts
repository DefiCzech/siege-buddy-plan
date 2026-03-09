import { Schedule, DEFAULT_ACTIVITIES } from "./types";

const STORAGE_KEY = "r6s-schedule";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function loadSchedule(): Schedule {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return createDefaultSchedule();
}

export function saveSchedule(schedule: Schedule): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function createDefaultSchedule(): Schedule {
  return {
    id: generateId(),
    name: "Můj R6S Tréninkový Plán",
    activities: [...DEFAULT_ACTIVITIES],
    entries: [],
  };
}

export function encodeScheduleForShare(schedule: Schedule): string {
  return btoa(encodeURIComponent(JSON.stringify(schedule)));
}

export function decodeScheduleFromShare(encoded: string): Schedule | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

export { generateId };
