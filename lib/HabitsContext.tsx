import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const HABITS_KEY_V1 = 'habits.v1';
const HABITS_KEY_V2 = 'habits.v2';
const CHALLENGES_KEY = 'challenges.v1';

export type HabitType = 'checkoff' | 'volume';

export type VolumeEntry = { date: string; count: number };

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
  type: HabitType;
  target?: number;
  completions: string[];
  volumeLog?: VolumeEntry[];
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:mm — overrides global default
};

export type ChallengeStatus = 'active' | 'completed' | 'failed';

export type Challenge = {
  id: string;
  habitId: string;
  lengthDays: number;
  startedAt: string;
  status: ChallengeStatus;
  completedAt?: string;
};

export type CompletionEvent = {
  habitId: string;
  kind: 'checkoff' | 'volumeTick' | 'volumeTarget';
  completedChallenge?: Challenge;
};

type AddHabitInput = {
  name: string;
  emoji: string;
  type?: HabitType;
  target?: number;
};

type HabitsContextValue = {
  habits: Habit[];
  challenges: Challenge[];
  loaded: boolean;
  addHabit: (input: AddHabitInput) => string | null;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => void;
  removeHabit: (id: string) => void;
  toggleToday: (id: string) => CompletionEvent | null;
  incrementVolume: (id: string, delta?: number) => CompletionEvent | null;
  isCompletedOn: (habit: Habit, dateKey: string) => boolean;
  streak: (habit: Habit) => number;
  bestStreak: (habit: Habit) => number;
  startChallenge: (habitId: string, lengthDays: number) => Challenge | null;
  activeChallengeFor: (habitId: string) => Challenge | undefined;
  forceCompleteChallenge: (challengeId: string) => CompletionEvent | null;
  backfillDays: (habitId: string, days: number) => void;
  clearTodayForAll: () => void;
  clearAll: () => void;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function todayKey(): string {
  return dateKey(new Date());
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dateKey(dt);
}

function migrateFromV1(raw: string): Habit[] {
  const v1 = JSON.parse(raw) as Array<{
    id: string;
    name: string;
    emoji: string;
    createdAt: number;
    completions: string[];
  }>;
  return v1.map((h) => ({ ...h, type: 'checkoff' as HabitType }));
}

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawV2, rawV1, rawChallenges] = await Promise.all([
          AsyncStorage.getItem(HABITS_KEY_V2),
          AsyncStorage.getItem(HABITS_KEY_V1),
          AsyncStorage.getItem(CHALLENGES_KEY),
        ]);
        if (rawV2) {
          setHabits(JSON.parse(rawV2));
        } else if (rawV1) {
          const migrated = migrateFromV1(rawV1);
          setHabits(migrated);
          await AsyncStorage.setItem(HABITS_KEY_V2, JSON.stringify(migrated));
        }
        if (rawChallenges) setChallenges(JSON.parse(rawChallenges));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(HABITS_KEY_V2, JSON.stringify(habits)).catch(() => {});
    }
  }, [habits, loaded]);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges)).catch(() => {});
    }
  }, [challenges, loaded]);

  const addHabit = useCallback((input: AddHabitInput): string | null => {
    const trimmed = input.name.trim();
    if (!trimmed) return null;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type: HabitType = input.type ?? 'checkoff';
    const habit: Habit = {
      id,
      name: trimmed,
      emoji: input.emoji || '✅',
      createdAt: Date.now(),
      type,
      completions: [],
      ...(type === 'volume'
        ? { target: Math.max(1, input.target ?? 3), volumeLog: [] }
        : {}),
    };
    setHabits((prev) => [...prev, habit]);
    return id;
  }, []);

  const updateHabit = useCallback(
    (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const merged: Habit = { ...h, ...patch };
          if (merged.type === 'volume') {
            merged.target = Math.max(1, merged.target ?? h.target ?? 3);
            merged.volumeLog = merged.volumeLog ?? h.volumeLog ?? [];
          } else {
            delete merged.target;
            delete merged.volumeLog;
          }
          return merged;
        })
      );
    },
    []
  );

  const removeHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setChallenges((prev) => prev.filter((c) => c.habitId !== id));
  }, []);

  const evaluateChallenge = useCallback(
    (habitId: string, completions: string[]): Challenge | undefined => {
      const today = todayKey();
      let completedChallenge: Challenge | undefined;
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.habitId !== habitId || c.status !== 'active') return c;
          const completionsSet = new Set(completions);
          let cursor = c.startedAt;
          let allDone = true;
          let hitsBeforeToday = 0;
          for (let i = 0; i < c.lengthDays; i++) {
            const day = addDays(c.startedAt, i);
            if (day > today) {
              allDone = false;
              break;
            }
            if (!completionsSet.has(day)) {
              allDone = false;
              break;
            }
            hitsBeforeToday += 1;
            cursor = day;
          }
          if (hitsBeforeToday === c.lengthDays && allDone) {
            completedChallenge = { ...c, status: 'completed', completedAt: cursor };
            return completedChallenge;
          }
          const endDate = addDays(c.startedAt, c.lengthDays - 1);
          if (today > endDate) {
            return { ...c, status: 'failed' };
          }
          return c;
        })
      );
      return completedChallenge;
    },
    []
  );

  const toggleToday = useCallback(
    (id: string): CompletionEvent | null => {
      const key = todayKey();
      const box: { event: CompletionEvent | null; completions: string[] } = {
        event: null,
        completions: [],
      };
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const has = h.completions.includes(key);
          const completions = has
            ? h.completions.filter((c) => c !== key)
            : [...h.completions, key];
          box.completions = completions;
          if (!has) box.event = { habitId: id, kind: 'checkoff' };
          return { ...h, completions };
        })
      );
      if (box.event) {
        const completed = evaluateChallenge(id, box.completions);
        if (completed) {
          return { ...box.event, completedChallenge: completed };
        }
      }
      return box.event;
    },
    [evaluateChallenge]
  );

  const incrementVolume = useCallback(
    (id: string, delta = 1): CompletionEvent | null => {
      const key = todayKey();
      const box: { event: CompletionEvent | null; completions: string[] } = {
        event: null,
        completions: [],
      };
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id || h.type !== 'volume') return h;
          const log = h.volumeLog ?? [];
          const idx = log.findIndex((e) => e.date === key);
          const prevCount = idx >= 0 ? log[idx].count : 0;
          const target = h.target ?? 1;
          const nextCount = Math.max(0, Math.min(target * 4, prevCount + delta));
          const nextLog =
            idx >= 0
              ? log.map((e, i) => (i === idx ? { ...e, count: nextCount } : e))
              : [...log, { date: key, count: nextCount }];
          const wasComplete = prevCount >= target;
          const nowComplete = nextCount >= target;
          let completions = h.completions;
          if (!wasComplete && nowComplete) {
            completions = h.completions.includes(key)
              ? h.completions
              : [...h.completions, key];
            box.event = { habitId: id, kind: 'volumeTarget' };
          } else if (wasComplete && !nowComplete) {
            completions = h.completions.filter((c) => c !== key);
          } else if (delta > 0) {
            box.event = { habitId: id, kind: 'volumeTick' };
          }
          box.completions = completions;
          return { ...h, completions, volumeLog: nextLog };
        })
      );
      const evt = box.event;
      if (evt && evt.kind === 'volumeTarget') {
        const completed = evaluateChallenge(id, box.completions);
        if (completed) {
          return { ...evt, completedChallenge: completed };
        }
      }
      return evt;
    },
    [evaluateChallenge]
  );

  const isCompletedOn = useCallback(
    (habit: Habit, key: string) => habit.completions.includes(key),
    []
  );

  const streak = useCallback((habit: Habit) => {
    const set = new Set(habit.completions);
    let count = 0;
    const cursor = new Date();
    if (!set.has(dateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!set.has(dateKey(cursor))) return 0;
    }
    while (set.has(dateKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, []);

  const bestStreak = useCallback((habit: Habit) => {
    if (habit.completions.length === 0) return 0;
    const sorted = [...habit.completions].sort();
    let best = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (addDays(sorted[i - 1], 1) === sorted[i]) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 1;
      }
    }
    return best;
  }, []);

  const startChallenge = useCallback(
    (habitId: string, lengthDays: number): Challenge | null => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return null;
      const challenge: Challenge = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        habitId,
        lengthDays,
        startedAt: todayKey(),
        status: 'active',
      };
      setChallenges((prev) => [
        ...prev.filter((c) => !(c.habitId === habitId && c.status === 'active')),
        challenge,
      ]);
      return challenge;
    },
    [habits]
  );

  const activeChallengeFor = useCallback(
    (habitId: string) => challenges.find((c) => c.habitId === habitId && c.status === 'active'),
    [challenges]
  );

  const backfillDays = useCallback((habitId: string, days: number) => {
    if (days <= 0) return;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const set = new Set(h.completions);
        const target = h.target ?? 1;
        const cursor = new Date();
        for (let i = 0; i < days; i++) {
          set.add(dateKey(cursor));
          cursor.setDate(cursor.getDate() - 1);
        }
        const completions = Array.from(set).sort();
        let volumeLog = h.volumeLog;
        if (h.type === 'volume') {
          const map = new Map((h.volumeLog ?? []).map((e) => [e.date, e.count] as const));
          const back = new Date();
          for (let i = 0; i < days; i++) {
            const k = dateKey(back);
            const existing = map.get(k) ?? 0;
            map.set(k, Math.max(existing, target));
            back.setDate(back.getDate() - 1);
          }
          volumeLog = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
        }
        return { ...h, completions, volumeLog };
      })
    );
  }, []);

  const forceCompleteChallenge = useCallback(
    (challengeId: string): CompletionEvent | null => {
      const target = challenges.find((c) => c.id === challengeId);
      if (!target) return null;
      const today = todayKey();
      // Move startedAt back so that today is the last day, and back-fill all required days.
      const newStart = (() => {
        const d = new Date();
        d.setDate(d.getDate() - (target.lengthDays - 1));
        return dateKey(d);
      })();
      let result: CompletionEvent | null = null;
      setHabits((prevHabits) =>
        prevHabits.map((h) => {
          if (h.id !== target.habitId) return h;
          const set = new Set(h.completions);
          for (let i = 0; i < target.lengthDays; i++) {
            set.add(addDays(newStart, i));
          }
          const completions = Array.from(set).sort();
          let volumeLog = h.volumeLog;
          if (h.type === 'volume') {
            const t = h.target ?? 1;
            const map = new Map((h.volumeLog ?? []).map((e) => [e.date, e.count] as const));
            for (let i = 0; i < target.lengthDays; i++) {
              const k = addDays(newStart, i);
              map.set(k, Math.max(map.get(k) ?? 0, t));
            }
            volumeLog = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
          }
          return { ...h, completions, volumeLog };
        })
      );
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== challengeId) return c;
          return { ...c, startedAt: newStart, status: 'completed', completedAt: today };
        })
      );
      result = { habitId: target.habitId, kind: 'checkoff', completedChallenge: { ...target, startedAt: newStart, status: 'completed', completedAt: today } };
      return result;
    },
    [challenges]
  );

  const clearTodayForAll = useCallback(() => {
    const today = todayKey();
    setHabits((prev) =>
      prev.map((h) => {
        const completions = h.completions.filter((c) => c !== today);
        let volumeLog = h.volumeLog;
        if (h.type === 'volume') {
          volumeLog = (h.volumeLog ?? []).filter((e) => e.date !== today);
        }
        return { ...h, completions, volumeLog };
      })
    );
  }, []);

  const clearAll = useCallback(() => {
    setHabits([]);
    setChallenges([]);
  }, []);

  const value = useMemo<HabitsContextValue>(
    () => ({
      habits,
      challenges,
      loaded,
      addHabit,
      updateHabit,
      removeHabit,
      toggleToday,
      incrementVolume,
      isCompletedOn,
      streak,
      bestStreak,
      startChallenge,
      activeChallengeFor,
      forceCompleteChallenge,
      backfillDays,
      clearTodayForAll,
      clearAll,
    }),
    [
      habits,
      challenges,
      loaded,
      addHabit,
      updateHabit,
      removeHabit,
      toggleToday,
      incrementVolume,
      isCompletedOn,
      streak,
      bestStreak,
      startChallenge,
      activeChallengeFor,
      forceCompleteChallenge,
      backfillDays,
      clearTodayForAll,
      clearAll,
    ]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used inside <HabitsProvider>');
  return ctx;
}

export function volumeCountFor(habit: Habit, key: string): number {
  if (habit.type !== 'volume') return 0;
  return habit.volumeLog?.find((e) => e.date === key)?.count ?? 0;
}
