import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

import { Text, View } from '@/components/Themed';
import ThemedInput from '@/components/ThemedInput';
import { useHabits } from '@/lib/HabitsContext';
import { notificationsAvailable, requestPermission, rescheduleReminders } from '@/lib/notifications';
import { useSettings, type ThemePreference } from '@/lib/SettingsContext';
import { useReward } from '@/lib/reward';

export default function SettingsScreen() {
  const { settings, update, reset } = useSettings();
  const {
    habits,
    challenges,
    clearAll,
    forceCompleteChallenge,
    backfillDays,
    clearTodayForAll,
  } = useHabits();
  const { fire } = useReward();
  const router = useRouter();

  const toggleNotifications = async (next: boolean) => {
    if (!next) {
      update({ notificationsEnabled: false });
      await rescheduleReminders({ ...settings, notificationsEnabled: false }, habits);
      return;
    }
    if (!notificationsAvailable()) {
      update({ notificationsEnabled: false });
      return;
    }
    const granted = await requestPermission();
    update({ notificationsEnabled: granted });
    if (granted) {
      await rescheduleReminders({ ...settings, notificationsEnabled: true }, habits);
    }
  };

  const onResetData = () => {
    const confirm = () => {
      clearAll();
      reset();
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Erase all habits, challenges, and settings?')) confirm();
      return;
    }
    Alert.alert('Reset everything?', 'All habits, challenges, and settings will be erased.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: confirm },
    ]);
  };

  const activeChallenges = challenges.filter((c) => c.status === 'active');

  const THEME_OPTIONS: { value: ThemePreference; label: string; emoji: string }[] = [
    { value: 'system', label: 'System', emoji: '⚙️' },
    { value: 'light', label: 'Light', emoji: '☀️' },
    { value: 'dark', label: 'Dark', emoji: '🌙' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Settings</Text>

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map((opt) => {
          const active = settings.theme === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => update({ theme: opt.value })}
              style={({ pressed }) => [
                styles.themeBtn,
                active && styles.themeBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.themeEmoji}>{opt.emoji}</Text>
              <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Reward</Text>
      <Row label="Haptic feedback" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
      <Row label="Chime sound" value={settings.sound} onChange={(v) => update({ sound: v })} />

      <Text style={styles.sectionTitle}>Reminders</Text>
      <Row
        label="Daily push reminders"
        value={settings.notificationsEnabled}
        onChange={toggleNotifications}
      />
      {!notificationsAvailable() ? (
        <Text style={styles.note}>Push reminders only work on a real device build (not web).</Text>
      ) : null}
      <View style={styles.timeCard}>
        <Text style={styles.timeCardLabel}>Default reminder time</Text>
        <Text style={styles.timeCardHint}>
          Used for new habits. Each habit can override this in its detail screen.
        </Text>
        <ThemedInput
          value={settings.defaultReminderTime}
          onChangeText={(v) => update({ defaultReminderTime: v.replace(/[^0-9:]/g, '').slice(0, 5) })}
          onBlur={async () => {
            await rescheduleReminders(settings, habits);
          }}
          placeholder="09:00"
          style={styles.timeInput}
          maxLength={5}
        />
      </View>

      <Text style={styles.sectionTitle}>Developer</Text>
      <Row
        label="Show dev tools"
        value={settings.devMode}
        onChange={(v) => update({ devMode: v })}
      />
      {settings.devMode ? (
        <View style={styles.devCard}>
          <Text style={styles.devSubtitle}>Trigger rewards</Text>
          <View style={styles.devBtnRow}>
            <Pressable
              onPress={() => fire('daily')}
              style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}
            >
              <Text style={styles.devBtnText}>🎉 Daily</Text>
            </Pressable>
            <Pressable
              onPress={() => fire('volumeTick')}
              style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}
            >
              <Text style={styles.devBtnText}>💧 Tick</Text>
            </Pressable>
            <Pressable
              onPress={() => fire('challenge', '3-day · Sample')}
              style={({ pressed }) => [styles.devBtnPrimary, pressed && styles.pressed]}
            >
              <Text style={styles.devBtnPrimaryText}>🏆 Challenge</Text>
            </Pressable>
          </View>

          <Text style={styles.devSubtitle}>Active challenges</Text>
          {activeChallenges.length === 0 ? (
            <Text style={styles.empty}>None active. Start one from any habit.</Text>
          ) : (
            activeChallenges.map((c) => {
              const habit = habits.find((h) => h.id === c.habitId);
              return (
                <View key={c.id} style={styles.devRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.devRowTitle} numberOfLines={1}>
                      {habit ? `${habit.emoji} ${habit.name}` : 'Deleted'}
                    </Text>
                    <Text style={styles.devRowSub}>
                      {c.lengthDays}-day · started {c.startedAt}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      const evt = forceCompleteChallenge(c.id);
                      if (evt?.completedChallenge && habit) {
                        fire(
                          'challenge',
                          `${c.lengthDays}-day · ${habit.name}`
                        );
                      }
                    }}
                    style={({ pressed }) => [styles.devRowBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.devRowBtnText}>Force complete</Text>
                  </Pressable>
                </View>
              );
            })
          )}

          <Text style={styles.devSubtitle}>Backfill past days</Text>
          {habits.length === 0 ? (
            <Text style={styles.empty}>Add a habit first.</Text>
          ) : (
            habits.map((h) => (
              <View key={h.id} style={styles.devRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.devRowTitle} numberOfLines={1}>
                    {h.emoji} {h.name}
                  </Text>
                  <Text style={styles.devRowSub}>{h.completions.length} check-ins</Text>
                </View>
                <Pressable
                  onPress={() => backfillDays(h.id, 7)}
                  style={({ pressed }) => [styles.devSmallBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.devSmallBtnText}>+7d</Text>
                </Pressable>
                <Pressable
                  onPress={() => backfillDays(h.id, 30)}
                  style={({ pressed }) => [styles.devSmallBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.devSmallBtnText}>+30d</Text>
                </Pressable>
              </View>
            ))
          )}

          <Pressable
            onPress={clearTodayForAll}
            style={({ pressed }) => [styles.devBtnWide, pressed && styles.pressed]}
          >
            <Text style={styles.devBtnText}>Reset today (clear today&apos;s completions)</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Data</Text>
      <Pressable
        onPress={() => {
          update({ onboarded: false });
          router.replace('/onboarding' as never);
        }}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Text style={styles.btnText}>Re-run onboarding</Text>
      </Pressable>
      <Pressable
        onPress={onResetData}
        style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]}
      >
        <Text style={styles.btnDangerText}>Erase all data</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.12)',
    marginBottom: 8,
  },
  rowLabel: { fontSize: 15, flex: 1, marginRight: 8 },
  note: {
    fontSize: 12,
    opacity: 0.65,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  timeCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.10)',
  },
  timeCardLabel: { fontSize: 14, fontWeight: '700' },
  timeCardHint: { fontSize: 12, opacity: 0.6, marginTop: 2, marginBottom: 10 },
  timeInput: {
    width: 100,
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  devCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.10)',
    marginTop: 4,
  },
  devSubtitle: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
  },
  devBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  devBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(47,149,220,0.18)',
  },
  devBtnText: { color: '#2f95dc', fontWeight: '700' },
  devBtnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2f95dc',
  },
  devBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  devBtnWide: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(47,149,220,0.18)',
    alignItems: 'center',
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
    borderBottomColor: 'rgba(127,127,127,0.18)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devRowTitle: { fontWeight: '600' },
  devRowSub: { fontSize: 11, opacity: 0.6, marginTop: 1 },
  devRowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
  },
  devRowBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  devSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(47,149,220,0.22)',
  },
  devSmallBtnText: { color: '#2f95dc', fontWeight: '700', fontSize: 12 },
  empty: { opacity: 0.55, fontSize: 13, fontStyle: 'italic', paddingHorizontal: 4 },
  btn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(47,149,220,0.18)',
    alignItems: 'center',
  },
  btnText: { color: '#2f95dc', fontWeight: '700', fontSize: 15 },
  btnDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d33',
  },
  btnDangerText: { color: '#d33', fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.7 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.12)',
    alignItems: 'center',
  },
  themeBtnActive: {
    backgroundColor: '#2f95dc',
  },
  themeEmoji: { fontSize: 22, marginBottom: 4 },
  themeLabel: { fontSize: 13, fontWeight: '700' },
  themeLabelActive: { color: '#fff' },
});
