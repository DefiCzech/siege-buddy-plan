export interface Category {
  id: string;
  name: string;
  icon: string; // emoji or text
  color: string; // tailwind color classes
}

export interface TrainingActivity {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  videoUrl?: string;
}

export interface ScheduleEntry {
  dayOfWeek: number; // 0=Monday ... 6=Sunday
  activityId: string;
  completed: boolean;
  durationMinutes?: number;
}

export interface Schedule {
  id: string;
  name: string;
  categories: Category[];
  activities: TrainingActivity[];
  entries: ScheduleEntry[];
}

export const DAY_NAMES = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

export const DEFAULT_CATEGORY_COLORS = [
  "bg-red-500/20 text-red-400 border-red-500/30",
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "aim", name: "Míření", icon: "🎯", color: DEFAULT_CATEGORY_COLORS[0] },
  { id: "movement", name: "Pohyb", icon: "🏃", color: DEFAULT_CATEGORY_COLORS[1] },
  { id: "knowledge", name: "Znalosti", icon: "🧠", color: DEFAULT_CATEGORY_COLORS[2] },
  { id: "strategy", name: "Strategie", icon: "♟️", color: DEFAULT_CATEGORY_COLORS[3] },
  { id: "utility", name: "Utility", icon: "💣", color: DEFAULT_CATEGORY_COLORS[4] },
];

export const DEFAULT_ACTIVITIES: TrainingActivity[] = [
  { id: "1", name: "Názvy místností", categoryId: "knowledge", description: "Naučit se calloutovat místnosti na mapách" },
  { id: "2", name: "Míření (Aim Lab)", categoryId: "aim", description: "Trénink přesnosti v Aim Labu nebo T-Hunt" },
  { id: "3", name: "Pohyb", categoryId: "movement", description: "Quick peek, strafing, crouch spam" },
  { id: "4", name: "Recoil control", categoryId: "aim", description: "Ovládání zpětného rázu zbraní" },
  { id: "5", name: "Map knowledge", categoryId: "knowledge", description: "Studium map layoutů a kamer" },
  { id: "6", name: "Utility usage", categoryId: "utility", description: "Trénink hodů granátů a gadgetů" },
  { id: "7", name: "Strategie", categoryId: "strategy", description: "Studium stratů pro útok/obranu" },
  { id: "8", name: "Crosshair placement", categoryId: "aim", description: "Správné držení zaměřovače" },
];
