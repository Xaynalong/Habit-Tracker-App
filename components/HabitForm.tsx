import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import ThemedInput from '@/components/ThemedInput';
import type { HabitType } from '@/lib/HabitsContext';

export type EmojiOption = { emoji: string; label: string };

export const EMOJI_OPTIONS: EmojiOption[] = [
  { emoji: '💪', label: 'Workout' },
  { emoji: '📚', label: 'Read' },
  { emoji: '🧘', label: 'Meditate' },
  { emoji: '💧', label: 'Hydrate' },
  { emoji: '🏃', label: 'Run' },
  { emoji: '🥗', label: 'Eat well' },
  { emoji: '😴', label: 'Sleep' },
  { emoji: '✍️', label: 'Journal' },
  { emoji: '🧹', label: 'Tidy up' },
  { emoji: '🎸', label: 'Practice' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🚿', label: 'Shower' },
  { emoji: '🧠', label: 'Learn' },
  { emoji: '🎨', label: 'Create' },
  { emoji: '🥦', label: 'Veggies' },
];

export function labelForEmoji(emoji: string): string {
  return EMOJI_OPTIONS.find((o) => o.emoji === emoji)?.label ?? '';
}

type Props = {
  onSubmit: (values: { name: string; emoji: string; type: HabitType; target?: number }) => void;
  submitLabel?: string;
  initial?: {
    name?: string;
    emoji?: string;
    type?: HabitType;
    target?: number;
  };
};

export default function HabitForm({ onSubmit, submitLabel = 'Add habit', initial }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJI_OPTIONS[0].emoji);
  const [nameTouched, setNameTouched] = useState(Boolean(initial?.name));
  const [type, setType] = useState<HabitType>(initial?.type ?? 'checkoff');
  const [target, setTarget] = useState(String(initial?.target ?? 3));

  const finalName = (name.trim() || labelForEmoji(emoji)).trim();
  const canSubmit = finalName.length > 0;

  const pickEmoji = (opt: EmojiOption) => {
    setEmoji(opt.emoji);
    if (!nameTouched) {
      setName(opt.label);
    }
  };

  const handle = () => {
    if (!canSubmit) return;
    const t = Math.max(1, Math.min(20, parseInt(target, 10) || 1));
    onSubmit({
      name: finalName,
      emoji,
      type,
      target: type === 'volume' ? t : undefined,
    });
    if (!initial) {
      setName('');
      setNameTouched(false);
      setType('checkoff');
      setTarget('3');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Pick an icon</Text>
      <Text style={styles.sublabel}>
        Tap one — we&apos;ll use its label as the name unless you change it.
      </Text>
      <View style={styles.grid}>
        {EMOJI_OPTIONS.map((opt) => {
          const selected = emoji === opt.emoji;
          return (
            <Pressable
              key={opt.emoji}
              onPress={() => pickEmoji(opt)}
              style={({ pressed }) => [
                styles.tile,
                selected && styles.tileSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.tileEmoji}>{opt.emoji}</Text>
              <Text
                style={[styles.tileLabel, selected && styles.tileLabelSelected]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Name</Text>
      <ThemedInput
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameTouched(true);
        }}
        placeholder={labelForEmoji(emoji) || 'Morning Run'}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={handle}
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        <Pressable
          onPress={() => setType('checkoff')}
          style={[styles.typeBtn, type === 'checkoff' && styles.typeBtnActive]}
        >
          <Text style={[styles.typeBtnText, type === 'checkoff' && styles.typeBtnTextActive]}>
            ✓ Daily check-off
          </Text>
          <Text style={[styles.typeBtnSub, type === 'checkoff' && styles.typeBtnSubActive]}>
            Once a day
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setType('volume')}
          style={[styles.typeBtn, type === 'volume' && styles.typeBtnActive]}
        >
          <Text style={[styles.typeBtnText, type === 'volume' && styles.typeBtnTextActive]}>
            № Volume
          </Text>
          <Text style={[styles.typeBtnSub, type === 'volume' && styles.typeBtnSubActive]}>
            Target N times/day
          </Text>
        </Pressable>
      </View>
      {type === 'volume' ? (
        <>
          <Text style={styles.label}>Daily target</Text>
          <View style={styles.targetRow}>
            <Pressable
              onPress={() => setTarget(String(Math.max(1, parseInt(target, 10) - 1 || 1)))}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <ThemedInput
              value={target}
              onChangeText={(t) => setTarget(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={styles.targetInput}
            />
            <Pressable
              onPress={() => setTarget(String(Math.min(20, (parseInt(target, 10) || 0) + 1)))}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
            <Text style={styles.targetLabel}>per day</Text>
          </View>
        </>
      ) : null}
      <Pressable
        onPress={handle}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.addBtn,
          !canSubmit && styles.addBtnDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.addBtnText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const TILE_WIDTH = '31%';

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 12,
    opacity: 0.55,
    marginBottom: 10,
    marginTop: -2,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: TILE_WIDTH,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.18)',
    alignItems: 'center',
  },
  tileSelected: {
    backgroundColor: '#2f95dc',
  },
  tileEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
  },
  tileLabelSelected: {
    color: '#fff',
    opacity: 1,
  },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  typeBtnActive: {
    backgroundColor: '#2f95dc',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  typeBtnSub: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  typeBtnSubActive: {
    color: '#fff',
    opacity: 0.9,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(127,127,127,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '700',
  },
  targetInput: {
    width: 56,
    textAlign: 'center',
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  targetLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  addBtn: {
    marginTop: 18,
    backgroundColor: '#2f95dc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
