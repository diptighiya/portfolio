"use client";

import { useState } from "react";
import MemoryGame from "./memory_game";

type Project = {
  id: string;
  title: string;
  tagline: string;
  tags: string[];
  accent: string;
  emoji: string;
  url?: string;
};

const PROJECTS: Project[] = [
  {
    id: "memory-allocator",
    title: "OS Memory Allocator",
    tagline: "Play the OS. Allocate memory with First Fit, Best Fit, or Worst Fit while GC pauses, leaks, and the OOM killer fight back.",
    tags: ["OS Concepts", "React", "Game"],
    accent: "#79b8ff",
    emoji: "🧠",
  },
  {
    id: "weekly-tracker",
    title: "Weekly Tracker",
    tagline: "A lightweight tracker for planning and reviewing the week. Live app.",
    tags: ["Web App", "Next.js", "Live"],
    accent: "#56d364",
    emoji: "🗓️",
    url: "https://weekly-tracker-lovat.vercel.app/",
  },
];

const cardStyle = (accent: string): React.CSSProperties => ({
  textAlign: "left",
  background: "#161b22",
  border: `1px solid ${accent}33`,
  borderRadius: "10px",
  padding: "1rem",
  cursor: "pointer",
  color: "#e8e8e8",
  fontFamily: "monospace",
  transition: "border-color 0.18s, transform 0.18s",
  display: "block",
  textDecoration: "none",
});

export default function ProjectsWindow({ onClose }: { onClose: () => void }) {
  const [openProject, setOpenProject] = useState<string | null>(null);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1098 }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Projects"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(760px, 92vw)",
          height: "min(78vh, 560px)",
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
        <div
          style={{
            height: "40px",
            minHeight: "40px",
            background: "#161b22",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: "8px",
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: "13px", height: "13px", borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer" }}
          />
          <button aria-label="Minimize" style={{ width: "13px", height: "13px", borderRadius: "50%", background: "#febc2e", border: "none", cursor: "pointer" }} />
          <button aria-label="Maximize" style={{ width: "13px", height: "13px", borderRadius: "50%", background: "#28c840", border: "none", cursor: "pointer" }} />
          <span style={{ color: "#999", fontSize: "0.8rem", marginLeft: "8px" }}>Projects</span>
        </div>

        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <p
            style={{
              color: "#555",
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              marginBottom: "0.9rem",
            }}
          >
            SELECT A PROJECT TO LAUNCH
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {PROJECTS.map((p) => {
              const inner = (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: "1.4rem" }}>{p.emoji}</span>
                    <span style={{ color: p.accent, fontSize: "0.95rem", fontWeight: 700, flex: 1 }}>{p.title}</span>
                    {p.url && (
                      <span style={{ color: p.accent, fontSize: "0.85rem", opacity: 0.7 }}>↗</span>
                    )}
                  </div>
                  <p style={{ color: "#aaa", fontSize: "0.78rem", lineHeight: 1.5, marginBottom: "0.7rem" }}>
                    {p.tagline}
                  </p>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "0.62rem",
                          color: "#888",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              );

              const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.borderColor = `${p.accent}88`;
                e.currentTarget.style.transform = "translateY(-2px)";
              };
              const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.borderColor = `${p.accent}33`;
                e.currentTarget.style.transform = "translateY(0)";
              };

              if (p.url) {
                return (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${p.title} in a new tab`}
                    style={cardStyle(p.accent)}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <button
                  key={p.id}
                  onClick={() => setOpenProject(p.id)}
                  aria-label={`Open ${p.title}`}
                  style={cardStyle(p.accent)}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {openProject === "memory-allocator" && (
        <MemoryGame onClose={() => setOpenProject(null)} />
      )}
    </>
  );
}
