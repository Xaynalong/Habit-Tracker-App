import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet } from 'react-native';

import HabitForm from '@/components/HabitForm';
import { Text, View } from '@/components/Themed';
import { useHabits } from '@/lib/HabitsContext';
import { notificationsAvailable, requestPermission, rescheduleReminders } from '@/lib/notifications';
import { useSettings } from '@/lib/SettingsContext';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { habits, addHabit, startChallenge } = useHabits();
  const { settings, update } = useSettings();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [createdHabitId, setCreatedHabitId] = useState<string | null>(null);

  const goTo = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const finish = async (opts: { challenge: boolean; reminders: boolean }) => {
    const habitId = createdHabitId ?? habits[0]?.id ?? null;
    if (habitId && opts.challenge) {
      startChallenge(habitId, 3);
    }
    if (opts.reminders && notificationsAvailable()) {
      const granted = await requestPermission();
      update({ notificationsEnabled: granted });
      if (granted) {
        await rescheduleReminders(
          { ...settings, notificationsEnabled: true },
          habits
        );
      }
    }
    update({ onboarded: true });
    router.replace('/' as never);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Step 1: Welcome */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.kicker}>Welcome</Text>
            <Text style={styles.title}>Build habits that stick.</Text>
            <Text style={styles.body}>
              Track daily check-offs or volume habits. Earn a little dopamine every time you show up,
              and keep streaks running with friendly nudges.
            </Text>
            <View style={styles.bullets}>
              <Bullet emoji="🎯" text="Core function: create + track habits" />
              <Bullet emoji="🎉" text="Reward loop with visual + haptic + sound" />
              <Bullet emoji="🏆" text="Challenges of any length you want" />
              <Bullet emoji="📊" text="See your consistency on Progress" />
            </View>
            <Pressable onPress={() => goTo(1)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>Show me how it works</Text>
            </Pressable>
          </View>

          {/* Step 2: How it works */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.kicker}>How it works</Text>
            <Text style={styles.title}>Four steps. That&apos;s it.</Text>
            <View style={styles.howWrap}>
              <HowStep
                num="1"
                title="Create"
                body="Add a habit on the Habits tab. Pick check-off (once a day) or volume (target N times a day, like water)."
              />
              <HowStep
                num="2"
                title="Track"
                body="On Today, tap a habit to mark it done — or use the +/− on volume habits. You get a tiny celebration each time."
              />
              <HowStep
                num="3"
                title="Challenge"
                body="Start a 3, 7, 21, 30 or custom-day challenge from any habit. Hit every day to earn a bigger reward at the end."
              />
              <HowStep
                num="4"
                title="Remember"
                body="Set a reminder time per habit. We'll nudge you. Watch your streaks grow on Progress."
              />
            </View>
            <Pressable onPress={() => goTo(2)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>Got it — let&apos;s set up</Text>
            </Pressable>
          </View>

          {/* Step 3: First habit */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.kicker}>Step 1 of 2</Text>
            <Text style={styles.title}>Pick your first habit.</Text>
            <Text style={styles.body}>Start with one. You can add more later.</Text>
            <HabitForm
              submitLabel={createdHabitId ? 'Next →' : 'Create habit'}
              onSubmit={(values) => {
                if (createdHabitId) {
                  goTo(3);
                  return;
                }
                const id = addHabit(values);
                if (id) {
                  setCreatedHabitId(id);
                  goTo(3);
                }
              }}
            />
          </View>

          {/* Step 4: Challenge + reminders */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.kicker}>Step 2 of 2</Text>
            <Text style={styles.title}>Lock it in.</Text>
            <Text style={styles.body}>
              A 3-day challenge gives you something to aim for. Reminders keep it from slipping.
            </Text>
            <View style={styles.optionsCol}>
              <Pressable
                onPress={() => finish({ challenge: true, reminders: true })}
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
              >
                <Text style={styles.ctaText}>Start 3-day challenge + reminders</Text>
              </Pressable>
              <Pressable
                onPress={() => finish({ challenge: true, reminders: false })}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Just the challenge</Text>
              </Pressable>
              <Pressable
                onPress={() => finish({ challenge: false, reminders: false })}
                style={({ pressed }) => [styles.tertiary, pressed && styles.pressed]}
              >
                <Text style={styles.tertiaryText}>Skip both</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, page === i && styles.dotActive]} />
          ))}
        </View>
      </View>
    </>
  );
}

function Bullet({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletEmoji}>{emoji}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function HowStep({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <View style={styles.howStep}>
      <View style={styles.howNum}>
        <Text style={styles.howNumText}>{num}</Text>
      </View>
      <View style={styles.howText}>
        <Text style={styles.howTitle}>{title}</Text>
        <Text style={styles.howBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  page: { paddingHorizontal: 24, paddingBottom: 80 },
  kicker: {
    fontSize: 12,
    opacity: 0.55,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { fontSize: 30, fontWeight: '800', marginTop: 6, lineHeight: 36 },
  body: { fontSize: 15, opacity: 0.7, marginTop: 10, lineHeight: 22 },
  bullets: { marginTop: 24, gap: 12 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletEmoji: { fontSize: 22 },
  bulletText: { fontSize: 15, flex: 1 },
  cta: {
    marginTop: 28,
    backgroundColor: '#2f95dc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  optionsCol: { marginTop: 20, gap: 10 },
  secondary: {
    backgroundColor: 'rgba(47,149,220,0.18)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#2f95dc', fontWeight: '700', fontSize: 15 },
  tertiary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryText: { opacity: 0.6, fontWeight: '600', fontSize: 14 },
  pressed: { opacity: 0.75 },
  dots: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(127,127,127,0.3)',
  },
  dotActive: { backgroundColor: '#2f95dc', width: 24 },
  howWrap: { marginTop: 20, gap: 14 },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  howNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  howNumText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  howText: { flex: 1 },
  howTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  howBody: { fontSize: 13, opacity: 0.72, lineHeight: 18 },
});
