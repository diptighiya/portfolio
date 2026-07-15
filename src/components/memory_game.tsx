"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  TOTAL_MEMORY, CELL_COUNT, KB_PER_CELL, MAX_QUEUE,
  COMPACT_COOLDOWN, FRAG_THRESHOLD, OOM_THRESHOLD,
  GC_PAUSE_DURATION, OOM_KILL_INTERVAL, LEAK_INTERVAL,
  REQUEST_SPAWN_RATE, REQUEST_TTL, LEVEL_THRESHOLDS,
  ALLOCATION_POINTS, KILL_PENALTY, EXPIRY_PENALTY,
  MIN_USEFUL_HOLE, STARTING_LIVES, PROCESS_LIFETIME,
  PROGRAM_NAMES, PRIORITY_COLORS, PRIORITY_EMOJI,
} from "./memory_game_config";

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = "CRITICAL" | "NORMAL" | "LOW";
type Phase = "boot" | "tutorial" | "playing" | "gameover";
type ExplainKind = "gc" | "leak" | "oom";

type Program = {
  id: string;
  name: string;
  size: number;
  color: string;
  free: boolean;
  timeLeft: number;
  age: number;
  isLeak: boolean;
};

type Request = {
  id: string;
  name: string;
  size: number;
  priority: Priority;
  timeLeft: number;
};

type LogEntry = {
  t: string;
  text: string;
  kind: "good" | "bad" | "info";
};

type Segment = {
  block: Program;
  startCell: number;
  cellCount: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 100;
const uid = () => String(idCounter++);

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function heatColor(age: number, isLeak: boolean): string {
  if (isLeak) return "#ff0044";
  const t = Math.min(age / 60, 1);
  if (t < 0.33) return `hsl(${210 - t * 90}, 80%, 55%)`;
  if (t < 0.66) return `hsl(${120 - t * 120}, 80%, 50%)`;
  return `hsl(${60 - t * 60}, 90%, 50%)`;
}

function calcFragmentation(blocks: Program[]): number {
  const freeBlocks = blocks.filter((b) => b.free);
  if (freeBlocks.length <= 1) return 0;
  const totalFree = freeBlocks.reduce((s, b) => s + b.size, 0);
  const largestFree = Math.max(...freeBlocks.map((b) => b.size));
  if (totalFree === 0) return 0;
  return Math.round((1 - largestFree / totalFree) * 100);
}

function calcMemoryUsed(blocks: Program[]): number {
  const used = blocks.filter((b) => !b.free).reduce((s, b) => s + b.size, 0);
  return Math.round((used / TOTAL_MEMORY) * 100);
}

function generateRequest(level: number): Request {
  const roll = Math.random();
  const priority: Priority = roll < 0.25 ? "CRITICAL" : roll < 0.6 ? "NORMAL" : "LOW";
  const maxSize = level === 1 ? 180 : level === 2 ? 240 : 300;
  const ttl = REQUEST_TTL[level as 1 | 2 | 3] ?? REQUEST_TTL[3];
  return {
    id: uid(),
    name: PROGRAM_NAMES[Math.floor(Math.random() * PROGRAM_NAMES.length)],
    size: randomBetween(50, maxSize),
    priority,
    timeLeft: ttl[priority],
  };
}

function getSystemTip(frag: number, memUsed: number, hasLeak: boolean): string {
  if (hasLeak) return "💧 Memory leak detected! Kill the glowing process before it suffocates RAM.";
  if (memUsed > OOM_THRESHOLD) return "💀 OOM risk! Kill a process or compact immediately.";
  if (frag > FRAG_THRESHOLD) return "⚠️ High fragmentation! Use Worst Fit or compact to preserve large holes.";
  if (frag > 40) return "📊 Fragmentation building. Consider Worst Fit for large requests.";
  if (memUsed > 70) return "🔶 Memory pressure rising. Prioritize short-lived processes.";
  return "✅ System healthy. Best Fit is optimal when fragmentation is low.";
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const makeInitialBlocks = (): Program[] => [
  { id: uid(), name: "Chrome", size: 250, color: "#79b8ff", free: false, timeLeft: 20, age: 5, isLeak: false },
  { id: uid(), name: "", size: 150, color: "", free: true, timeLeft: 0, age: 0, isLeak: false },
  { id: uid(), name: "VSCode", size: 200, color: "#56d364", free: false, timeLeft: 15, age: 3, isLeak: false },
  { id: uid(), name: "", size: 100, color: "", free: true, timeLeft: 0, age: 0, isLeak: false },
  { id: uid(), name: "Figma", size: 180, color: "#c792ea", free: false, timeLeft: 25, age: 8, isLeak: false },
  { id: uid(), name: "", size: 120, color: "", free: true, timeLeft: 0, age: 0, isLeak: false },
];

// ─── Boot Screen ─────────────────────────────────────────────────────────────

const BOOT_LINES = [
  "BOOTING OS...",
  "> Initializing memory manager...",
  "> RAM: 1000KB available",
  "> You are the OS. Programs need memory to run.",
];

function BootScreen({ onStart }: { onStart: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let lineIdx = 0;
    let charIdx = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (lineIdx >= BOOT_LINES.length) {
        setDone(true);
        return;
      }
      const target = BOOT_LINES[lineIdx];
      if (charIdx <= target.length) {
        setCurrentLine(target.slice(0, charIdx));
        charIdx++;
        setTimeout(tick, 26);
      } else {
        setVisibleLines((v) => [...v, target]);
        setCurrentLine("");
        lineIdx++;
        charIdx = 0;
        setTimeout(tick, 260);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "3rem 4rem",
        background: "#0d1117",
        color: "#56d364",
        fontFamily: "monospace",
        fontSize: "0.95rem",
        lineHeight: 1.9,
      }}
    >
      {visibleLines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {!done && (
        <div>
          {currentLine}
          <span style={{ animation: "mgBlink 1s steps(2) infinite" }}>▊</span>
        </div>
      )}
      {done && (
        <button
          onClick={onStart}
          style={{
            marginTop: "1.5rem",
            padding: "0.7rem 2rem",
            borderRadius: "6px",
            background: "rgba(86,211,100,0.12)",
            border: "1px solid #56d36488",
            color: "#56d364",
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            letterSpacing: "0.1em",
          }}
        >
          [ START ]
        </button>
      )}
      <style>{`@keyframes mgBlink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

// ─── Tutorial Overlay ────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: "1 · The Memory Map",
    body:
      "This grid is 1000KB of RAM. Each cell is 25KB. Colored bands are running programs — the color shifts blue → red as they age. Dim dotted cells are free holes waiting to be filled.",
  },
  {
    title: "2 · Incoming Requests",
    body:
      "Programs queue up asking for memory. Each has a size, a priority (🔴 CRITICAL / 🟡 NORMAL / 🟢 LOW), and a countdown. If a CRITICAL request times out or has no space — you lose a life.",
  },
  {
    title: "3 · Choose a Strategy",
    body:
      "For each request, pick FF (First Fit — fastest), BF (Best Fit — least waste), or WF (Worst Fit — preserves large holes). The strategy you pick changes fragmentation over time. Play with all three.",
  },
];

function TutorialOverlay({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const s = TUTORIAL_STEPS[step];
  if (!s) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(13,17,23,0.72)",
        backdropFilter: "blur(1px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          background: "#161b22",
          border: "1px solid #79b8ff55",
          borderRadius: "10px",
          padding: "1.3rem 1.4rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: "0.62rem", color: "#79b8ff", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          TUTORIAL · STEP {step + 1} / {TUTORIAL_STEPS.length}
        </div>
        <div style={{ color: "#e8e8e8", fontSize: "1rem", fontWeight: 700, marginBottom: "0.6rem" }}>
          {s.title}
        </div>
        <p style={{ color: "#c8c8c8", fontSize: "0.82rem", lineHeight: 1.6, marginBottom: "1.1rem" }}>
          {s.body}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            skip tutorial
          </button>
          <button
            onClick={onNext}
            style={{
              padding: "0.4rem 1.2rem",
              borderRadius: "6px",
              background: "rgba(121,184,255,0.15)",
              border: "1px solid #79b8ff88",
              color: "#79b8ff",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            {step === TUTORIAL_STEPS.length - 1 ? "BEGIN →" : "NEXT →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Explanation Overlay ───────────────────────────────────────────────

const EVENT_EXPLAINS: Record<ExplainKind, { icon: string; title: string; body: string; accent: string }> = {
  gc: {
    icon: "⏸",
    title: "GC Pause",
    body: `Fragmentation just crossed ${FRAG_THRESHOLD}%. In real systems, the OS temporarily freezes to compact memory. You lose the ability to allocate for ${GC_PAUSE_DURATION}s. Prevent this by using Worst Fit or compacting before frag climbs.`,
    accent: "#f78166",
  },
  leak: {
    icon: "💧",
    title: "Memory Leak",
    body: "A running process just leaked. Its timer stops — it will hold onto RAM forever unless you kill it manually. Leaks build fragmentation and starve future requests. Click the glowing block or its row in Running Processes to terminate.",
    accent: "#ff0044",
  },
  oom: {
    icon: "💀",
    title: "OOM Killer",
    body: `Memory usage crossed ${OOM_THRESHOLD}%. The Out-Of-Memory Killer wakes up and terminates a random process every ${OOM_KILL_INTERVAL / 1000}s until pressure drops. Free memory yourself to avoid random casualties.`,
    accent: "#f78166",
  },
};

function EventExplain({
  kind,
  onDismiss,
}: {
  kind: ExplainKind;
  onDismiss: () => void;
}) {
  const e = EVENT_EXPLAINS[kind];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(13,17,23,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 25,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          background: "#161b22",
          border: `1px solid ${e.accent}88`,
          borderRadius: "10px",
          padding: "1.3rem 1.4rem",
          boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 40px ${e.accent}22`,
        }}
      >
        <div style={{ fontSize: "0.62rem", color: e.accent, letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          NEW EVENT
        </div>
        <div style={{ color: "#e8e8e8", fontSize: "1rem", fontWeight: 700, marginBottom: "0.6rem" }}>
          {e.icon} {e.title}
        </div>
        <p style={{ color: "#c8c8c8", fontSize: "0.82rem", lineHeight: 1.6, marginBottom: "1.1rem" }}>
          {e.body}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onDismiss}
            style={{
              padding: "0.4rem 1.2rem",
              borderRadius: "6px",
              background: `${e.accent}22`,
              border: `1px solid ${e.accent}88`,
              color: e.accent,
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Track viewport width so the layout can adapt without CSS media queries. */
function useIsMobile(bp = 720) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= bp);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [bp]);
  return isMobile;
}

export default function MemoryGame({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<Phase>("boot");
  const [tutorialStep, setTutorialStep] = useState(0);

  const [blocks, setBlocks] = useState<Program[]>(makeInitialBlocks());
  const [queue, setQueue] = useState<Request[]>(() => [generateRequest(1), generateRequest(1)]);
  const [nextRequest, setNextRequest] = useState<Request>(generateRequest(1));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [level, setLevel] = useState(1);
  const [compactCooldown, setCompactCooldown] = useState(0);
  const [compactUses, setCompactUses] = useState(0);
  const [gcPause, setGcPause] = useState(0);
  const [oomActive, setOomActive] = useState(false);
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);
  const [hoveredRequest, setHoveredRequest] = useState<Request | null>(null);
  const [hoverCard, setHoverCard] = useState<
    | { x: number; y: number; block: Program; segCells: number }
    | null
  >(null);

  const [gameTime, setGameTime] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);

  // First-time explanations
  const [seenGC, setSeenGC] = useState(false);
  const [seenLeak, setSeenLeak] = useState(false);
  const [seenOOM, setSeenOOM] = useState(false);
  const [pendingExplain, setPendingExplain] = useState<ExplainKind | null>(null);

  // Ref so pushLog can stamp entries without invalidating tick callbacks each second.
  const gameTimeRef = useRef(0);
  useEffect(() => {
    gameTimeRef.current = gameTime;
  }, [gameTime]);

  const frag = calcFragmentation(blocks);
  const memUsed = calcMemoryUsed(blocks);
  const hasLeak = blocks.some((b) => b.isLeak && !b.free);
  const tip = getSystemTip(frag, memUsed, hasLeak);

  const isFrozen = phase !== "playing" || pendingExplain !== null;

  /** Push an entry to the system log with an in-game timestamp. */
  const pushLog = useCallback((text: string, kind: LogEntry["kind"]) => {
    setLog((prev) => {
      const entry: LogEntry = { t: formatClock(gameTimeRef.current), text, kind };
      return [...prev.slice(-24), entry];
    });
  }, []);

  const showMessage = useCallback(
    (text: string, good: boolean) => {
      setMessage({ text, good });
      pushLog(text, good ? "good" : "bad");
      setTimeout(() => setMessage(null), 2500);
    },
    [pushLog]
  );

  /** Core tick — runs while phase is "playing" and no explanation is pending. */
  const tick = useCallback(() => {
    setGameTime((t) => t + 1);
    setGcPause((g) => Math.max(0, g - 1));

    setBlocks((prev) =>
      prev.map((b) => {
        if (b.free) return b;
        const newAge = b.age + 1;
        if (b.isLeak) return { ...b, age: newAge };
        if (b.timeLeft === 1)
          return { ...b, free: true, name: "", color: "", timeLeft: 0, age: 0, isLeak: false };
        return { ...b, timeLeft: b.timeLeft - 1, age: newAge };
      })
    );

    setQueue((prev) => {
      const updated = prev.map((r) => ({ ...r, timeLeft: r.timeLeft - 1 }));
      const expired = updated.filter((r) => r.timeLeft <= 0);
      expired.forEach((r) => {
        if (r.priority === "CRITICAL") {
          setLives((l) => Math.max(0, l - 1));
          showMessage(`⏱ CRITICAL timeout! ${r.name} expired. Lost a life.`, false);
        } else if (r.priority === "NORMAL") {
          setScore((s) => Math.max(0, s - EXPIRY_PENALTY));
          showMessage(`⏱ ${r.name} request expired. -${EXPIRY_PENALTY} pts`, false);
        }
      });
      return updated.filter((r) => r.timeLeft > 0);
    });

    setCompactCooldown((c) => Math.max(0, c - 1));

    setScore((s) => {
      if (s >= LEVEL_THRESHOLDS[2] && level === 1) {
        setLevel(2);
        pushLog(`↑ LEVEL 2 unlocked (score ${s})`, "info");
      }
      if (s >= LEVEL_THRESHOLDS[3] && level === 2) {
        setLevel(3);
        pushLog(`↑ LEVEL 3 unlocked (score ${s})`, "info");
      }
      return s;
    });
  }, [level, showMessage, pushLog]);

  /** Main game tick. */
  useEffect(() => {
    if (isFrozen) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, isFrozen]);

  /** Spawn new requests periodically based on level. */
  useEffect(() => {
    if (isFrozen) return;
    const rate = REQUEST_SPAWN_RATE[level] ?? REQUEST_SPAWN_RATE[3];
    const interval = setInterval(() => {
      setQueue((q) => {
        if (q.length >= MAX_QUEUE) return q;
        const newReq = nextRequest;
        setNextRequest(generateRequest(level));
        return [...q, newReq];
      });
    }, rate);
    return () => clearInterval(interval);
  }, [level, isFrozen, nextRequest]);

  /** Randomly spawn memory leaks based on level. */
  useEffect(() => {
    if (isFrozen) return;
    const rate = LEAK_INTERVAL[level] ?? LEAK_INTERVAL[3];
    const interval = setInterval(() => {
      setBlocks((prev) => {
        const allocated = prev.filter((b) => !b.free && !b.isLeak);
        if (allocated.length === 0) return prev;
        const target = allocated[Math.floor(Math.random() * allocated.length)];
        if (!seenLeak) {
          setPendingExplain("leak");
          setSeenLeak(true);
        }
        showMessage(`💧 Memory leak in ${target.name}! Kill it before it's too late.`, false);
        return prev.map((b) => (b.id === target.id ? { ...b, isLeak: true } : b));
      });
    }, rate);
    return () => clearInterval(interval);
  }, [level, isFrozen, showMessage, seenLeak]);

  // Reactive triggers: when derived state (frag, memUsed, lives) crosses a
  // threshold, drive a modal / countdown / phase change. These are legitimate
  // state-driven side effects — the rule below is disabled intentionally.

  /** Trigger GC pause when fragmentation exceeds threshold. */
  useEffect(() => {
    if (phase !== "playing") return;
    if (frag >= FRAG_THRESHOLD && gcPause === 0 && !pendingExplain) {
      if (!seenGC) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPendingExplain("gc");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSeenGC(true);
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGcPause(GC_PAUSE_DURATION);
      showMessage(`🔴 GC Pause triggered! High fragmentation. System frozen for ${GC_PAUSE_DURATION}s.`, false);
    }
  }, [frag, gcPause, phase, pendingExplain, seenGC, showMessage]);

  /** Toggle OOM killer when memory usage crosses threshold. */
  useEffect(() => {
    if (phase !== "playing") return;
    if (memUsed >= OOM_THRESHOLD && !oomActive && !pendingExplain) {
      if (!seenOOM) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPendingExplain("oom");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSeenOOM(true);
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOomActive(true);
      showMessage("💀 OOM Killer activated! Random process will be killed every 10s.", false);
    } else if (memUsed < OOM_THRESHOLD && oomActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOomActive(false);
    }
  }, [memUsed, oomActive, phase, pendingExplain, seenOOM, showMessage]);

  /** OOM killer kills a random process at the configured interval. */
  useEffect(() => {
    if (!oomActive || isFrozen) return;
    const interval = setInterval(() => {
      setBlocks((prev) => {
        const allocated = prev.filter((b) => !b.free);
        if (allocated.length === 0) return prev;
        const target = allocated[Math.floor(Math.random() * allocated.length)];
        showMessage(`💀 OOM Killer terminated ${target.name}!`, false);
        return prev.map((b) =>
          b.id === target.id ? { ...b, free: true, name: "", color: "", timeLeft: 0, age: 0, isLeak: false } : b
        );
      });
    }, OOM_KILL_INTERVAL);
    return () => clearInterval(interval);
  }, [oomActive, isFrozen, showMessage]);

  /** Game over when lives reach zero. */
  useEffect(() => {
    if (lives <= 0 && phase === "playing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("gameover");
      pushLog("SYSTEM CRASH — 0 lives remaining", "bad");
    }
  }, [lives, phase, pushLog]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const allocate = (requestId: string, strategy: "firstFit" | "bestFit" | "worstFit") => {
    if (gcPause > 0) {
      showMessage(`🔴 GC Pause active! Cannot allocate for ${gcPause}s.`, false);
      return;
    }
    const request = queue.find((r) => r.id === requestId);
    if (!request) return;

    const holes = blocks.filter((b) => b.free && b.size >= request.size);
    if (holes.length === 0) {
      if (request.priority === "CRITICAL") {
        setLives((l) => Math.max(0, l - 1));
        showMessage(`💥 CRITICAL failure! No space for ${request.name}. Lost a life.`, false);
      } else {
        showMessage(`No hole fits ${request.name} (${request.size}KB).`, false);
      }
      setQueue((q) => q.filter((r) => r.id !== requestId));
      return;
    }

    let chosen: Program;
    if (strategy === "firstFit") chosen = holes[0];
    else if (strategy === "bestFit") chosen = holes.reduce((a, b) => (a.size < b.size ? a : b));
    else chosen = holes.reduce((a, b) => (a.size > b.size ? a : b));

    const leftover = chosen.size - request.size;
    const timeLeft = randomBetween(PROCESS_LIFETIME[0], PROCESS_LIFETIME[1]);
    const points = ALLOCATION_POINTS[request.priority] ?? 5;

    setBlocks((prev) => {
      const next: Program[] = [];
      for (const b of prev) {
        if (b.id !== chosen.id) {
          next.push(b);
          continue;
        }
        next.push({
          ...b,
          size: request.size,
          free: false,
          name: request.name,
          color: heatColor(0, false),
          timeLeft,
          age: 0,
          isLeak: false,
        });
        if (leftover > 0) {
          next.push({
            id: uid(),
            name: "",
            size: leftover,
            color: "",
            free: true,
            timeLeft: 0,
            age: 0,
            isLeak: false,
          });
        }
      }
      return next;
    });

    setQueue((q) => q.filter((r) => r.id !== requestId));
    setScore((s) => s + points);
    setCompactUses(0);

    if (leftover < MIN_USEFUL_HOLE && leftover > 0) {
      showMessage(`⚠️ ${strategy} left a ${leftover}KB hole — too small to reuse! +${points} pts`, true);
    } else {
      showMessage(`✓ ${request.name} allocated via ${strategy}. +${points} pts`, true);
    }
  };

  const killProcess = (blockId: string) => {
    if (gcPause > 0) return;
    const block = blocks.find((b) => b.id === blockId);
    if (!block || block.free) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, free: true, name: "", color: "", timeLeft: 0, age: 0, isLeak: false } : b
      )
    );
    setScore((s) => Math.max(0, s - KILL_PENALTY));
    showMessage(`Killed ${block.name}. -${KILL_PENALTY} pts`, false);
  };

  const compact = () => {
    if (compactCooldown > 0 || gcPause > 0) return;
    const allocated = blocks.filter((b) => !b.free);
    const totalFree = blocks.filter((b) => b.free).reduce((s, b) => s + b.size, 0);
    setBlocks([
      ...allocated,
      { id: uid(), name: "", size: totalFree, color: "", free: true, timeLeft: 0, age: 0, isLeak: false },
    ]);
    const newUses = compactUses + 1;
    setCompactUses(newUses);
    const cooldown = newUses >= 2 ? COMPACT_COOLDOWN * 2 : COMPACT_COOLDOWN;
    setCompactCooldown(cooldown);
    if (newUses >= 2) {
      showMessage(`⚠️ Thrashing detected! Compact cooldown doubled to ${cooldown}s.`, false);
    } else {
      showMessage(`⚡ Memory compacted! ${totalFree}KB freed into one block.`, true);
    }
  };

  const restart = () => {
    setBlocks(makeInitialBlocks());
    setQueue([generateRequest(1), generateRequest(1)]);
    setNextRequest(generateRequest(1));
    setScore(0);
    setLives(STARTING_LIVES);
    setLevel(1);
    setPhase("playing");
    setCompactCooldown(0);
    setCompactUses(0);
    setGcPause(0);
    setOomActive(false);
    setMessage(null);
    setGameTime(0);
    setLog([]);
  };

  // ─── Heat Map Segmentation ───────────────────────────────────────────────

  /**
   * Split blocks into contiguous cell segments. Each segment knows where it
   * starts on the grid and how many cells it spans, so we can render name
   * on the first cell, size on the last cell, and boundary indicators.
   */
  const segments: Segment[] = useMemo(() => {
    const out: Segment[] = [];
    let cursor = 0;
    for (const b of blocks) {
      const cellCount = Math.max(1, Math.round(b.size / KB_PER_CELL));
      out.push({ block: b, startCell: cursor, cellCount });
      cursor += cellCount;
    }
    return out;
  }, [blocks]);

  const tutorialActive = phase === "tutorial";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1098 }}
      />

      {/* GC Pause overlay */}
      {gcPause > 0 && phase === "playing" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1101,
            background: "rgba(247,129,102,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f78166" }}>⏸ GC PAUSE</p>
            <p style={{ color: "#aaa", fontSize: "0.9rem" }}>System frozen for {gcPause}s</p>
          </div>
        </div>
      )}

      {/* Main Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="OS Memory Manager"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(1100px, 96vw)",
          height: "min(92vh, 700px)",
          background: "#0d1117",
          borderRadius: "12px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
          zIndex: 1099,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            height: "40px",
            minHeight: "40px",
            background: "#161b22",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: "8px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ width: "13px", height: "13px", borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer" }}
            />
            <button aria-label="Minimize" style={{ width: "13px", height: "13px", borderRadius: "50%", background: "#febc2e", border: "none", cursor: "pointer" }} />
            <button aria-label="Maximize" style={{ width: "13px", height: "13px", borderRadius: "50%", background: "#28c840", border: "none", cursor: "pointer" }} />
            <span style={{ color: "#999", fontSize: "0.8rem", marginLeft: "8px" }}>OS Memory Manager v1.0</span>
          </div>
          {phase === "playing" || phase === "gameover" || phase === "tutorial" ? (
            <div
              style={{
                display: "flex",
                gap: isMobile ? "0.6rem" : "1.5rem",
                alignItems: "center",
                marginRight: "12px",
                fontSize: isMobile ? "0.68rem" : "0.82rem",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {gcPause > 0 && <span style={{ color: "#f78166", fontWeight: 700 }}>GC PAUSE {gcPause}s</span>}
              {oomActive && <span style={{ color: "#f78166", fontWeight: 700 }}>💀 OOM</span>}
              <span>
                {"❤️".repeat(Math.max(0, lives))}
                {"🖤".repeat(Math.max(0, STARTING_LIVES - Math.max(0, lives)))}
              </span>
              <span style={{ color: "#ffa657" }}>LVL {level}</span>
              <span style={{ color: "#56d364", fontWeight: 600 }}>Score: {score}</span>
            </div>
          ) : null}
        </div>

        {/* Boot */}
        {phase === "boot" && (
          <BootScreen
            onStart={() => {
              setPhase("tutorial");
              setTutorialStep(0);
            }}
          />
        )}

        {/* Game Over */}
        {phase === "gameover" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "#f78166" }}>SYSTEM CRASH</p>
            <p style={{ color: "#aaa" }}>
              Final Score: <span style={{ color: "#56d364", fontWeight: 600 }}>{score}</span>
            </p>
            <p style={{ color: "#555", fontSize: "0.78rem" }}>Uptime: {formatClock(gameTime)}</p>
            <button
              onClick={restart}
              style={{
                padding: "0.7rem 2rem",
                borderRadius: "8px",
                background: "#56d364",
                border: "none",
                color: "#0d1117",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.95rem",
                fontFamily: "monospace",
              }}
            >
              REBOOT
            </button>
          </div>
        )}

        {/* Playing / Tutorial layout (same underlying view, tutorial adds overlay) */}
        {(phase === "playing" || phase === "tutorial") && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              overflow: isMobile ? "auto" : "hidden",
              position: "relative",
            }}
          >
            {/* ── Left: Game Area ── */}
            <div
              style={{
                flex: 1,
                padding: isMobile ? "0.7rem" : "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
                overflowY: isMobile ? "visible" : "auto",
                borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
                borderBottom: isMobile ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              {/* Heat Map */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.68rem", color: "#555", letterSpacing: "0.1em" }}>
                    MEMORY MAP — {TOTAL_MEMORY}KB ({CELL_COUNT} cells × {KB_PER_CELL}KB)
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#555" }}>{memUsed}% used</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${CELL_COUNT}, 1fr)`,
                    gap: "1px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "4px",
                    padding: "1px",
                  }}
                  onMouseLeave={() => setHoverCard(null)}
                >
                  {segments.flatMap((seg) => {
                    const cells = [];
                    for (let i = 0; i < seg.cellCount; i++) {
                      const isFirst = i === 0;
                      const isLast = i === seg.cellCount - 1;
                      const middleIdx = Math.floor(seg.cellCount / 2);
                      const isMiddle = i === middleIdx;
                      const block = seg.block;
                      const bg = block.free
                        ? hoveredRequest && block.size >= hoveredRequest.size
                          ? "rgba(86,211,100,0.18)"
                          : hoveredRequest && block.size < hoveredRequest.size
                            ? "rgba(247,129,102,0.06)"
                            : "rgba(255,255,255,0.02)"
                        : heatColor(block.age, block.isLeak);

                      // Boundary indicator via inset shadow — doesn't affect layout.
                      let boxShadow = "none";
                      if (!block.free && block.isLeak) {
                        boxShadow = "inset 0 0 0 1px #ff0044";
                      } else if (!block.free && isFirst) {
                        boxShadow = "inset 3px 0 0 rgba(255,255,255,0.45)";
                      } else if (!block.free && isLast) {
                        boxShadow = "inset -3px 0 0 rgba(255,255,255,0.25)";
                      }

                      // Label logic
                      let label = "";
                      let labelColor = "rgba(255,255,255,0.95)";
                      if (block.free) {
                        if (isMiddle) {
                          label = `${block.size}KB`;
                          labelColor = "rgba(255,255,255,0.35)";
                        }
                      } else {
                        if (seg.cellCount === 1) {
                          label = `${block.size}`;
                        } else if (isFirst) {
                          label = block.name.slice(0, 4);
                        } else if (isLast) {
                          label = `${block.size}KB`;
                        }
                      }

                      cells.push(
                        <div
                          key={`${seg.block.id}-${i}`}
                          onMouseEnter={(e) =>
                            setHoverCard({
                              x: e.clientX,
                              y: e.clientY,
                              block: seg.block,
                              segCells: seg.cellCount,
                            })
                          }
                          onMouseMove={(e) =>
                            setHoverCard((h) =>
                              h ? { ...h, x: e.clientX, y: e.clientY } : null
                            )
                          }
                          onClick={() => !block.free && killProcess(block.id)}
                          style={{
                            height: isMobile ? "24px" : "34px",
                            background: bg,
                            border: block.free
                              ? "1px dashed rgba(255,255,255,0.12)"
                              : "1px solid transparent",
                            boxShadow,
                            cursor: block.free ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            fontSize: "8.5px",
                            fontWeight: 700,
                            color: labelColor,
                            letterSpacing: "0.02em",
                            textShadow: !block.free ? "0 1px 1px rgba(0,0,0,0.35)" : "none",
                            transition: "background 0.2s",
                          }}
                        >
                          {/* Inline cell labels are unreadable at mobile cell sizes; process list + hover card carry that info instead. */}
                          {isMobile ? "" : label}
                        </div>
                      );
                    }
                    return cells;
                  })}
                </div>

                {/* KB Ruler */}
                <div
                  style={{
                    position: "relative",
                    height: "18px",
                    marginTop: "4px",
                  }}
                >
                  {[0, 250, 500, 750, 1000].map((kb) => {
                    const pct = (kb / TOTAL_MEMORY) * 100;
                    return (
                      <div
                        key={kb}
                        style={{
                          position: "absolute",
                          left: `${pct}%`,
                          transform:
                            kb === 0
                              ? "translateX(0)"
                              : kb === TOTAL_MEMORY
                                ? "translateX(-100%)"
                                : "translateX(-50%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ width: "1px", height: "6px", background: "#333" }} />
                        <span style={{ fontSize: "0.58rem", color: "#555", marginTop: "1px" }}>
                          {kb}KB
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Heat legend */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.62rem", color: "#444" }}>AGE:</span>
                  {["New", "↓", "↓", "Old", "Leak"].map((label, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <div
                        style={{
                          width: "12px",
                          height: "8px",
                          borderRadius: "2px",
                          background: i === 4 ? "#ff0044" : heatColor(i * 20, false),
                        }}
                      />
                      <span style={{ fontSize: "0.6rem", color: "#444" }}>{label}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: "0.62rem", color: "#333", marginLeft: "auto" }}>
                    Click block to kill (−{KILL_PENALTY}pts)
                  </span>
                </div>
              </div>

              {/* Process List */}
              <div>
                <span style={{ fontSize: "0.68rem", color: "#555", letterSpacing: "0.1em" }}>
                  RUNNING PROCESSES
                </span>
                <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {blocks
                    .filter((b) => !b.free)
                    .map((block) => (
                      <div
                        key={block.id}
                        onClick={() => killProcess(block.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.35rem 0.6rem",
                          borderRadius: "6px",
                          background: block.isLeak ? "rgba(255,0,68,0.08)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${block.isLeak ? "#ff004433" : "rgba(255,255,255,0.05)"}`,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = block.isLeak
                            ? "rgba(255,0,68,0.15)"
                            : "rgba(255,255,255,0.07)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = block.isLeak
                            ? "rgba(255,0,68,0.08)"
                            : "rgba(255,255,255,0.03)")
                        }
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: heatColor(block.age, block.isLeak),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            color: block.isLeak ? "#ff0044" : "#e8e8e8",
                            fontSize: "0.78rem",
                            flex: 1,
                            fontWeight: 500,
                          }}
                        >
                          {block.name} {block.isLeak ? "💧" : ""}
                        </span>
                        <span style={{ color: "#555", fontSize: "0.72rem" }}>{block.size}KB</span>
                        <span style={{ color: "#555", fontSize: "0.72rem" }}>age: {block.age}s</span>
                        {!block.isLeak && (
                          <span style={{ color: block.timeLeft < 5 ? "#f78166" : "#555", fontSize: "0.72rem" }}>
                            ⏱{block.timeLeft}s
                          </span>
                        )}
                        {block.isLeak && (
                          <span style={{ color: "#ff0044", fontSize: "0.72rem" }}>∞ LEAK</span>
                        )}
                      </div>
                    ))}
                  {blocks.filter((b) => !b.free).length === 0 && (
                    <p style={{ color: "#333", fontSize: "0.78rem" }}>No processes running</p>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { label: "FRAGMENTATION", value: frag, warn: FRAG_THRESHOLD, unit: "%" },
                  { label: "MEMORY USED", value: memUsed, warn: OOM_THRESHOLD, unit: "%" },
                ].map(({ label, value, warn, unit }) => (
                  <div
                    key={label}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.62rem", color: "#444", letterSpacing: "0.08em" }}>{label}</span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: value >= warn ? "#f78166" : value >= warn * 0.7 ? "#ffa657" : "#56d364",
                          fontWeight: 600,
                        }}
                      >
                        {value}{unit}
                      </span>
                    </div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: "2px",
                          width: `${value}%`,
                          background: value >= warn ? "#f78166" : value >= warn * 0.7 ? "#ffa657" : "#56d364",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Available Holes */}
              <div>
                <span style={{ fontSize: "0.68rem", color: "#555", letterSpacing: "0.1em" }}>AVAILABLE HOLES</span>
                <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {blocks.filter((b) => b.free).length === 0 ? (
                    <p style={{ color: "#333", fontSize: "0.78rem" }}>No free holes — memory full!</p>
                  ) : (
                    blocks
                      .filter((b) => b.free)
                      .map((hole) => {
                        const fits = hoveredRequest ? hole.size >= hoveredRequest.size : false;
                        const tooSmall = hoveredRequest ? hole.size < hoveredRequest.size : false;
                        return (
                          <div
                            key={hole.id}
                            style={{
                              padding: "0.35rem 0.7rem",
                              borderRadius: "6px",
                              background: fits
                                ? "rgba(86,211,100,0.12)"
                                : tooSmall
                                  ? "rgba(247,129,102,0.08)"
                                  : "rgba(255,255,255,0.03)",
                              border: `1px solid ${fits ? "#56d36444" : tooSmall ? "#f7816633" : "rgba(255,255,255,0.07)"}`,
                              transition: "all 0.2s",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: fits ? "#56d364" : tooSmall ? "#f78166" : "#555",
                              }}
                            >
                              {hole.size}KB
                            </span>
                            <span style={{ fontSize: "0.6rem", color: fits ? "#56d364" : tooSmall ? "#f78166" : "#333" }}>
                              {fits ? "✓ fits" : tooSmall ? "✗ small" : "free"}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Compact + Next Up */}
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                <button
                  onClick={compact}
                  disabled={compactCooldown > 0 || gcPause > 0}
                  aria-label="Compact memory"
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "6px",
                    background: compactCooldown > 0 ? "rgba(255,255,255,0.02)" : "rgba(121,184,255,0.1)",
                    border: `1px solid ${compactCooldown > 0 ? "rgba(255,255,255,0.05)" : "#79b8ff44"}`,
                    color: compactCooldown > 0 ? "#333" : "#79b8ff",
                    cursor: compactCooldown > 0 ? "not-allowed" : "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "monospace",
                  }}
                >
                  {compactCooldown > 0 ? `⚡ COMPACT (${compactCooldown}s)` : "⚡ COMPACT"}
                </button>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "6px",
                    padding: "0.45rem 0.8rem",
                    border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.62rem", color: "#444", letterSpacing: "0.08em" }}>NEXT:</span>
                  <span style={{ color: PRIORITY_COLORS[nextRequest.priority], fontSize: "0.7rem" }}>
                    {PRIORITY_EMOJI[nextRequest.priority]}
                  </span>
                  <span style={{ color: "#777", fontSize: "0.72rem" }}>
                    {nextRequest.name} — {nextRequest.size}KB
                  </span>
                </div>
              </div>

              {/* Request Queue */}
              <div>
                <span style={{ fontSize: "0.68rem", color: "#555", letterSpacing: "0.1em" }}>INCOMING REQUESTS</span>
                <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {queue.map((req) => (
                    <div
                      key={req.id}
                      onMouseEnter={() => setHoveredRequest(req)}
                      onMouseLeave={() => setHoveredRequest(null)}
                      style={{
                        background: "#161b22",
                        borderRadius: "8px",
                        padding: "0.7rem 0.9rem",
                        border: `1px solid ${PRIORITY_COLORS[req.priority]}33`,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.8rem",
                        flexWrap: "wrap",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <span style={{ fontSize: "0.9rem" }}>{PRIORITY_EMOJI[req.priority]}</span>
                      <span
                        style={{
                          color: PRIORITY_COLORS[req.priority],
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          minWidth: "60px",
                        }}
                      >
                        {req.priority}
                      </span>
                      <span style={{ color: "#e8e8e8", fontSize: "0.82rem", flex: 1 }}>
                        {req.name} <span style={{ color: "#ffa657" }}>{req.size}KB</span>
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", minWidth: "60px" }}>
                        <span style={{ fontSize: "0.65rem", color: req.timeLeft <= 3 ? "#f78166" : "#555" }}>
                          ⏱ {req.timeLeft}s
                        </span>
                        <div style={{ width: "60px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${(req.timeLeft / (REQUEST_TTL[level as 1 | 2 | 3]?.[req.priority] ?? 10)) * 100}%`,
                              background: req.timeLeft <= 3 ? "#f78166" : "#ffa657",
                              transition: "width 1s linear",
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        {(
                          [
                            { key: "firstFit", label: "FF", color: "#79b8ff", title: "First Fit" },
                            { key: "bestFit", label: "BF", color: "#56d364", title: "Best Fit" },
                            { key: "worstFit", label: "WF", color: "#f78166", title: "Worst Fit" },
                          ] as const
                        ).map(({ key, label, color, title }) => (
                          <button
                            key={key}
                            onClick={() => allocate(req.id, key)}
                            title={title}
                            aria-label={`${title} for ${req.name}`}
                            style={{
                              padding: "0.3rem 0.6rem",
                              borderRadius: "4px",
                              background: `${color}15`,
                              border: `1px solid ${color}44`,
                              color,
                              cursor: "pointer",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              fontFamily: "monospace",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {queue.length === 0 && (
                    <p style={{ color: "#333", fontSize: "0.78rem" }}>No pending requests...</p>
                  )}
                </div>
              </div>

              {/* Feedback message */}
              {message && (
                <div
                  style={{
                    padding: "0.7rem 1rem",
                    borderRadius: "6px",
                    background: message.good ? "rgba(86,211,100,0.08)" : "rgba(247,129,102,0.08)",
                    border: `1px solid ${message.good ? "#56d36433" : "#f7816633"}`,
                    color: message.good ? "#56d364" : "#f78166",
                    fontSize: "0.82rem",
                  }}
                >
                  {message.text}
                </div>
              )}
            </div>

            {/* ── Right: System Log + Manual ── */}
            <div
              style={{
                width: isMobile ? "100%" : "240px",
                minWidth: isMobile ? undefined : "240px",
                padding: isMobile ? "0.8rem" : "1rem",
                overflowY: isMobile ? "visible" : "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {/* Dynamic tip */}
              <div
                style={{
                  padding: "0.7rem",
                  borderRadius: "8px",
                  background: "rgba(255,166,87,0.08)",
                  border: "1px solid rgba(255,166,87,0.2)",
                  fontSize: "0.72rem",
                  color: "#ffa657",
                  lineHeight: 1.5,
                }}
              >
                {tip}
              </div>

              {/* System Log */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                  }}
                >
                  <span style={{ fontSize: "0.62rem", color: "#444", letterSpacing: "0.14em" }}>
                    SYSTEM LOG
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "#333" }}>
                    uptime {formatClock(gameTime)}
                  </span>
                </div>
                <div
                  style={{
                    background: "#050709",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    height: "180px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    fontSize: "0.66rem",
                    lineHeight: 1.45,
                  }}
                  ref={(el) => {
                    if (el) el.scrollTop = el.scrollHeight;
                  }}
                >
                  {log.length === 0 && (
                    <span style={{ color: "#333", fontSize: "0.65rem" }}>
                      &gt; awaiting events...
                    </span>
                  )}
                  {log.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                      <span style={{ color: "#333" }}>[{e.t}]</span>
                      <span
                        style={{
                          color:
                            e.kind === "good"
                              ? "#56d364"
                              : e.kind === "bad"
                                ? "#f78166"
                                : "#999",
                        }}
                      >
                        {e.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategies */}
              <div>
                <p style={{ fontSize: "0.62rem", color: "#444", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                  STRATEGIES
                </p>
                {[
                  { label: "FF — First Fit", color: "#79b8ff", desc: "Fastest. Picks first valid hole. Best when timer is low." },
                  { label: "BF — Best Fit", color: "#56d364", desc: "Least waste per allocation. Can create tiny unusable holes over time." },
                  { label: "WF — Worst Fit", color: "#f78166", desc: "Picks largest hole. Leaves bigger remainders for future requests." },
                ].map(({ label, color, desc }) => (
                  <div key={label} style={{ marginBottom: "0.6rem" }}>
                    <p style={{ color, fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.15rem" }}>{label}</p>
                    <p style={{ color: "#444", fontSize: "0.66rem", lineHeight: 1.4 }}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Priority quick reference */}
              <div>
                <p style={{ fontSize: "0.62rem", color: "#444", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                  PRIORITY
                </p>
                {(
                  [
                    { emoji: "🔴", label: "CRITICAL", desc: "Life lost if unallocated / expired" },
                    { emoji: "🟡", label: "NORMAL", desc: `−${EXPIRY_PENALTY} pts if expired` },
                    { emoji: "🟢", label: "LOW", desc: "Silent if expired" },
                  ] as const
                ).map(({ emoji, label, desc }) => (
                  <div key={label} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.35rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.72rem" }}>{emoji}</span>
                    <div>
                      <span style={{ color: PRIORITY_COLORS[label], fontSize: "0.66rem", fontWeight: 700 }}>{label}</span>
                      <p style={{ color: "#444", fontSize: "0.62rem", lineHeight: 1.4 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hover Card */}
            {hoverCard && !tutorialActive && (
              <div
                style={{
                  position: "fixed",
                  left: Math.min(hoverCard.x + 14, window.innerWidth - 200),
                  top: Math.min(hoverCard.y + 14, window.innerHeight - 130),
                  zIndex: 1200,
                  background: "#161b22",
                  border: `1px solid ${
                    hoverCard.block.free
                      ? "rgba(255,255,255,0.15)"
                      : hoverCard.block.isLeak
                        ? "#ff0044"
                        : "rgba(255,255,255,0.2)"
                  }`,
                  borderRadius: "6px",
                  padding: "0.55rem 0.7rem",
                  minWidth: "170px",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                  fontSize: "0.72rem",
                  pointerEvents: "none",
                  fontFamily: "monospace",
                }}
              >
                {hoverCard.block.free ? (
                  <>
                    <div style={{ color: "#79b8ff", fontWeight: 700, marginBottom: "3px" }}>
                      FREE HOLE
                    </div>
                    <div style={{ color: "#aaa" }}>{hoverCard.block.size}KB available</div>
                    <div style={{ color: "#555", fontSize: "0.62rem", marginTop: "3px" }}>
                      {hoverCard.segCells} cell{hoverCard.segCells === 1 ? "" : "s"} × {KB_PER_CELL}KB
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        color: hoverCard.block.isLeak ? "#ff0044" : "#e8e8e8",
                        fontWeight: 700,
                        marginBottom: "3px",
                      }}
                    >
                      {hoverCard.block.name}
                      {hoverCard.block.isLeak ? " 💧" : ""}
                    </div>
                    <div style={{ color: "#aaa" }}>size: {hoverCard.block.size}KB</div>
                    <div style={{ color: "#aaa" }}>age: {hoverCard.block.age}s</div>
                    {hoverCard.block.isLeak ? (
                      <div style={{ color: "#ff0044" }}>timer: ∞ LEAK</div>
                    ) : (
                      <div style={{ color: "#aaa" }}>timer: {hoverCard.block.timeLeft}s</div>
                    )}
                    <div style={{ color: "#f78166", fontSize: "0.62rem", marginTop: "4px" }}>
                      click to kill (−{KILL_PENALTY}pts)
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tutorial overlay (sits above game area, below explanation modal) */}
            {tutorialActive && (
              <TutorialOverlay
                step={tutorialStep}
                onNext={() => {
                  if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
                    setPhase("playing");
                    setGameTime(0);
                  } else {
                    setTutorialStep((s) => s + 1);
                  }
                }}
                onSkip={() => {
                  setPhase("playing");
                  setGameTime(0);
                }}
              />
            )}

            {/* First-time event explanation */}
            {pendingExplain && (
              <EventExplain
                kind={pendingExplain}
                onDismiss={() => setPendingExplain(null)}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
