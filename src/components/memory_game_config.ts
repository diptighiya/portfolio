// All tunable constants for the OS Memory Allocator game.
// Kept in one place so gameplay balance can be tweaked without touching UI code.

type Priority = "CRITICAL" | "NORMAL" | "LOW";

export const TOTAL_MEMORY = 1000;
export const CELL_COUNT = 40;
export const KB_PER_CELL = TOTAL_MEMORY / CELL_COUNT;

export const MAX_QUEUE = 3;
export const STARTING_LIVES = 3;

export const COMPACT_COOLDOWN = 30;
export const FRAG_THRESHOLD = 70;
export const OOM_THRESHOLD = 90;
export const GC_PAUSE_DURATION = 3;
export const OOM_KILL_INTERVAL = 10000;

export const LEAK_INTERVAL: Record<number, number> = {
  1: 30000,
  2: 22000,
  3: 15000,
};

export const REQUEST_SPAWN_RATE: Record<number, number> = {
  1: 8000,
  2: 5000,
  3: 3000,
};

export const REQUEST_TTL: Record<1 | 2 | 3, Record<Priority, number>> = {
  1: { CRITICAL: 14, NORMAL: 10, LOW: 7 },
  2: { CRITICAL: 11, NORMAL: 8, LOW: 5 },
  3: { CRITICAL: 8, NORMAL: 6, LOW: 4 },
};

export const LEVEL_THRESHOLDS: Record<number, number> = {
  2: 300,
  3: 700,
};

export const ALLOCATION_POINTS: Record<Priority, number> = {
  CRITICAL: 20,
  NORMAL: 10,
  LOW: 5,
};

export const KILL_PENALTY = 15;
export const EXPIRY_PENALTY = 5;
export const MIN_USEFUL_HOLE = 50;

export const PROCESS_LIFETIME: [number, number] = [10, 35];

export const PROGRAM_NAMES = [
  "Chrome", "Slack", "Spotify", "Docker", "Figma", "Xcode", "Terminal",
  "Safari", "Notion", "VSCode", "Postgres", "Redis", "Nginx", "Node",
];

export const PRIORITY_COLORS: Record<Priority, string> = {
  CRITICAL: "#f78166",
  NORMAL: "#ffa657",
  LOW: "#56d364",
};

export const PRIORITY_EMOJI: Record<Priority, string> = {
  CRITICAL: "🔴",
  NORMAL: "🟡",
  LOW: "🟢",
};
