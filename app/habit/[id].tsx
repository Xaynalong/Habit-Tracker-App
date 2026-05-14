import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

import { EMOJI_OPTIONS } from '@/components/HabitForm';
import { Text, View } from '@/components/Themed';
import ThemedInput from '@/components/ThemedInput';
import { useHabits, volumeCountFor, type HabitType } from '@/lib/HabitsContext';
import { rescheduleReminders } from '@/lib/notifications';
import { useSettings } from '@/lib/SettingsContext';
import { useReward } from '@/lib/reward';

const CHALLENGE_PRESETS = [3, 7, 21, 30];

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { settings } = useSettings();
  const {
    habits,
    updateHabit,
    removeHabit,
    startChallenge,
    activeChallengeFor,
    challenges,
    streak,
    bestStreak,
  } = useHabits();
  const { fire } = useReward();
  const habit = habits.find((h) => h.id === id);

  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '✅');
  const [type, setType] = useState<HabitType>(habit?.type ?? 'checkoff');
  const [target, setTarget] = useState(String(habit?.target ?? 3));
  const [reminderTime, setReminderTime] = useState(
    habit?.reminderTime ?? settings.defaultReminderTime
  );
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled !== false);
  const [reminderDirty, setReminderDirty] = useState(false);
  const [reminderSavedFlash, setReminderSavedFlash] = useState(false);
  const [customDays, setCustomDays] = useState('14');
  const [dirty, setDirty] = useState(false);

  const grouped = useMemo(() => groupByMonth(habit), [habit]);
  const active = habit ? activeChallengeFor(habit.id) : undefined;
  const history = useMemo(
    () => (habit ? challenges.filter((c) => c.habitId === habit.id && c.status !== 'active') : []),
    [habit, challenges]
  );

  if (!habit) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Habit' }} />
        <Text>Habit not found.</Text>
      </View>
    );
  }

  const currentStreak = streak(habit);
  const best = bestStreak(habit);

  const saveEdits = async () => {
    if (!dirty) return;
    const t = Math.max(1, Math.min(20, parseInt(target, 10) || 1));
    updateHabit(habit.id, {
      name: name.trim() || habit.name,
      emoji,
      type,
      ...(type === 'volume' ? { target: t } : {}),
    });
    setDirty(false);
  };

  const saveReminder = async () => {
    updateHabit(habit.id, {
      reminderEnabled,
      reminderTime: normalizeTime(reminderTime),
    });
    setReminderDirty(false);
    setReminderSavedFlash(true);
    setTimeout(() => setReminderSavedFlash(false), 2000);
    await rescheduleReminders(settings, habits);
  };

  const onStartChallenge = (lengthDays: number) => {
    const result = startChallenge(habit.id, lengthDays);
    if (result) {
      fire('daily', `${lengthDays}-day challenge started`);
    }
  };

  const onStartCustomChallenge = () => {
    const n = Math.max(1, Math.min(365, parseInt(customDays, 10) || 0));
    if (n > 0) onStartChallenge(n);
  };

  const onDelete = () => {
    const confirm = () => {
      removeHabit(habit.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Delete "${habit.name}"?`)) confirm();
      return;
    }
    Alert.alert('Delete habit?', `"${habit.name}" and its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirm },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: habit.name }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <Text style={styles.headerEmoji}>{habit.emoji}</Text>
          <Text style={styles.headerName} numberOfLines={2}>
            {habit.name}
          </Text>
          <Text style={styles.headerSub}>
            {habit.type === 'volume' ? `Volume · target ${habit.target}/day` : 'Daily check-off'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Stat label="Current" value={String(currentStreak)} unit="day streak" emoji="🔥" />
          <Stat label="Best" value={String(best)} unit="day streak" emoji="🏅" />
          <Stat
            label="Total"
            value={String(habit.completions.length)}
            unit={habit.completions.length === 1 ? 'check-in' : 'check-ins'}
            emoji="✅"
          />
        </View>

        <Text style={styles.sectionTitle}>Challenges</Text>
        <View style={styles.challengeCard}>
          {active ? (
            <View style={styles.challengeActiveInner}>
              <Text style={styles.challengeActiveText}>
                {active.lengthDays}-day challenge in progress
              </Text>
              <Text style={styles.challengeActiveSub}>Started {active.startedAt}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.challengeIntro}>Pick a length:</Text>
              <View style={styles.challengeRow}>
                {CHALLENGE_PRESETS.map((days) => (
                  <Pressable
                    key={days}
                    onPress={() => onStartChallenge(days)}
                    style={({ pressed }) => [styles.challengeBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.challengeBtnText}>{days}-day</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.divider} />
              <Text style={styles.challengeIntro}>Or pick your own:</Text>
              <View style={styles.customRow}>
                <ThemedInput
                  value={customDays}
                  onChangeText={(t) => setCustomDays(t.replace(/[^0-9]/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  style={styles.customInput}
                  placeholder="14"
                />
                <Text style={styles.customLabel}>days</Text>
                <Pressable
                  onPress={onStartCustomChallenge}
                  style={({ pressed }) => [styles.customStart, pressed && styles.pressed]}
                >
                  <Text style={styles.customStartText}>Start challenge</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {history.length > 0 ? (
          <View style={styles.historyList}>
            {history
              .slice()
              .sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1))
              .map((c) => (
                <View key={c.id} style={styles.historyItem}>
                  <Text style={styles.historyTitle}>
                    {c.status === 'completed' ? '🏆' : '⚠️'} {c.lengthDays}-day challenge
                  </Text>
                  <Text style={styles.historySub}>
                    Started {c.startedAt} · {c.status}
                  </Text>
                </View>
              ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Reminder</Text>
        <View style={styles.reminderCard}>
          <View style={styles.reminderToggleRow}>
            <Text style={styles.reminderLabel}>Daily reminder for this habit</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={(v) => {
                setReminderEnabled(v);
                setReminderDirty(true);
              }}
            />
          </View>
          {reminderEnabled ? (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.timeInputRow}>
                <Text style={styles.timeLabel}>Time</Text>
                <ThemedInput
                  value={reminderTime}
                  onChangeText={(v) => {
                    const cleaned = v.replace(/[^0-9:]/g, '').slice(0, 5);
                    setReminderTime(cleaned);
                    setReminderDirty(true);
                  }}
                  placeholder="09:00"
                  style={styles.timeInput}
                  maxLength={5}
                />
                <Text style={styles.timeHint}>HH:mm (24-hour)</Text>
              </View>
            </>
          ) : null}
          <Pressable
            onPress={saveReminder}
            disabled={!reminderDirty && !reminderSavedFlash}
            style={({ pressed }) => [
              styles.reminderSaveBtn,
              !reminderDirty && !reminderSavedFlash && styles.reminderSaveBtnIdle,
              reminderSavedFlash && styles.reminderSaveBtnSaved,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.reminderSaveBtnText,
                !reminderDirty && !reminderSavedFlash && styles.reminderSaveBtnTextIdle,
              ]}
            >
              {reminderSavedFlash
                ? `✓ Saved — ${reminderEnabled ? normalizeTime(reminderTime) : 'off'}`
                : reminderDirty
                ? 'Save reminder'
                : 'Reminder saved'}
            </Text>
          </Pressable>
          {!settings.notificationsEnabled ? (
            <Text style={styles.reminderHint}>
              Reminders are turned off globally. Enable them in Settings to receive nudges.
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Edit</Text>
        <View style={styles.editCard}>
          <Text style={styles.label}>Name</Text>
          <ThemedInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setDirty(true);
            }}
            style={styles.input}
          />
          <Text style={styles.label}>Icon</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_OPTIONS.map((opt) => {
              const selected = emoji === opt.emoji;
              return (
                <Pressable
                  key={opt.emoji}
                  onPress={() => {
                    setEmoji(opt.emoji);
                    setDirty(true);
                  }}
                  style={[styles.emojiTile, selected && styles.emojiTileSelected]}
                >
                  <Text style={styles.emojiTileEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[styles.emojiTileLabel, selected && styles.emojiTileLabelSelected]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => {
                setType('checkoff');
                setDirty(true);
              }}
              style={[styles.typeBtn, type === 'checkoff' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, type === 'checkoff' && styles.typeBtnTextActive]}>
                Daily check-off
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setType('volume');
                setDirty(true);
              }}
              style={[styles.typeBtn, type === 'volume' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, type === 'volume' && styles.typeBtnTextActive]}>
                Volume
              </Text>
            </Pressable>
          </View>
          {type === 'volume' ? (
            <>
              <Text style={styles.label}>Daily target</Text>
              <View style={styles.targetRow}>
                <Pressable
                  onPress={() => {
                    setTarget(String(Math.max(1, (parseInt(target, 10) || 1) - 1)));
                    setDirty(true);
                  }}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>
                <ThemedInput
                  value={target}
                  onChangeText={(t) => {
                    setTarget(t.replace(/[^0-9]/g, ''));
                    setDirty(true);
                  }}
                  keyboardType="number-pad"
                  style={styles.targetInput}
                />
                <Pressable
                  onPress={() => {
                    setTarget(String(Math.min(20, (parseInt(target, 10) || 0) + 1)));
                    setDirty(true);
                  }}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          <Pressable
            onPress={saveEdits}
            disabled={!dirty}
            style={({ pressed }) => [
              styles.saveBtn,
              !dirty && styles.saveBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveBtnText}>{dirty ? 'Save changes' : 'Saved'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>History</Text>
        {grouped.length === 0 ? (
          <Text style={styles.emptyHistory}>No completions logged yet.</Text>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.monthBlock}>
              <Text style={styles.monthLabel}>{group.label}</Text>
              {group.entries.map((entry) => (
                <View key={entry.date} style={styles.logRow}>
                  <Text style={styles.logDate}>{entry.date}</Text>
                  <Text style={styles.logDetail}>
                    {habit.type === 'volume'
                      ? `${entry.volume ?? volumeCountFor(habit, entry.date)} / ${habit.target}`
                      : '✓'}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}

        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        >
          <Text style={styles.deleteBtnText}>Delete habit</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  emoji,
}: {
  label: string;
  value: string;
  unit: string;
  emoji: string;
}) {
  return (
    <View style={statStyles.wrap}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={statStyles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={statStyles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={statStyles.unit} numberOfLines={1}>
        {unit}
      </Text>
    </View>
  );
}

function groupByMonth(habit: ReturnType<typeof useHabits>['habits'][number] | undefined) {
  if (!habit) return [];
  const map = new Map<string, { date: string; volume?: number }[]>();
  const sorted = [...habit.completions].sort((a, b) => (a > b ? -1 : 1));
  for (const date of sorted) {
    const monthLabel = monthLabelFor(date);
    if (!map.has(monthLabel)) map.set(monthLabel, []);
    const volume =
      habit.type === 'volume'
        ? habit.volumeLog?.find((e) => e.date === date)?.count
        : undefined;
    map.get(monthLabel)!.push({ date, volume });
  }
  return Array.from(map.entries()).map(([label, entries]) => ({ label, entries }));
}

function monthLabelFor(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function normalizeTime(value: string): string {
  const parts = value.split(':');
  const h = Math.min(23, Math.max(0, parseInt(parts[0] || '9', 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10) || 0));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 64 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.12)',
    marginBottom: 12,
  },
  headerEmoji: { fontSize: 48, marginBottom: 6 },
  headerName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  headerSub: { fontSize: 13, opacity: 0.65, marginTop: 4, textAlign: 'center' },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  challengeCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  challengeIntro: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  challengeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  challengeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2f95dc',
  },
  challengeBtnText: { fontWeight: '700', color: '#fff', fontSize: 14 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(127,127,127,0.3)',
    marginVertical: 14,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customLabel: { fontSize: 13, opacity: 0.7 },
  customInput: {
    width: 64,
    textAlign: 'center',
    backgroundColor: 'rgba(127,127,127,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  customStart: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2f95dc',
    marginLeft: 'auto',
  },
  customStartText: { color: '#fff', fontWeight: '700' },
  challengeActiveInner: {
    padding: 2,
  },
  challengeActiveText: { fontWeight: '700', fontSize: 15 },
  challengeActiveSub: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  historyList: { marginTop: 8, gap: 6 },
  historyItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  historyTitle: { fontWeight: '600' },
  historySub: { fontSize: 12, opacity: 0.65, marginTop: 2 },
  reminderCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.1)',
    overflow: 'hidden',
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderLabel: { fontSize: 15, flex: 1, marginRight: 8, fontWeight: '600' },
  reminderDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(127,127,127,0.3)',
    marginVertical: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeLabel: { fontSize: 14, opacity: 0.7, fontWeight: '600' },
  timeInput: {
    width: 90,
    textAlign: 'center',
    backgroundColor: 'rgba(127,127,127,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  timeHint: { fontSize: 12, opacity: 0.55, flex: 1 },
  reminderSaveBtn: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
  },
  reminderSaveBtnIdle: {
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  reminderSaveBtnSaved: {
    backgroundColor: '#3aaa5a',
  },
  reminderSaveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  reminderSaveBtnTextIdle: {
    color: '#888',
  },
  reminderHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 10,
    fontStyle: 'italic',
  },
  editCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  label: { fontSize: 13, opacity: 0.7, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiTile: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.18)',
    alignItems: 'center',
  },
  emojiTileSelected: { backgroundColor: '#2f95dc' },
  emojiTileEmoji: { fontSize: 24, marginBottom: 4 },
  emojiTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.85,
  },
  emojiTileLabelSelected: { color: '#fff', opacity: 1 },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    padding: 4,
    gap: 0,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#2f95dc',
  },
  typeBtnText: { fontWeight: '700', fontSize: 14 },
  typeBtnTextActive: { color: '#fff' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(127,127,127,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontWeight: '700' },
  targetInput: {
    width: 56,
    textAlign: 'center',
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: '#2f95dc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.7 },
  emptyHistory: { opacity: 0.6, fontStyle: 'italic', paddingHorizontal: 4 },
  monthBlock: { marginBottom: 12 },
  monthLabel: { fontSize: 12, opacity: 0.6, marginBottom: 4, marginLeft: 4 },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(127,127,127,0.08)',
    borderRadius: 8,
    marginBottom: 4,
  },
  logDate: { fontSize: 14 },
  logDetail: { fontSize: 14, fontWeight: '600', color: '#2f95dc' },
  deleteBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#d33',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#d33', fontWeight: '700' },
});

const statStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.1)',
    alignItems: 'center',
  },
  emoji: { fontSize: 20 },
  value: { fontSize: 26, fontWeight: '800', marginTop: 10 },
  label: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unit: { fontSize: 11, opacity: 0.7, marginTop: 3 },
});
