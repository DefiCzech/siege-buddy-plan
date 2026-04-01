export interface Category {
  id: string;
  name: string;
  icon: string; // emoji or text
  color: string; // tailwind color classes
}

export type ActivityType = "default" | "map-learning" | "operator-training";

export interface TrainingActivity {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  videoUrl?: string;
  activityType?: ActivityType;
}

export interface ScheduleEntry {
  dayOfWeek: number; // used as sortOrder for sequential training list
  activityId: string;
  assignedMaps?: string[]; // maps assigned to practice for this entry
  assignedOperators?: string[]; // operators assigned to practice for this entry
  durationMinutes?: number; // recommended training duration in minutes
}

export interface TrainingCompletion {
  id?: string;
  activityId: string;
  completedDate: string; // YYYY-MM-DD
  durationMinutes?: number;
  completedMaps?: string[];
}

export interface R6SMap {
  name: string;
  ranked: boolean;
}

export const R6S_MAPS: R6SMap[] = [
  { name: "Bank", ranked: true },
  { name: "Border", ranked: true },
  { name: "Chalet", ranked: true },
  { name: "Clubhouse", ranked: true },
  { name: "Coastline", ranked: false },
  { name: "Consulate", ranked: true },
  { name: "Emerald Plains", ranked: false },
  { name: "Favela", ranked: true },
  { name: "Fortress", ranked: true },
  { name: "Kafe Dostoyevsky", ranked: true },
  { name: "Kanal", ranked: true },
  { name: "Lair", ranked: true },
  { name: "Nighthaven Labs", ranked: true },
  { name: "Oregon", ranked: false },
  { name: "Outback", ranked: false },
  { name: "Skyscraper", ranked: true },
  { name: "Theme Park", ranked: true },
  { name: "Villa", ranked: false },
];

export interface R6SOperator {
  name: string;
  side: "attack" | "defense";
}

export const R6S_OPERATORS: R6SOperator[] = [
  // Attackers
  { name: "Sledge", side: "attack" },
  { name: "Thatcher", side: "attack" },
  { name: "Ash", side: "attack" },
  { name: "Thermite", side: "attack" },
  { name: "Twitch", side: "attack" },
  { name: "Montagne", side: "attack" },
  { name: "Glaz", side: "attack" },
  { name: "Fuze", side: "attack" },
  { name: "Blitz", side: "attack" },
  { name: "IQ", side: "attack" },
  { name: "Buck", side: "attack" },
  { name: "Blackbeard", side: "attack" },
  { name: "Capitão", side: "attack" },
  { name: "Hibana", side: "attack" },
  { name: "Jackal", side: "attack" },
  { name: "Ying", side: "attack" },
  { name: "Zofia", side: "attack" },
  { name: "Dokkaebi", side: "attack" },
  { name: "Lion", side: "attack" },
  { name: "Finka", side: "attack" },
  { name: "Maverick", side: "attack" },
  { name: "Nomad", side: "attack" },
  { name: "Gridlock", side: "attack" },
  { name: "Nøkk", side: "attack" },
  { name: "Amaru", side: "attack" },
  { name: "Kali", side: "attack" },
  { name: "Iana", side: "attack" },
  { name: "Ace", side: "attack" },
  { name: "Zero", side: "attack" },
  { name: "Flores", side: "attack" },
  { name: "Osa", side: "attack" },
  { name: "Sens", side: "attack" },
  { name: "Grim", side: "attack" },
  { name: "Brava", side: "attack" },
  { name: "Ram", side: "attack" },
  { name: "Deimos", side: "attack" },
  { name: "Striker", side: "attack" },
  // Defenders
  { name: "Smoke", side: "defense" },
  { name: "Mute", side: "defense" },
  { name: "Castle", side: "defense" },
  { name: "Pulse", side: "defense" },
  { name: "Doc", side: "defense" },
  { name: "Rook", side: "defense" },
  { name: "Kapkan", side: "defense" },
  { name: "Tachanka", side: "defense" },
  { name: "Jäger", side: "defense" },
  { name: "Bandit", side: "defense" },
  { name: "Frost", side: "defense" },
  { name: "Valkyrie", side: "defense" },
  { name: "Caveira", side: "defense" },
  { name: "Echo", side: "defense" },
  { name: "Mira", side: "defense" },
  { name: "Lesion", side: "defense" },
  { name: "Ela", side: "defense" },
  { name: "Vigil", side: "defense" },
  { name: "Maestro", side: "defense" },
  { name: "Alibi", side: "defense" },
  { name: "Clash", side: "defense" },
  { name: "Kaid", side: "defense" },
  { name: "Mozzie", side: "defense" },
  { name: "Warden", side: "defense" },
  { name: "Goyo", side: "defense" },
  { name: "Wamai", side: "defense" },
  { name: "Oryx", side: "defense" },
  { name: "Melusi", side: "defense" },
  { name: "Aruni", side: "defense" },
  { name: "Thunderbird", side: "defense" },
  { name: "Thorn", side: "defense" },
  { name: "Azami", side: "defense" },
  { name: "Solis", side: "defense" },
  { name: "Fenrir", side: "defense" },
  { name: "Tubarão", side: "defense" },
  { name: "Skopos", side: "defense" },
];

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
  { id: "1", name: "Názvy místností", categoryId: "knowledge", description: "Naučit se calloutovat místnosti na mapách", activityType: "map-learning" },
  { id: "2", name: "Míření (Aim Lab)", categoryId: "aim", description: "Trénink přesnosti v Aim Labu nebo T-Hunt" },
  { id: "3", name: "Pohyb", categoryId: "movement", description: "Quick peek, strafing, crouch spam" },
  { id: "4", name: "Recoil control", categoryId: "aim", description: "Ovládání zpětného rázu zbraní" },
  { id: "5", name: "Map knowledge", categoryId: "knowledge", description: "Studium map layoutů a kamer" },
  { id: "6", name: "Utility usage", categoryId: "utility", description: "Trénink hodů granátů a gadgetů" },
  { id: "7", name: "Strategie", categoryId: "strategy", description: "Studium stratů pro útok/obranu" },
  { id: "8", name: "Crosshair placement", categoryId: "aim", description: "Správné držení zaměřovače" },
];
