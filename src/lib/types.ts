export interface TrainingActivity {
  id: string;
  name: string;
  category: "aim" | "movement" | "knowledge" | "strategy" | "utility";
  description?: string;
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
  activities: TrainingActivity[];
  entries: ScheduleEntry[];
}

export const DAY_NAMES = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

export const CATEGORY_LABELS: Record<TrainingActivity["category"], string> = {
  aim: "Míření",
  movement: "Pohyb",
  knowledge: "Znalosti",
  strategy: "Strategie",
  utility: "Utility",
};

export const CATEGORY_COLORS: Record<TrainingActivity["category"], string> = {
  aim: "bg-red-500/20 text-red-400 border-red-500/30",
  movement: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  knowledge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  strategy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  utility: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

export const DEFAULT_ACTIVITIES: TrainingActivity[] = [
  { id: "1", name: "Názvy místností", category: "knowledge", description: "Naučit se calloutovat místnosti na mapách" },
  { id: "2", name: "Míření (Aim Lab)", category: "aim", description: "Trénink přesnosti v Aim Labu nebo T-Hunt" },
  { id: "3", name: "Pohyb", category: "movement", description: "Quick peek, strafing, crouch spam" },
  { id: "4", name: "Recoil control", category: "aim", description: "Ovládání zpětného rázu zbraní" },
  { id: "5", name: "Map knowledge", category: "knowledge", description: "Studium map layoutů a kamer" },
  { id: "6", name: "Utility usage", category: "utility", description: "Trénink hodů granátů a gadgetů" },
  { id: "7", name: "Strategie", category: "strategy", description: "Studium stratů pro útok/obranu" },
  { id: "8", name: "Crosshair placement", category: "aim", description: "Správné držení zaměřovače" },
];
