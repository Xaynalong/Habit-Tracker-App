import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import {
  todayKey,
  useHabits,
  volumeCountFor,
  type Habit,
} from '@/lib/HabitsContext';

type Props = {
  habit: Habit;
  onCompletion?: (event: import('@/lib/HabitsContext').CompletionEvent) => void;
  onLongPress?: () => void;
};

export default function HabitRow({ habit, onCompletion, onLongPress }: Props) {
  const { toggleToday, incrementVolume, isCompletedOn, streak } = useHabits();
  const key = todayKey();
  const done = isCompletedOn(habit, key);
  const s = streak(habit);
  const streakText = s > 0 ? `🔥 ${s}` : null;

  if (habit.type === 'volume') {
    const count = volumeCountFor(habit, key);
    const target = habit.target ?? 1;
    return (
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.row,
          done && styles.rowDone,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.emoji}>{habit.emoji}</Text>
        <Text style={[styles.habitName, done && styles.habitNameDone]} numberOfLines={1}>
          {habit.name}
        </Text>
        {streakText ? <Text style={styles.streakInline}>{streakText}</Text> : null}
        <View style={styles.spacer} />
        <View style={styles.volumeControls}>
          <Pressable
            onPress={() => incrementVolume(habit.id, -1)}
            hitSlop={6}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={styles.volumeText}>
            {count}/{target}
          </Text>
          <Pressable
            onPress={() => {
              const evt = incrementVolume(habit.id, 1);
              if (evt && onCompletion) onCompletion(evt);
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.stepBtnPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.stepBtnPrimaryText}>+</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        const evt = toggleToday(habit.id);
        if (evt && onCompletion) onCompletion(evt);
      }}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.emoji}>{habit.emoji}</Text>
      <Text style={[styles.habitName, done && styles.habitNameDone]} numberOfLines={1}>
        {habit.name}
      </Text>
      {streakText ? <Text style={styles.streakInline}>{streakText}</Text> : null}
      <View style={styles.spacer} />
      <View style={[styles.checkbox, done && styles.checkboxDone]}>
        {done ? <Text style={styles.check}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  rowDone: {
    backgroundColor: 'rgba(47,149,220,0.18)',
  },
  pressed: { opacity: 0.7 },
  emoji: { fontSize: 26, marginRight: 12 },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  habitNameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  streakInline: {
    fontSize: 13,
    opacity: 0.7,
    marginLeft: 8,
    fontWeight: '600',
  },
  spacer: { flex: 1 },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,149,220,0.08)',
  },
  checkboxDone: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  check: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(47,149,220,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f95dc',
  },
  stepBtnPrimary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPrimaryText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },
  volumeText: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#2f95dc',
  },
});
