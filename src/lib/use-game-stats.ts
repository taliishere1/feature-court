"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "feature-court-stats";

interface GameStats {
  casesTried: number;
  ship: number;
  kill: number;
  revise: number;
  mistrial: number;
  streak: number;
  bestStreak: number;
  lastRuling: string | null;
  streakType: string | null;
}

function defaultStats(): GameStats {
  return {
    casesTried: 0,
    ship: 0,
    kill: 0,
    revise: 0,
    mistrial: 0,
    streak: 0,
    bestStreak: 0,
    lastRuling: null,
    streakType: null,
  };
}

function loadStats(): GameStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultStats();
}

function saveStats(stats: GameStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function useGameStats() {
  const [stats, setStats] = useState<GameStats>(defaultStats);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStats(loadStats());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveStats(stats);
  }, [stats, loaded]);

  const recordRuling = useCallback((ruling: string) => {
    setStats((prev) => {
      const isSameStreak = ruling === prev.streakType;
      const newStreak = isSameStreak ? prev.streak + 1 : 1;
      return {
        ...prev,
        casesTried: prev.casesTried + 1,
        ship: prev.ship + (ruling === "ship" ? 1 : 0),
        kill: prev.kill + (ruling === "kill" ? 1 : 0),
        revise: prev.revise + (ruling === "revise" ? 1 : 0),
        mistrial: prev.mistrial + (ruling === "mistrial" ? 1 : 0),
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        lastRuling: ruling,
        streakType: ruling,
      };
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats(defaultStats());
  }, []);

  const getBailiffGreeting = useCallback((): string => {
    const s = stats;
    if (s.casesTried === 0) return "Welcome, Your Honor. The bench awaits.";
    if (s.casesTried === 1) return "Welcome back, Your Honor. One case down.";
    if (s.streak >= 5) {
      const label = s.streakType === "ship" ? "Ship It" : s.streakType;
      return `Incredible, Your Honor! ${s.streak} consecutive "${label}" rulings!`;
    }
    if (s.casesTried >= 10) {
      return `Welcome back, Your Honor. You've judged ${s.casesTried} cases. The docket is impressed.`;
    }
    return `Welcome back, Your Honor. You've judged ${s.casesTried} cases.`;
  }, [stats]);

  return { stats, loaded, recordRuling, resetStats, getBailiffGreeting };
}