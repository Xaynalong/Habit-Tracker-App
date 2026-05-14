import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View as RNView } from 'react-native';

import { Text } from '@/components/Themed';
import { addDays, todayKey, useHabits } from '@/lib/HabitsContext';

export default function ActiveChallengeBanner() {
  const router = useRouter();
  const { challenges, habits, isCompletedOn } = useHabits();
  const today = todayKey();

  const active = challenges
    .filter((c) => c.status === 'active')
    .filter((c) => habits.some((h) => h.id === c.habitId));

  if (active.length === 0) return null;

  return (
    <>
      {active.map((c) => {
        const habit = habits.find((h) => h.id === c.habitId)!;
        const dayIdx = daysBetween(c.startedAt, today);
        const dayNum = Math.min(c.lengthDays, Math.max(1, dayIdx + 1));
        const doneToday = isCompletedOn(habit, today);
        return (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/habit/${habit.id}` as never)}
            style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
          >
            <RNView style={styles.bannerLeft}>
              <Text style={styles.bannerEmoji}>{habit.emoji}</Text>
              <RNView style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  {c.lengthDays}-day challenge · {habit.name}
                </Text>
                <Text style={styles.bannerSub}>
                  Day {dayNum} of {c.lengthDays}
                  {doneToday ? ' · ✓ done today' : ' · not yet today'}
                </Text>
              </RNView>
            </RNView>
            <RNView style={styles.dots}>
              {Array.from({ length: c.lengthDays }).map((_, i) => {
                const day = addDays(c.startedAt, i);
                const hit = isCompletedOn(habit, day);
                const isToday = day === today;
                return (
                  <RNView
                    key={i}
                    style={[
                      styles.dot,
                      hit && styles.dotHit,
                      isToday && !hit && styles.dotToday,
                    ]}
                  />
                );
              })}
            </RNView>
          </Pressable>
        );
      })}
    </>
  );
}

function daysBetween(startKey: string, endKey: string): number {
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const [ey, em, ed] = endKey.split('-').map(Number);
  const a = new Date(sy, sm - 1, sd);
  const b = new Date(ey, em - 1, ed);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#2f95dc',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.85 },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  bannerEmoji: { fontSize: 24 },
  bannerTextCol: { flex: 1 },
  bannerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerSub: {
    color: '#fff',
    opacity: 0.85,
    fontSize: 12,
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotHit: { backgroundColor: '#fff' },
  dotToday: {
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
});
