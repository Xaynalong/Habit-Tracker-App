import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { addDays, dateKey, todayKey, type Challenge, type Habit } from '@/lib/HabitsContext';

const WEEKS = 12;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function ConsistencyHeatmap({ habits }: { habits: Habit[] }) {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon
  const todayKeyStr = dateKey(today);

  const totalHabits = Math.max(1, habits.length);

  const columns: { dayKey: string; ratio: number; isFuture: boolean }[][] = [];
  const anchor = new Date(today);
  anchor.setDate(anchor.getDate() - dayOfWeek - (WEEKS - 1) * 7);

  for (let w = 0; w < WEEKS; w++) {
    const col: { dayKey: string; ratio: number; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(anchor);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const cellKey = dateKey(cellDate);
      const isFuture = cellKey > todayKeyStr;
      const hits = habits.filter((h) => h.completions.includes(cellKey)).length;
      const ratio = hits / totalHabits;
      col.push({ dayKey: cellKey, ratio, isFuture });
    }
    columns.push(col);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.labelCol}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.dayLabel}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.col}>
              {col.map((cell, ri) => (
                <View
                  key={ri}
                  style={[
                    styles.cell,
                    cell.isFuture ? styles.cellFuture : colorForRatio(cell.ratio),
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <View key={r} style={[styles.legendCell, colorForRatio(r)]} />
        ))}
        <Text style={styles.legendText}>more</Text>
      </View>
    </View>
  );
}

export function HabitBars({
  habits,
  activeChallenges,
}: {
  habits: Habit[];
  activeChallenges: Challenge[];
}) {
  return (
    <View style={{ gap: 12 }}>
      {habits.map((h) => {
        const active = activeChallenges.find((c) => c.habitId === h.id);
        const { hits, window, label } = computeWindow(h, active);
        const pct = window > 0 ? hits / window : 0;
        return (
          <View key={h.id} style={barStyles.row}>
            <Text style={barStyles.emoji}>{h.emoji}</Text>
            <View style={barStyles.barWrap}>
              <View style={barStyles.barHeader}>
                <Text style={barStyles.name} numberOfLines={1}>
                  {h.name}
                </Text>
                <Text style={barStyles.barCount}>
                  {hits} / {window}
                </Text>
              </View>
              <View style={barStyles.barTrack}>
                <View style={[barStyles.barFill, { width: `${Math.min(1, pct) * 100}%` }]} />
              </View>
              <Text style={barStyles.barMeta}>{label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function computeWindow(habit: Habit, active?: Challenge) {
  // If there's an active challenge, count its window. Otherwise last 30 days.
  if (active) {
    let hits = 0;
    for (let i = 0; i < active.lengthDays; i++) {
      const k = addDays(active.startedAt, i);
      if (k > todayKey()) break;
      if (habit.completions.includes(k)) hits += 1;
    }
    return {
      hits,
      window: active.lengthDays,
      label: `${active.lengthDays}-day challenge progress`,
    };
  }
  const today = new Date();
  let hits = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (habit.completions.includes(dateKey(d))) hits += 1;
  }
  return { hits, window: 30, label: 'Last 30 days' };
}

function colorForRatio(r: number) {
  if (r === 0) return { backgroundColor: 'rgba(127,127,127,0.18)' };
  if (r <= 0.25) return { backgroundColor: 'rgba(47,149,220,0.25)' };
  if (r <= 0.5) return { backgroundColor: 'rgba(47,149,220,0.5)' };
  if (r <= 0.75) return { backgroundColor: 'rgba(47,149,220,0.75)' };
  return { backgroundColor: '#2f95dc' };
}

const CELL_SIZE = 14;
const CELL_GAP = 3;

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.08)',
  },
  row: { flexDirection: 'row' },
  labelCol: {
    marginRight: 6,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  dayLabel: {
    fontSize: 10,
    opacity: 0.6,
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
  },
  grid: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  col: { gap: CELL_GAP },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  cellFuture: { backgroundColor: 'transparent' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  legendText: { fontSize: 10, opacity: 0.6 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
});

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 22 },
  barWrap: { flex: 1 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  barCount: { fontSize: 12, fontWeight: '700', color: '#2f95dc' },
  barTrack: {
    marginTop: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(127,127,127,0.18)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#2f95dc',
  },
  barMeta: { fontSize: 11, opacity: 0.6, marginTop: 3 },
});
