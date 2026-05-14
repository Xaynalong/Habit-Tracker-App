import { ScrollView, StyleSheet } from 'react-native';

import ConsistencyHeatmap, { HabitBars } from '@/components/ConsistencyHeatmap';
import { Text, View } from '@/components/Themed';
import { useHabits } from '@/lib/HabitsContext';

export default function ProgressScreen() {
  const { habits, challenges, loaded } = useHabits();

  if (!loaded) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const finishedChallenges = challenges.filter((c) => c.status !== 'active');
  const completedCount = finishedChallenges.filter((c) => c.status === 'completed').length;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Progress</Text>
      <Text style={styles.sub}>How consistent you&apos;ve been across all habits.</Text>

      <Text style={styles.sectionTitle}>Last 12 weeks</Text>
      {habits.length === 0 ? (
        <Text style={styles.empty}>Add a habit to see your consistency here.</Text>
      ) : (
        <ConsistencyHeatmap habits={habits} />
      )}

      {habits.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Per-habit progress</Text>
          <HabitBars
            habits={habits}
            activeChallenges={challenges.filter((c) => c.status === 'active')}
          />
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Challenges</Text>
      <View style={styles.statRow}>
        <Stat
          label="Completed"
          value={String(completedCount)}
          accent
        />
        <Stat
          label="Attempted"
          value={String(finishedChallenges.length)}
        />
        <Stat
          label="Active"
          value={String(challenges.filter((c) => c.status === 'active').length)}
        />
      </View>

      {finishedChallenges.length > 0 ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          {finishedChallenges
            .slice()
            .sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1))
            .map((c) => {
              const habit = habits.find((h) => h.id === c.habitId);
              return (
                <View key={c.id} style={styles.historyItem}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {c.status === 'completed' ? '🏆' : '⚠️'}{' '}
                    {habit ? `${habit.emoji} ${habit.name}` : 'Deleted habit'}
                  </Text>
                  <Text style={styles.historySub}>
                    {c.lengthDays}-day · started {c.startedAt}
                  </Text>
                </View>
              );
            })}
        </View>
      ) : (
        <Text style={styles.empty}>No challenges finished yet.</Text>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={[styles.statValue, accent && { color: '#fff' }]}>{value}</Text>
      <Text style={[styles.statLabel, accent && { color: '#fff', opacity: 0.85 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 14, opacity: 0.65, marginTop: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  empty: { opacity: 0.6, fontStyle: 'italic', paddingHorizontal: 4 },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.12)',
    alignItems: 'center',
  },
  statAccent: { backgroundColor: '#2f95dc' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, opacity: 0.65, marginTop: 2 },
  historyItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(127,127,127,0.08)',
  },
  historyTitle: { fontWeight: '600' },
  historySub: { fontSize: 12, opacity: 0.65, marginTop: 2 },
});
