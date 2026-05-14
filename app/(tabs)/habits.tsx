import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HabitForm from '@/components/HabitForm';
import { Text, View } from '@/components/Themed';
import { useHabits } from '@/lib/HabitsContext';

export default function HabitsScreen() {
  const { habits, addHabit } = useHabits();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Math.max(insets.top + 8, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Habits</Text>
        <Text style={styles.sub}>Add a habit. Tap an existing one to edit or start a challenge.</Text>

        <HabitForm
          onSubmit={(values) => {
            addHabit(values);
          }}
        />

        <Text style={styles.sectionTitle}>Your habits ({habits.length})</Text>
        {habits.length === 0 ? (
          <Text style={styles.empty}>Nothing yet. Add your first habit above.</Text>
        ) : (
          habits.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => router.push(`/habit/${h.id}` as never)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowEmoji}>{h.emoji}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{h.name}</Text>
                <Text style={styles.rowMeta}>
                  {h.type === 'volume'
                    ? `Volume · target ${h.target}/day`
                    : 'Daily check-off'}{' '}
                  · {h.completions.length}{' '}
                  {h.completions.length === 1 ? 'check-in' : 'check-ins'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 14, opacity: 0.65, marginTop: 4, marginBottom: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  empty: { opacity: 0.6, fontStyle: 'italic', paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.10)',
  },
  pressed: { opacity: 0.7 },
  rowEmoji: { fontSize: 26, marginRight: 12 },
  rowText: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  chevron: { fontSize: 28, opacity: 0.4, paddingHorizontal: 4 },
});
