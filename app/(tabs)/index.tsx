import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import ActiveChallengeBanner from '@/components/ActiveChallengeBanner';
import HabitRow from '@/components/HabitRow';
import { Text, View } from '@/components/Themed';
import { todayKey, useHabits } from '@/lib/HabitsContext';
import { useReward } from '@/lib/reward';

export default function TodayScreen() {
  const { habits, loaded, isCompletedOn } = useHabits();
  const { fire } = useReward();
  const router = useRouter();
  const key = todayKey();

  if (!loaded) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (habits.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No habits yet</Text>
        <Text style={styles.emptySub}>Add one on the Habits tab to get started.</Text>
        <Link href="/habits" style={styles.link}>
          <Text style={styles.linkText}>Go to Habits →</Text>
        </Link>
      </View>
    );
  }

  const completedCount = habits.filter((h) => isCompletedOn(h, key)).length;
  const allDone = completedCount === habits.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{formatToday()}</Text>
        <Text style={styles.headerSub}>
          {allDone ? '🎉 ' : ''}
          {completedCount} of {habits.length} done
        </Text>
      </View>
      <ActiveChallengeBanner />
      <ScrollView contentContainerStyle={styles.list}>
        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            onCompletion={(evt) => {
              if (evt.kind === 'checkoff' || evt.kind === 'volumeTarget') {
                if (evt.completedChallenge) {
                  const h = habits.find((x) => x.id === evt.habitId);
                  fire(
                    'challenge',
                    h ? `${evt.completedChallenge.lengthDays}-day · ${h.name}` : undefined
                  );
                } else {
                  fire('daily');
                }
              } else if (evt.kind === 'volumeTick') {
                fire('volumeTick');
              }
            }}
            onLongPress={() => router.push(`/habit/${habit.id}` as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 14, opacity: 0.6, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  link: { paddingVertical: 10, paddingHorizontal: 16 },
  linkText: { color: '#2f95dc', fontWeight: '600' },
});
